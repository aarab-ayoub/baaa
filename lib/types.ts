// what the api routes send; the server builds these and the page reads them

export type Campus = { id: number; name: string; country: string };

export type Student = {
  login: string;
  name: string;
  img: string | null; // 175px photo, for the 40px avatar
  photo: string | null; // 350px photo, for the zoom on hover
  level: number;
  promo: string;
  bh: string | null; // the day the cursus closed, if it did
};

export type Coalition = { id: number; name: string; color: string; score: number };

export type RankedStudent = Student & { coal: number | null };

export type Ranking = { fetchedAt: string; coalitions: Coalition[]; students: RankedStudent[] };

export type MoveStatus = 'moving' | 'arrived';

export type Move = Student & { from: number; to: number; status: MoveStatus; at: string };

export type Transfers = { fetchedAt: string; students: Move[] };

export type Project = { id: number; name: string; xp: number };

export type Me = {
  login: string;
  name: string;
  img: string | null;
  level: number | null;
  promo: string;
  campus: number | null;
};
