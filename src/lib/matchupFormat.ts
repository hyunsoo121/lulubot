export interface MatchupSide {
  name: string;
  wins: number;
}

export interface MatchupResult {
  leftName: string;
  leftWins: number;
  rightName: string;
  rightWins: number;
  crown: string; // 우위가 있으면 '👑 ', 동률이면 ''
  winRatePct: string; // 왼쪽(승수 많은 쪽) 기준 승률, 소수 첫째 자리
}

/** 두 상대의 승수를 비교해 승수가 많은 쪽을 왼쪽에 두고, 우위가 있으면 왕관을 붙여 반환 */
export function resolveMatchup(a: MatchupSide, b: MatchupSide, totalGames: number): MatchupResult {
  const [left, right] = a.wins >= b.wins ? [a, b] : [b, a];
  const crown = left.wins > right.wins ? '👑 ' : '';
  const winRatePct = totalGames > 0 ? ((left.wins / totalGames) * 100).toFixed(1) : '0.0';
  return {
    leftName: left.name,
    leftWins: left.wins,
    rightName: right.name,
    rightWins: right.wins,
    crown,
    winRatePct,
  };
}
