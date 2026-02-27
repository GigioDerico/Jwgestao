export interface AudioVideoMeetingDate {
  date: string;
  weekday: 'Quinta' | 'Domingo';
}

export function getMeetingDatesForMonth(monthIndex: number, year: number): AudioVideoMeetingDate[] {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const dates: AudioVideoMeetingDate[] = [];

  for (let day = 1; day <= lastDay; day += 1) {
    const currentDate = new Date(year, monthIndex, day, 12);
    const weekday = currentDate.getDay();

    if (weekday !== 4 && weekday !== 0) {
      continue;
    }

    dates.push({
      date: [
        year,
        String(monthIndex + 1).padStart(2, '0'),
        String(day).padStart(2, '0'),
      ].join('-'),
      weekday: weekday === 4 ? 'Quinta' : 'Domingo',
    });
  }

  return dates;
}
