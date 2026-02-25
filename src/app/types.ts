export type MeetingType = 'midweek' | 'weekend';

export interface Person {
  id: string;
  name: string;
  role?: 'elder' | 'servant' | 'publisher';
}

export interface Assignment {
  id: string;
  time?: string; // e.g., "19:35"
  type: 'treasures' | 'ministry' | 'living' | 'public_talk' | 'watchtower' | 'prayer' | 'chairman' | 'reader';
  title: string;
  duration?: string; // e.g., "10 min"
  assigneeIds: string[]; // IDs of people assigned
  assistantId?: string; // ID of assistant (for ministry parts)
  confirmed: boolean;
  notes?: string;
}

export interface Meeting {
  id: string;
  date: string; // ISO date string
  type: MeetingType;
  chairmanId: string;
  openingPrayerId?: string;
  closingPrayerId?: string;
  theme?: string; // mainly for weekend public talk
  parts: Assignment[];
}
