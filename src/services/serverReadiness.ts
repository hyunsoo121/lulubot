import { getServerAccountIds } from './titleService';
import { getRegisteredUserCount, SERVER_ONLY_MIN_PARTICIPANTS } from './matchFilter';

export { SERVER_ONLY_MIN_PARTICIPANTS };

export interface ServerOnlyReadiness {
  ready: boolean;
  registeredCount: number;
}

/** 서버기반(serverOnly) 커맨드를 쓸 수 있는 최소 등록 인원을 넘겼는지 확인 */
export async function getServerOnlyReadiness(guildServerId: bigint): Promise<ServerOnlyReadiness> {
  const accountIds = await getServerAccountIds(guildServerId);
  const registeredCount = await getRegisteredUserCount(accountIds);
  return { ready: registeredCount >= SERVER_ONLY_MIN_PARTICIPANTS, registeredCount };
}

export function serverOnlyNotReadyMessage(registeredCount: number): string {
  return `이 기능은 서버 등록 인원이 ${SERVER_ONLY_MIN_PARTICIPANTS}명 이상일 때부터 사용할 수 있어요. (현재 ${registeredCount}명 등록됨)`;
}
