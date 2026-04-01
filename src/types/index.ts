export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface MatchCallbackPayload {
  matchId: string;
  tournamentCode: string;
}

export interface RiotMatchParticipant {
  puuid: string;
  teamId: number; // 100=BLUE, 200=RED
  championId: number;
  teamPosition: string;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  goldEarned: number;
  visionScore: number;
  win: boolean;
  pentaKills: number;
}

export interface RiotMatchInfo {
  gameId: number;
  gameType: string;
  gameDuration: number;
  gameCreation: number;
  teams: { teamId: number; win: boolean }[];
  participants: RiotMatchParticipant[];
}

export interface RiotMatch {
  metadata: { matchId: string };
  info: RiotMatchInfo;
}
