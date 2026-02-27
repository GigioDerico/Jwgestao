export const MIDWEEK_PRIMARY_ROOM = 'Salão principal';
export const DEFAULT_CONGREGATION_NAME = 'Vicente Nunes';

type DurationValue = number | string | null | undefined;

type TimedPartInput = {
  duration?: DurationValue;
  scheduled_time?: string | null;
  time?: string | null;
};

type MidweekScheduleInput = {
  openingSongTime?: string | null;
  openingCommentsTime?: string | null;
  treasureTalkTime?: string | null;
  treasureGemsTime?: string | null;
  treasureReadingTime?: string | null;
  middleSongTime?: string | null;
  cbsTime?: string | null;
  closingCommentsTime?: string | null;
  closingSongTime?: string | null;
  ministryParts?: TimedPartInput[];
  christianLifeParts?: TimedPartInput[];
  cbsDuration?: DurationValue;
  closingCommentsDuration?: DurationValue;
};

export function normalizeStoredTime(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 5);
}

export function isValidTimeValue(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours * 60) + minutes;
}

export function addMinutesToTime(time: string, minutesToAdd: number) {
  const baseMinutes = timeToMinutes(time);
  const wrapped = ((baseMinutes + minutesToAdd) % (24 * 60) + (24 * 60)) % (24 * 60);
  const hours = String(Math.floor(wrapped / 60)).padStart(2, '0');
  const minutes = String(wrapped % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function parseDurationMinutes(value: DurationValue, fallback = 0) {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(parsed) || parsed === null || parsed === undefined) {
    return fallback;
  }
  return Math.max(0, Number(parsed));
}

export function buildMidweekScheduleTimes(input: MidweekScheduleInput) {
  const ministryParts = input.ministryParts || [];
  const christianLifeParts = input.christianLifeParts || [];

  const openingSongTime = normalizeStoredTime(input.openingSongTime) || '19:30';
  const openingCommentsTime = normalizeStoredTime(input.openingCommentsTime) || '19:34';
  const treasureTalkTime = normalizeStoredTime(input.treasureTalkTime) || '19:35';
  const treasureGemsTime = normalizeStoredTime(input.treasureGemsTime) || '19:45';
  const treasureReadingTime = normalizeStoredTime(input.treasureReadingTime) || '19:55';

  const ministryTimes: string[] = [];
  let nextMinistryTime = '20:00';
  for (const part of ministryParts) {
    const effectiveTime = normalizeStoredTime(part.scheduled_time || part.time) || nextMinistryTime;
    ministryTimes.push(effectiveTime);
    nextMinistryTime = addMinutesToTime(effectiveTime, parseDurationMinutes(part.duration) + 1);
  }

  const middleSongTime =
    normalizeStoredTime(input.middleSongTime) ||
    (ministryParts.length > 0 ? addMinutesToTime(nextMinistryTime, 1) : '20:00');

  const christianLifeTimes: string[] = [];
  let nextChristianLifeTime = addMinutesToTime(middleSongTime, 4);
  for (const part of christianLifeParts) {
    const effectiveTime = normalizeStoredTime(part.scheduled_time || part.time) || nextChristianLifeTime;
    christianLifeTimes.push(effectiveTime);
    nextChristianLifeTime = addMinutesToTime(effectiveTime, parseDurationMinutes(part.duration));
  }

  const cbsTime = normalizeStoredTime(input.cbsTime) || nextChristianLifeTime;
  const cbsDuration = parseDurationMinutes(input.cbsDuration, 30);
  const closingCommentsTime =
    normalizeStoredTime(input.closingCommentsTime) ||
    addMinutesToTime(cbsTime, cbsDuration);
  const closingCommentsDuration = parseDurationMinutes(input.closingCommentsDuration, 3);
  const closingSongTime =
    normalizeStoredTime(input.closingSongTime) ||
    addMinutesToTime(closingCommentsTime, closingCommentsDuration + 2);

  return {
    openingSongTime,
    openingCommentsTime,
    treasureTalkTime,
    treasureGemsTime,
    treasureReadingTime,
    ministryTimes,
    middleSongTime,
    christianLifeTimes,
    cbsTime,
    closingCommentsTime,
    closingSongTime,
  };
}
