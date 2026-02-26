// Domain types for the congregation management app
// Canonical type definitions used across all components

export interface FieldServiceGroup {
  id: string;
  name: string;
  overseer: string;
}

export interface Member {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  spiritual_status: 'publicador' | 'publicador_batizado' | 'pioneiro_auxiliar' | 'pioneiro_regular' | 'estudante';
  roles: string[];
  gender: 'M' | 'F';
  groupId?: string;
  isFamilyHead?: boolean;
  familyHeadId?: string;
  avatar?: string;
  approvedAudioVideo?: boolean;
  approvedIndicadores?: boolean;
  approvedCarrinho?: boolean;
}

export interface MidweekMeeting {
  id: string;
  date: string;
  bible_reading: string;
  president: string;
  opening_prayer: string;
  closing_prayer: string;
  opening_song: number;
  middle_song: number;
  closing_song: number;
  treasures: {
    talk: { title: string; duration: number; speaker: string };
    spiritual_gems: { duration: number; speaker: string };
    bible_reading: { duration: number; student: string; room: string };
  };
  ministry: {
    parts: {
      number: number;
      title: string;
      duration: number;
      student: string;
      assistant?: string;
      room: string;
    }[];
  };
  christian_life: {
    parts: { number: number; title: string; duration: number; speaker: string }[];
    congregation_bible_study: {
      duration: number;
      conductor: string;
      reader: string;
    };
    closing_comments: { duration: number };
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
  image: string;
  stage: string;
  rovingMic1: string;
  rovingMic2: string;
  attendants: string[];
}

export interface FieldServiceAssignment {
  id: string;
  weekday: string;
  time: string;
  responsible: string;
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
  publisher2: string;
  week: number;
}
