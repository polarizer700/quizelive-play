export type Player = {
  id: string;
  nickname: string;
  score: number;
  connected: boolean;
};

export type Question = {
  question_id: string;
  index: number;
  total: number;
  text: string;
  type: "single" | "multiple" | "text";
  time_limit_sec: number;
  points: number;
  category?: string;
  round?: number;
  round_total?: number;
  options?: { id: string; text: string }[];
  image_url?: string;
  deadline_unix_ms: number;
};

export type Reveal = {
  question_id: string;
  correct_option_ids?: string[];
  correct_texts?: string[];
};

export type AnswersProgress = {
  question_id: string;
  answered: number;
  total: number;
  answered_ids: string[];
  deadline_unix_ms: number;
};

export type Entry = {
  nickname: string;
  score: number;
  rank: number;
};

export type ServerMessage = {
  room_state?: { code: string; phase: string; players?: Player[] };
  player_joined?: { player: Player };
  player_session?: { player_token: string; player: Player };
  host_resume?: { token: string };
  question_started?: Question;
  answer_accepted?: { question_id: string };
  answers_progress?: AnswersProgress;
  question_revealed?: Reveal;
  leaderboard?: { entries?: Entry[] };
  game_finished?: { entries?: Entry[] };
  error?: { code: string; message: string };
};

export type View = {
  connected: boolean;
  code: string;
  phase: string;
  players: Player[];
  question: Question | null;
  reveal: Reveal | null;
  board: Entry[];
  accepted: boolean;
  answeredIds: string[];
  answeredCount: number;
  answeredTotal: number;
  selfId: string;
  error: string;
};

export const emptyView: View = {
  connected: false,
  code: "",
  phase: "",
  players: [],
  question: null,
  reveal: null,
  board: [],
  accepted: false,
  answeredIds: [],
  answeredCount: 0,
  answeredTotal: 0,
  selfId: "",
  error: "",
};

export function socketURL() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}
