export const LESSON_MINUTES = 45;
export const lessonsFromHours = (hours: number) => Math.round((hours * 60) / LESSON_MINUTES);
