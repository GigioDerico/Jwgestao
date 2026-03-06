import Dexie, { type EntityTable } from 'dexie';
import { Capacitor } from '@capacitor/core';
import { Geolocation, type PermissionState, type Position } from '@capacitor/geolocation';
import { api } from './api';
import { supabase } from './supabase';

const LOCATION_TRACKING_ENABLED_KEY = 'location_tracking_enabled';
const LOCATION_TRACKING_INTERVAL_SEC_KEY = 'location_tracking_interval_sec';
const LOCATION_TRACKING_DISTANCE_M_KEY = 'location_tracking_distance_m';
const LOCATION_TRACKING_RETENTION_DAYS_KEY = 'location_tracking_retention_days';
const LOCATION_TRACKING_INTERNAL_USER_IDS_KEY = 'location_tracking_internal_user_ids';
const TRACKING_PREFERENCE_PREFIX = 'jwgestao-location-tracking-enabled';

const DEFAULT_INTERVAL_SEC = 300;
const DEFAULT_DISTANCE_M = 100;
const DEFAULT_RETENTION_DAYS = 60;
const FLUSH_BATCH_SIZE = 50;

export interface LocationPoint {
  captured_at: string;
  lat: number;
  lng: number;
  accuracy_m?: number | null;
  speed_mps?: number | null;
  heading_deg?: number | null;
  source?: string;
  battery_level?: number | null;
  is_mock?: boolean;
}

export interface TrackingLivePoint extends LocationPoint {
  user_id: string;
}

export type LocationTrackingStatus =
  | 'inactive'
  | 'starting'
  | 'active'
  | 'paused'
  | 'permission_denied'
  | 'feature_disabled'
  | 'unsupported'
  | 'error';

export interface LocationTrackingConfig {
  enabled: boolean;
  intervalSec: number;
  distanceM: number;
  retentionDays: number;
  internalUserIds: string[];
}

export interface LocationTrackingSnapshot {
  status: LocationTrackingStatus;
  permissionStatus: PermissionState | 'unknown';
  queueSize: number;
  lastPointAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  config: LocationTrackingConfig;
  activeUserId: string | null;
  isPreferredByUser: boolean;
}

interface PendingLocationPoint extends LocationPoint {
  id?: number;
  user_id: string;
  retry_count: number;
  next_retry_at: string;
  created_at: string;
}

class LocationTrackingDatabase extends Dexie {
  pending_location_points!: EntityTable<PendingLocationPoint, 'id'>;

  constructor() {
    super('JWGestaoLocationTracking');
    this.version(1).stores({
      pending_location_points: '++id, user_id, captured_at, next_retry_at, retry_count',
    });
  }
}

const trackingDb = new LocationTrackingDatabase();

let activeWatchId: string | null = null;
let activeUserId: string | null = null;
let flushTimerId: number | null = null;
let isOnlineListenerAttached = false;
let lastAcceptedPoint: { lat: number; lng: number; capturedAtMs: number } | null = null;

let trackingConfig: LocationTrackingConfig = {
  enabled: false,
  intervalSec: DEFAULT_INTERVAL_SEC,
  distanceM: DEFAULT_DISTANCE_M,
  retentionDays: DEFAULT_RETENTION_DAYS,
  internalUserIds: [],
};

let snapshot: LocationTrackingSnapshot = {
  status: 'inactive',
  permissionStatus: 'unknown',
  queueSize: 0,
  lastPointAt: null,
  lastSyncAt: null,
  lastError: null,
  config: trackingConfig,
  activeUserId: null,
  isPreferredByUser: false,
};

const listeners = new Set<(state: LocationTrackingSnapshot) => void>();
const livePointListeners = new Set<(point: TrackingLivePoint) => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener({ ...snapshot }));
}

function setSnapshot(patch: Partial<LocationTrackingSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  notifyListeners();
}

function notifyLivePoint(point: TrackingLivePoint) {
  livePointListeners.forEach((listener) => listener(point));
}

