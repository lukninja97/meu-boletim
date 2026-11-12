export const absenceTone = (pct: number) =>
  pct >= 20 ? "bg-red-100 text-red-800"
  : pct >= 15 ? "bg-orange-100 text-orange-800"
  : pct >= 10 ? "bg-yellow-100 text-yellow-800"
  : "bg-green-100 text-green-800";

export const absencePercent = (missed: number, totalLessons: number | null, givenLessons: number) => {
  const base = totalLessons && totalLessons > 0 ? totalLessons : givenLessons;
  return base > 0 ? Math.round((missed / base) * 100) : 0;
};
