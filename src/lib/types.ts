export type Participant = {
  id: string;
  x_handle: string;
  telegram_username: string | null;
  banned: boolean;
  created_at: string;
};

export type Quest = {
  id: number;
  title: string;
  description: string;
  channel: string;
  points: number;
  kind: "link" | "text" | "username";
  opens_at: string | null;
  closes_at: string | null;
  active: boolean;
  sort_order: number;
};
