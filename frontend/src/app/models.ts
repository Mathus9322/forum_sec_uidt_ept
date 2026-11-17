export type UserRole = 'participant' | 'animator' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  approved: boolean;
  avatar_url: string | null;
}

export interface LearningSession {
  id: number;
  title: string;
  scheduled_at: string;
  theme: string | null;
  description: string | null;
  archived: boolean;
  moderators?: User[];
}

export interface Answer {
  id: number;
  content: string;
  accepted: boolean;
  created_at: string;
  user: Pick<User, 'id' | 'name' | 'avatar_url'>;
}

export interface Question {
  id: number;
  title: string;
  content: string;
  is_resolved: boolean;
  created_at: string;
  user: Pick<User, 'id' | 'name' | 'avatar_url'>;
  session: Pick<LearningSession, 'id' | 'title' | 'archived' | 'moderators'> | null;
  answers_count: number;
  answers?: Answer[];
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}