function getPreferenceKey(userId: string) {
  return `${TRACKING_PREFERENCE_PREFIX}:${userId}`;
}

function parseBooleanSetting(value: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

function parseNumberSetting(value: string | null, fallback: number, min: number, max: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseInternalUserIds(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isUserAllowedByFlag(userId: string, config: LocationTrackingConfig): boolean {
  if (!config.enabled) return false;
  if (config.internalUserIds.length === 0) return true;
  return config.internalUserIds.includes(userId);
}

function trackingEvent(event: string, details?: Record<string, unknown>) {
  if (details) {
    console.info(`[location-tracking] ${event}`, details);
  } else {
    console.info(`[location-tracking] ${event}`);
  }
}

function distanceInMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const earthRadius = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const calc = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const arc = 2 * Math.atan2(Math.sqrt(calc), Math.sqrt(1 - calc));
  return earthRadius * arc;
}

async function getBatteryLevel(): Promise<number | null> {
  const navigatorWithBattery = navigator as Navigator & {
    getBattery?: () => Promise<{ level: number }>;
  };

  if (typeof navigatorWithBattery.getBattery !== 'function') {
    return null;
  }

  try {
    const battery = await navigatorWithBattery.getBattery();
    if (!battery || typeof battery.level !== 'number') return null;
    return Number(battery.level.toFixed(3));
  } catch {
    return null;
  }
}

async function getQueueSize(userId: string): Promise<number> {
  const points = await trackingDb.pending_location_points.where('user_id').equals(userId).count();
  return points;
}

function attachOnlineListener() {
  if (isOnlineListenerAttached) return;
  window.addEventListener('online', handleOnlineEvent);
  isOnlineListenerAttached = true;
}

function detachOnlineListener() {
  if (!isOnlineListenerAttached) return;
  window.removeEventListener('online', handleOnlineEvent);
  isOnlineListenerAttached = false;
}

async function handleOnlineEvent() {
  await flushPoints();
}

function startFlushTimer() {
  stopFlushTimer();
  const intervalMs = Math.min(60000, Math.max(15000, trackingConfig.intervalSec * 1000));
  flushTimerId = window.setInterval(() => {
    void flushPoints();
  }, intervalMs);
}

function stopFlushTimer() {
  if (flushTimerId !== null) {
    window.clearInterval(flushTimerId);
    flushTimerId = null;
  }
}

function normalizePreferenceValue(raw: string | null): boolean {
  return raw === '1' || raw === 'true';
}

async function updatePermissionStatus(): Promise<PermissionState | 'unknown'> {
  try {
    const permission = await Geolocation.checkPermissions();
    const next = permission.location;
    setSnapshot({ permissionStatus: next });
    return next;
  } catch {
    setSnapshot({ permissionStatus: 'unknown' });
    return 'unknown';
  }
}

async function loadTrackingConfig(): Promise<LocationTrackingConfig> {
  const [enabledRaw, intervalRaw, distanceRaw, retentionRaw, internalUsersRaw] = await Promise.all([
    api.getAppSetting(LOCATION_TRACKING_ENABLED_KEY),
    api.getAppSetting(LOCATION_TRACKING_INTERVAL_SEC_KEY),
    api.getAppSetting(LOCATION_TRACKING_DISTANCE_M_KEY),
    api.getAppSetting(LOCATION_TRACKING_RETENTION_DAYS_KEY),
    api.getAppSetting(LOCATION_TRACKING_INTERNAL_USER_IDS_KEY),
  ]);

  trackingConfig = {
    enabled: parseBooleanSetting(enabledRaw),
    intervalSec: parseNumberSetting(intervalRaw, DEFAULT_INTERVAL_SEC, 30, 3600),
    distanceM: parseNumberSetting(distanceRaw, DEFAULT_DISTANCE_M, 10, 10000),
    retentionDays: parseNumberSetting(retentionRaw, DEFAULT_RETENTION_DAYS, 1, 365),
    internalUserIds: parseInternalUserIds(internalUsersRaw),
  };

  setSnapshot({ config: trackingConfig });
  return trackingConfig;
}

async function recordPoint(userId: string, point: LocationPoint): Promise<void> {
  await trackingDb.pending_location_points.add({
    ...point,
    user_id: userId,
    retry_count: 0,
    next_retry_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });
}

async function markRetry(points: PendingLocationPoint[]) {
  const now = Date.now();

  await trackingDb.pending_location_points.bulkPut(
    points.map((item) => {
      const retryCount = item.retry_count + 1;
      const retryDelayMs = Math.min(15 * 60 * 1000, Math.pow(2, retryCount) * 1000);
      return {
        ...item,
        retry_count: retryCount,
        next_retry_at: new Date(now + retryDelayMs).toISOString(),
      };
    }),
  );
}

function shouldPersistPoint(position: Position, config: LocationTrackingConfig): boolean {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const capturedAtMs = position.timestamp ?? Date.now();

  if (!lastAcceptedPoint) {
    return true;
  }

  const distance = distanceInMeters(lastAcceptedPoint.lat, lastAcceptedPoint.lng, lat, lng);
  const elapsedMs = capturedAtMs - lastAcceptedPoint.capturedAtMs;

  return distance >= config.distanceM || elapsedMs >= config.intervalSec * 1000;
}

function syncLastAccepted(position: Position) {
  lastAcceptedPoint = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    capturedAtMs: position.timestamp ?? Date.now(),
  };
}

async function handleIncomingPosition(userId: string, position: Position) {
  if (!shouldPersistPoint(position, trackingConfig)) {
    return;
  }

  const point: LocationPoint = {
    captured_at: new Date(position.timestamp ?? Date.now()).toISOString(),
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy_m: typeof position.coords.accuracy === 'number' ? position.coords.accuracy : null,
    speed_mps: typeof position.coords.speed === 'number' ? position.coords.speed : null,
    heading_deg: typeof position.coords.heading === 'number' ? position.coords.heading : null,
    source: 'background_watch',
    battery_level: await getBatteryLevel(),
    is_mock: false,
  };

  await recordPoint(userId, point);
  syncLastAccepted(position);

  const queueSize = await getQueueSize(userId);
  setSnapshot({
    queueSize,
    lastPointAt: point.captured_at,
    lastError: null,
  });

  if (queueSize >= FLUSH_BATCH_SIZE) {
    await flushPoints({ userId });
  }
}

function emitLivePoint(userId: string, position: Position) {
  notifyLivePoint({
    user_id: userId,
    captured_at: new Date(position.timestamp ?? Date.now()).toISOString(),
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy_m: typeof position.coords.accuracy === 'number' ? position.coords.accuracy : null,
    speed_mps: typeof position.coords.speed === 'number' ? position.coords.speed : null,
    heading_deg: typeof position.coords.heading === 'number' ? position.coords.heading : null,
    source: 'background_watch',
    battery_level: null,
    is_mock: false,
  });
}

export async function refreshLocationTrackingConfig(): Promise<LocationTrackingConfig> {
  try {
    return await loadTrackingConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao carregar configuração de localização.';
    setSnapshot({ lastError: message });
    trackingEvent('config_error', { message });
    return trackingConfig;
  }
}

export function subscribeToLocationTracking(listener: (state: LocationTrackingSnapshot) => void): () => void {
  listeners.add(listener);
  listener({ ...snapshot });

  return () => {
    listeners.delete(listener);
  };
}

export function subscribeToTrackingPoints(listener: (point: TrackingLivePoint) => void): () => void {
  livePointListeners.add(listener);
  return () => {
    livePointListeners.delete(listener);
  };
}

export function getLocationTrackingSnapshot(): LocationTrackingSnapshot {
  return { ...snapshot };
}

export function getTrackingConsentText(): string {
  return 'A coleta contínua usa localização para registrar atividade ministerial, com retenção limitada e opção de pausar a qualquer momento.';
}

export async function requestForegroundLocationPermission(): Promise<PermissionState | 'unknown'> {
  try {
    const result = await Geolocation.requestPermissions();
    setSnapshot({ permissionStatus: result.location });
    trackingEvent(result.location === 'granted' ? 'permission_granted' : 'permission_denied', {
      stage: 'foreground',
      status: result.location,
    });
    return result.location;
  } catch (error) {
    trackingEvent('permission_denied', {
      stage: 'foreground',
      reason: error instanceof Error ? error.message : 'unknown',
    });
    setSnapshot({ permissionStatus: 'unknown' });
    return 'unknown';
  }
}

export async function requestBackgroundLocationPermissionStep(): Promise<boolean> {
  try {
    const result = await Geolocation.requestPermissions();
    const granted = result.location === 'granted';
    trackingEvent(granted ? 'permission_granted' : 'permission_denied', {
      stage: 'background_step',
      status: result.location,
    });
    setSnapshot({ permissionStatus: result.location });
    return granted;
  } catch (error) {
    trackingEvent('permission_denied', {
      stage: 'background_step',
      reason: error instanceof Error ? error.message : 'unknown',
    });
    setSnapshot({ permissionStatus: 'unknown' });
    return false;
  }
}

export function isLocationTrackingPreferred(userId: string): boolean {
  return normalizePreferenceValue(globalThis.localStorage.getItem(getPreferenceKey(userId)));
}

export function setLocationTrackingPreference(userId: string, enabled: boolean): void {
  globalThis.localStorage.setItem(getPreferenceKey(userId), enabled ? '1' : '0');
  if (activeUserId === userId) {
    setSnapshot({ isPreferredByUser: enabled });
  }
}

export async function enqueuePoint(userId: string, point: LocationPoint): Promise<void> {
  await recordPoint(userId, point);
  const queueSize = await getQueueSize(userId);
  setSnapshot({ queueSize });
}

export async function flushPoints(options?: { userId?: string; batchSize?: number }): Promise<number> {
  const userId = options?.userId ?? activeUserId;
  if (!userId) return 0;
  if (!navigator.onLine) return 0;

  const batchSize = options?.batchSize ?? FLUSH_BATCH_SIZE;

  const allPoints = await trackingDb.pending_location_points
    .where('user_id')
    .equals(userId)
    .sortBy('next_retry_at');

  const nowIso = new Date().toISOString();
  const duePoints = allPoints
    .filter((item) => item.next_retry_at <= nowIso)
    .slice(0, batchSize);

  if (duePoints.length === 0) {
    const queueSize = await getQueueSize(userId);
    setSnapshot({ queueSize });
    return 0;
  }

  const payload = duePoints.map((item) => ({
    captured_at: item.captured_at,
    lat: item.lat,
    lng: item.lng,
    accuracy_m: item.accuracy_m ?? null,
    speed_mps: item.speed_mps ?? null,
    heading_deg: item.heading_deg ?? null,
    source: item.source ?? 'background_watch',
    battery_level: item.battery_level ?? null,
    is_mock: Boolean(item.is_mock),
  }));

  const { error } = await supabase.rpc('insert_background_location_points', {
    p_points: payload,
  });

  if (error) {
    await markRetry(duePoints);
    const queueSize = await getQueueSize(userId);
    const message = `Falha ao sincronizar localização: ${error.message}`;
    setSnapshot({
      queueSize,
      lastError: message,
    });
    trackingEvent('flush_error', { message, queued: queueSize });
    return 0;
  }

  const idsToDelete = duePoints
    .map((item) => item.id)
    .filter((id): id is number => typeof id === 'number');

  if (idsToDelete.length > 0) {
    await trackingDb.pending_location_points.bulkDelete(idsToDelete);
  }

  const queueSize = await getQueueSize(userId);
  const syncedAt = new Date().toISOString();
  setSnapshot({
    queueSize,
    lastSyncAt: syncedAt,
    lastError: null,
  });
  trackingEvent('flush_success', { sent: duePoints.length, queue: queueSize });

  return duePoints.length;
}

export async function startTracking(userId: string): Promise<LocationTrackingStatus> {
  activeUserId = userId;
  setSnapshot({
    status: 'starting',
    activeUserId: userId,
    isPreferredByUser: isLocationTrackingPreferred(userId),
  });

  if (!Capacitor.isNativePlatform() && !navigator.geolocation) {
    setSnapshot({
      status: 'unsupported',
      lastError: 'Dispositivo sem suporte de geolocalização.',
    });
    return 'unsupported';
  }

  await loadTrackingConfig();
  const queueSize = await getQueueSize(userId);
  setSnapshot({ queueSize });

  if (!isUserAllowedByFlag(userId, trackingConfig)) {
    setSnapshot({
      status: 'feature_disabled',
      lastError: null,
    });
    return 'feature_disabled';
  }

  const permission = await updatePermissionStatus();
  if (permission !== 'granted') {
    setSnapshot({
      status: 'permission_denied',
      lastError: 'Permissão de localização não concedida.',
    });
    return 'permission_denied';
  }

  if (activeWatchId) {
    setSnapshot({
      status: 'active',
      lastError: null,
    });
    return 'active';
  }

  setLocationTrackingPreference(userId, true);

  try {
    const initialPosition = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: trackingConfig.intervalSec * 1000,
      maximumAge: 0,
    });
    emitLivePoint(userId, initialPosition);
    await handleIncomingPosition(userId, initialPosition);
  } catch (error) {
    trackingEvent('initial_point_error', {
      message: error instanceof Error ? error.message : 'unknown',
    });
  }

  try {
    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: trackingConfig.intervalSec * 1000,
        maximumAge: 0,
      },
      (position, error) => {
        if (error) {
          const message = `Erro no watch de localização: ${error.message}`;
          setSnapshot({ lastError: message });
          trackingEvent('watch_error', { message });
          return;
        }

        if (!position || !activeUserId) {
          return;
        }

        emitLivePoint(activeUserId, position);
        void handleIncomingPosition(activeUserId, position);
      },
    );

    activeWatchId = watchId;
    startFlushTimer();
    attachOnlineListener();
    await flushPoints({ userId });
    setSnapshot({
      status: 'active',
      lastError: null,
    });
    trackingEvent('tracking_started', { userId });
    return 'active';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível iniciar rastreamento.';
    setSnapshot({
      status: 'error',
      lastError: message,
    });
    trackingEvent('tracking_error', { message });
    return 'error';
  }
}

