alter table public.members
  add column if not exists approved_sound boolean not null default false,
  add column if not exists approved_image boolean not null default false,
  add column if not exists approved_stage boolean not null default false,
  add column if not exists approved_roving_mic boolean not null default false;

update public.members
set approved_audio_video = (
  coalesce(approved_sound, false)
  or coalesce(approved_image, false)
  or coalesce(approved_stage, false)
  or coalesce(approved_roving_mic, false)
);
