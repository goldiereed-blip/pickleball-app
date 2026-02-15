export interface Game {
  id: string;
  code: string;
  name: string;
  num_courts: number;
  mode: 'rotating' | 'fixed';
  schedule_generated: number;
  started: number;
  num_rounds: number | null;
  scheduled_at: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  game_id: string;
  name: string;
  is_playing: number;
  order_num: number;
  claimed_by: string | null;
  created_at: string;
}

export interface Round {
  id: string;
  game_id: string;
  round_number: number;
}

export interface Match {
  id: string;
  round_id: string;
  game_id: string;
  court_number: number;
  team1_player1_id: string;
  team1_player2_id: string;
  team2_player1_id: string;
  team2_player2_id: string;
  team1_score: number | null;
  team2_score: number | null;
  is_completed: number;
}

export interface MatchWithNames extends Match {
  team1_player1_name: string;
  team1_player2_name: string;
  team2_player1_name: string;
  team2_player2_name: string;
  round_number: number;
}

export interface RoundWithMatches {
  round_number: number;
  round_id: string;
  matches: MatchWithNames[];
  sitting: string[];
}

export interface Ranking {
  player_id: string;
  player_name: string;
  wins: number;
  losses: number;
  points_for: number;
  points_against: number;
  point_differential: number;
  games_played: number;
}

export interface ScheduleMatch {
  court: number;
  team1: [string, string];
  team2: [string, string];
}

export interface ScheduleRound {
  roundNumber: number;
  matches: ScheduleMatch[];
  sitting: string[];
}