export async function stopTracking(options?: { keepPreference?: boolean }): Promise<void> {
  if (activeWatchId) {
    try {
      await Geolocation.clearWatch({ id: activeWatchId });
    } catch {
      // Ignore clear watch errors.
    }
    activeWatchId = null;
  }

  stopFlushTimer();
  detachOnlineListener();

  if (activeUserId && !options?.keepPreference) {
    setLocationTrackingPreference(activeUserId, false);
  }

  lastAcceptedPoint = null;
  setSnapshot({
    status: 'paused',
    lastError: null,
  });
  trackingEvent('tracking_paused', { userId: activeUserId });
}

export async function initializeLocationTrackingForUser(userId: string): Promise<LocationTrackingStatus> {
  activeUserId = userId;
  const preferred = isLocationTrackingPreferred(userId);
  setSnapshot({
    activeUserId: userId,
    isPreferredByUser: preferred,
  });

  await loadTrackingConfig();
  await updatePermissionStatus();
  const queueSize = await getQueueSize(userId);
  setSnapshot({ queueSize });

  if (!isUserAllowedByFlag(userId, trackingConfig)) {
    setSnapshot({
      status: 'feature_disabled',
      lastError: null,
    });
    return 'feature_disabled';
  }

  if (!preferred) {
    setSnapshot({
      status: 'paused',
      lastError: null,
    });
    return 'paused';
  }

  return startTracking(userId);
}

export async function pauseTrackingForUser(userId: string): Promise<void> {
  setLocationTrackingPreference(userId, false);
  if (activeUserId === userId) {
    await stopTracking({ keepPreference: true });
  }
}
