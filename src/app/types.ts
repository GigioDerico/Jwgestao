// Domain types for the congregation management app
// Canonical type definitions used across all components

export interface FieldServiceGroup {
  id: string;
  name: string;
  overseer: string;
  overseer_id?: string;
  assistants?: { member_id: string; assistant?: { full_name: string } }[];
}

export interface Member {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  spiritual_status: 'publicador' | 'publicador_batizado' | 'pioneiro_auxiliar' | 'pioneiro_regular' | 'estudante' | 'servo_ministerial' | 'anciao';
  roles: string[];
  gender: 'M' | 'F';
  groupId?: string;
  isFamilyHead?: boolean;
  familyHeadId?: string;
  avatar?: string;
  approvedAudioVideo?: boolean;
  approvedIndicadores?: boolean;
  approvedCarrinho?: boolean;
  system_role?: 'coordenador' | 'secretario' | 'designador' | 'publicador';
}

export interface MidweekMeeting {
  id: string;
  date: string;
  bible_reading: string;
  president: string;
  opening_prayer: string;
  closing_prayer: string;
  opening_song: number;
  opening_song_time: string;
  opening_comments: {
    time: string;
    duration: number;
  };
  middle_song: number;
  middle_song_time: string;
  closing_song: number;
  closing_song_time: string;
  treasures: {
    talk: { title: string; duration: number; time: string; speaker: string };
    spiritual_gems: { duration: number; time: string; speaker: string };
    bible_reading: { duration: number; time: string; student: string; room: string };
  };
  ministry: {
    parts: {
      number: number;
      time: string;
      title: string;
      duration: number;
      student: string;
      assistant?: string;
      room: string;
    }[];
  };
  christian_life: {
    parts: { number: number; time: string; title: string; duration: number; speaker: string }[];
    congregation_bible_study: {
      time: string;
      duration: number;
      conductor: string;
      reader: string;
    };
    closing_comments: {
      time: string;
      duration: number;
    };
  };
}

export interface WeekendMeeting {
  id: string;
  date: string;
  president: string;
  public_talk: {
    theme: string;
    speaker: string;
    congregation: string;
  };
  watchtower_study: {
    conductor: string;
    reader: string;
  };
  closing_prayer: string;
}

export interface AudioVideoAssignment {
  id: string;
  date: string;
  weekday: string;
  sound: string;
  soundMemberId?: string | null;
  image: string;
  imageMemberId?: string | null;
  stage: string;
  stageMemberId?: string | null;
  rovingMic1: string;
  rovingMic1MemberId?: string | null;
  rovingMic2: string;
  rovingMic2MemberId?: string | null;
  attendants: string[];
  attendantsMemberIds?: string[];
}

export interface FieldServiceAssignment {
  id: string;
  weekday: string;
  time: string;
  responsible: string;
  responsibleMemberId?: string | null;
  location: string;
  category: string;
}

export interface CartAssignment {
  id: string;
  day: number;
  weekday: string;
  time: string;
  location: string;
  publisher1: string;
  publisher1MemberId?: string | null;
  publisher2: string;
  publisher2MemberId?: string | null;
  week: number;
}

export interface AssignmentNotification {
  id: string;
  memberId: string;
  category: 'midweek' | 'weekend' | 'audio_video' | 'field_service' | 'cart';
  sourceType: string;
  sourceId: string;
  slotKey: string;
  title: string;
  message: string;
  assignmentDate?: string | null;
  status: 'pending_confirmation' | 'confirmed' | 'revoked';
  isRead: boolean;
  createdAt: string;
  confirmedAt?: string | null;
}
