export type TaskStatus = 'TODO' | 'IN PROGRESS' | 'DONE';
export type RoleName = 'USER' | 'MENTOR' | 'ADMIN';

export interface User {
  id: number;
  login: string;
  email: string;
  roles: RoleName[];
}

export interface Task {
  id: number;
  userId: number;
  assignmentId: number | null;
  title: string;
  description: string | null;
  dueDate: string;
  status: TaskStatus;
  deletedAt: string | null;
  eval?: Eval;
}

export interface Event {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  place: string | null;
  deletedAt: string | null;
}

export interface Note {
  id: number;
  userId: number;
  title: string;
  description: string;
  deletedAt: string | null;
}

export interface Group {
  id: number;
  mentorId: number;
  name: string;
  deletedAt: string | null;
  members?: User[];
}

export interface Assignment {
  id: number;
  groupId: number;
  title: string;
  description: string | null;
  dueDate: string;
}

export interface Eval {
  id: number;
  taskId: number;
  feedback: string;
  score: number;
  evaluatedAt: string;
}
