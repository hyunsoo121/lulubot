/** 'YYYY-MM-DD' 형식 문자열을 Date로 파싱. null=미입력, undefined=형식 오류 */
export function parseDateInput(input: string | null): Date | null | undefined {
  if (!input) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (!m) return undefined;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

/** 종료일을 '해당 날짜 끝(23:59:59.999)'까지 포함하도록 보정 */
export function toEndOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}
