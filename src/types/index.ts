export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface MatchCallbackPayload {
  matchId: string;
  tournamentCode: string;
}
