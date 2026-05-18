export type TaskStatus = 'TODO' | 'IN PROGRESS' | 'DONE';
export type RoleName = 'USER' | 'MENTOR' | 'ADMIN';

export interface User {
  id: number;
  login: string;
  email: string;
  roles: RoleName[];
  name: string;
  avatarUrl: string;
}

export interface Mentor {
  id: number;
  name: string;
  code: string;
  avatarUrl: string;
}

export interface Task {
  id: number;
  userId: number;
  assignmentId: number | null;
  courseId: number | null;
  parentId: number | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  assignmentDeadline?: string | null;
  status: TaskStatus;
  deletedAt: string | null;
  subtasks?: Task[];
  subtaskCount?: number;
  doneSubtaskCount?: number;
  eval?: Eval;
}

export interface FeaturedTaskItem {
  id: number;
  title: string;
  time: string;
  location: string;
  color: 'yellow' | 'green';
}


export type EventType = 'EVENT' | 'DEADLINE';

export interface Event {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  place: string | null;
  type: EventType;
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

/** Študent v kurze (mock / neskôr z API) */
export interface CourseStudent {
  id: number;
  name: string;
  login: string;
}

/** Položka študijného materiálu v kurze */
export interface CourseStudyMaterial {
  id: string;
  title: string;
  description: string | null;
  /** Voliteľný odkaz (PDF, video, …) */
  url: string | null;
}

/** Úloha zobrazená v detaile kurzu */
export interface CourseTaskListItem {
  id: string;
  title: string;
  dueLabel: string;
  subject: string | null;
  /** Komu je úloha určená */
  target: 'all' | 'one';
  targetStudentName: string | null;
}
