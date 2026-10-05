export type MinistryPartDraftForSave = {
  id?: string;
  time: string;
  title: string;
  duration: string;
  studentId: string;
  assistantId: string;
};

export type ChristianLifePartDraftForSave = {
  id?: string;
  time: string;
  title: string;
  duration: string;
  speakerId: string;
};

export function mapMinistryDraftsForSave(parts: MinistryPartDraftForSave[]) {
  return parts
    .map(part => ({
      id: part.id,
      time: part.time.trim(),
      title: part.title.trim(),
      duration: part.duration.trim(),
      studentId: part.studentId,
      assistantId: part.assistantId,
    }))
    .filter(part => part.title || part.duration || part.studentId || part.assistantId);
}

export function mapChristianLifeDraftsForSave(parts: ChristianLifePartDraftForSave[]) {
  return parts
    .map(part => ({
      id: part.id,
      time: part.time.trim(),
      title: part.title.trim(),
      duration: part.duration.trim(),
      speakerId: part.speakerId,
    }))
    .filter(part => part.title || part.duration || part.speakerId);
}
