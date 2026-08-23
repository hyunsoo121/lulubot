import { ChatInputCommandInteraction } from 'discord.js';
import { parseDateInput, toEndOfDay } from '../../../lib/dateUtil';
import { MatchFilterOptions } from '../../../services/matchFilter';

export type FilterOptionsResult =
  | { ok: true; opts: MatchFilterOptions }
  | { ok: false; error: string };

/** '서버기반'/'시작일'/'종료일' 옵션을 읽어 MatchFilterOptions로 변환. 형식 오류 시 에러 메시지 반환
 *  defaultServerOnly: '서버기반' 옵션을 안 넣었을 때 기본값 (기본은 false)
 */
export function readFilterOptions(
  interaction: ChatInputCommandInteraction,
  { defaultServerOnly = false }: { defaultServerOnly?: boolean } = {},
): FilterOptionsResult {
  const serverOnly = interaction.options.getBoolean('서버기반') ?? defaultServerOnly;
  const startRaw = interaction.options.getString('시작일');
  const endRaw = interaction.options.getString('종료일');

  const startDate = parseDateInput(startRaw);
  if (startDate === undefined) {
    return { ok: false, error: '❌ 시작일 형식이 올바르지 않습니다. 예) 2026-01-01' };
  }

  const endDateRaw = parseDateInput(endRaw);
  if (endDateRaw === undefined) {
    return { ok: false, error: '❌ 종료일 형식이 올바르지 않습니다. 예) 2026-06-30' };
  }

  return {
    ok: true,
    opts: {
      serverOnly,
      startDate: startDate ?? undefined,
      endDate: endDateRaw ? toEndOfDay(endDateRaw) : undefined,
    },
  };
}
