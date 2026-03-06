import { supabase } from './supabase';
import {
  pauseTrackingForUser,
  requestBackgroundLocationPermissionStep,
  requestForegroundLocationPermission,
  startTracking,
  subscribeToTrackingPoints,
  type TrackingLivePoint,
} from './location-tracking';

const PRESENCE_TABLE = 'field_service_presence';
const STALE_WINDOW_MINUTES = 30;

export interface FieldServiceActor {
  user_id: string;
  member_id?: string | null;
  display_name: string;
  avatar_url?: string | null;
  group_id?: string | null;
}

export interface FieldServicePresence {
  user_id: string;
  member_id: string | null;
  display_name: string;
  avatar_url: string | null;
  group_id: string | null;
  is_active: boolean;
  started_at: string | null;
  last_lat: number | null;
  last_lng: number | null;
  last_accuracy_m: number | null;
  source: string;
  last_seen_at: string | null;
  updated_at: string;
}

let activePublisherUserId: string | null = null;
let unsubscribePointPublisher: (() => void) | null = null;

function staleCutoffIso(): string {
  return new Date(Date.now() - STALE_WINDOW_MINUTES * 60 * 1000).toISOString();
}

async function upsertPresence(
  actor: FieldServiceActor,
  patch: Partial<FieldServicePresence>,
): Promise<void> {
  const payload = {
    user_id: actor.user_id,
    member_id: actor.member_id ?? null,
    display_name: actor.display_name,
    avatar_url: actor.avatar_url ?? null,
    group_id: actor.group_id ?? null,
    is_active: true,
    source: 'field_service_live',
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from(PRESENCE_TABLE)
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    throw new Error(`Falha ao atualizar presença em campo: ${error.message}`);
  }
}

function attachPointPublisher(actor: FieldServiceActor) {
  if (unsubscribePointPublisher) {
    unsubscribePointPublisher();
    unsubscribePointPublisher = null;
  }

  activePublisherUserId = actor.user_id;
  unsubscribePointPublisher = subscribeToTrackingPoints((point: TrackingLivePoint) => {
    if (point.user_id !== actor.user_id) {
      return;
    }
    void upsertPresence(actor, {
      is_active: true,
      last_lat: point.lat,
      last_lng: point.lng,
      last_accuracy_m: point.accuracy_m ?? null,
      last_seen_at: point.captured_at,
      source: point.source ?? 'field_service_live',
    });
  });
}

function detachPointPublisher() {
  if (unsubscribePointPublisher) {
    unsubscribePointPublisher();
    unsubscribePointPublisher = null;
  }
  activePublisherUserId = null;
}

export async function listActiveFieldServicePresence(): Promise<FieldServicePresence[]> {
  const { data, error } = await supabase
    .from(PRESENCE_TABLE)
    .select('*')
    .eq('is_active', true)
    .gte('last_seen_at', staleCutoffIso())
    .order('last_seen_at', { ascending: false });

  if (error) {
    throw new Error(`Falha ao buscar presença em campo: ${error.message}`);
  }

  return (data ?? []) as FieldServicePresence[];
}

export async function getMyFieldServicePresence(userId: string): Promise<FieldServicePresence | null> {
  const { data, error } = await supabase
    .from(PRESENCE_TABLE)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar seu status de campo: ${error.message}`);
  }

  return (data as FieldServicePresence | null) ?? null;
}

export async function startFieldService(actor: FieldServiceActor): Promise<void> {
  const foregroundPermission = await requestForegroundLocationPermission();
  if (foregroundPermission !== 'granted') {
    throw new Error('Permissão de localização necessária para iniciar o serviço.');
  }

  // Best effort para elevar a permissão para uso em segundo plano no Android.
  await requestBackgroundLocationPermissionStep();

  const trackingStatus = await startTracking(actor.user_id);
  if (trackingStatus !== 'active') {
    if (trackingStatus === 'feature_disabled') {
      throw new Error('Rastreamento desativado pela feature flag.');
    }
    if (trackingStatus === 'permission_denied') {
      throw new Error('Permissão de localização insuficiente para rastreamento.');
    }
    throw new Error('Não foi possível iniciar o rastreamento de localização.');
  }

  attachPointPublisher(actor);

  await upsertPresence(actor, {
    is_active: true,
    started_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    source: 'field_service_live',
  });
}

export async function stopFieldService(actor: FieldServiceActor): Promise<void> {
  detachPointPublisher();

  await pauseTrackingForUser(actor.user_id);

  const { error } = await supabase
    .from(PRESENCE_TABLE)
    .update({
      is_active: false,
      source: 'field_service_live',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', actor.user_id);

  if (error) {
    throw new Error(`Falha ao encerrar serviço em campo: ${error.message}`);
  }
}

export async function initializeFieldServiceForUser(actor: FieldServiceActor): Promise<boolean> {
  const myPresence = await getMyFieldServicePresence(actor.user_id);
  const isActive = Boolean(myPresence?.is_active);

  if (!isActive) {
    if (activePublisherUserId === actor.user_id) {
      detachPointPublisher();
    }
    return false;
  }

  const trackingStatus = await startTracking(actor.user_id);
  if (trackingStatus === 'active') {
    attachPointPublisher(actor);
  }

  return trackingStatus === 'active';
}

export function subscribeToFieldServicePresence(
  onChange: (rows: FieldServicePresence[]) => void,
): () => void {
  let cancelled = false;

  const reload = async () => {
    try {
      const rows = await listActiveFieldServicePresence();
      if (!cancelled) {
        onChange(rows);
      }
    } catch (error) {
      console.warn('[field-service-live] Falha ao recarregar presença:', error);
      if (!cancelled) {
        onChange([]);
      }
    }
  };

  void reload();

  const channel = supabase
    .channel(`field-service-presence:${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: PRESENCE_TABLE },
      () => {
        void reload();
      },
    )
    .subscribe();

  return () => {
    cancelled = true;
    void supabase.removeChannel(channel);
  };
}
