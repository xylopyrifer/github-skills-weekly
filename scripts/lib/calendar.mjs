export const DAY = 86400000;
export const BOUNDARY_TOLERANCE = 6 * 3600000;
export function monday(date) {
  const d = new Date(date);
  d.setUTCHours(0,0,0,0);
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d;
}
export const dateKey = date => new Date(date).toISOString().slice(0,10);
export function previousWeek(date) {
  const end = monday(date);
  return { start: dateKey(new Date(+end - 7 * DAY)), end: dateKey(end) };
}
export function isBoundaryWindow(date) {
  return +new Date(date) - +monday(date) <= BOUNDARY_TOLERANCE;
}
export function isoWeek(start) {
  const d = new Date(start + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 3 - (d.getUTCDay() + 6) % 7);
  const year = d.getUTCFullYear();
  const week = 1 + Math.round((+d - +new Date(Date.UTC(year,0,4)) + ((new Date(Date.UTC(year,0,4)).getUTCDay()+6)%7 - 3)*DAY) / (7*DAY));
  return `${year}-W${String(week).padStart(2,'0')}`;
}
