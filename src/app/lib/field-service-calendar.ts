export interface FieldServiceSaturday {
  label: string;
}

export function getSaturdaysForMonth(monthIndex: number, year: number): FieldServiceSaturday[] {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const saturdays: FieldServiceSaturday[] = [];

  for (let day = 1; day <= lastDay; day += 1) {
    const currentDate = new Date(year, monthIndex, day, 12);

    if (currentDate.getDay() !== 6) {
      continue;
    }

    saturdays.push({
      label: `Sábado ${String(day).padStart(2, '0')}/${String(monthIndex + 1).padStart(2, '0')}`,
    });
  }

  return saturdays;
}
