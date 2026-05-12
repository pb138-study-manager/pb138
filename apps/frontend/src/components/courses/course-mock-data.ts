import type { CourseStudent, CourseStudyMaterial, CourseTaskListItem } from '@/types/index';

export interface CourseDetailMock {
  code: string;
  name: string;
  mentorName: string;
  students: CourseStudent[];
  materials: CourseStudyMaterial[];
  tasks: CourseTaskListItem[];
}

const defaultStudents: CourseStudent[] = [
  { id: 1, name: 'Anna Kovacs', login: 'xkovacova' },
  { id: 2, name: 'Martin Novak', login: 'xnovak' },
  { id: 3, name: 'Jana Horvath', login: 'xhorvath' },
];

const defaultMaterials: CourseStudyMaterial[] = [
  {
    id: 'm1',
    title: 'Course introduction (slides)',
    description: 'Overview of topics and grading.',
    url: null,
  },
  {
    id: 'm2',
    title: 'Lab 1 — assignment',
    description: null,
    url: 'https://example.com/cv1.pdf',
  },
];

const defaultTasks: CourseTaskListItem[] = [
  {
    id: 't1',
    title: 'Implement REST endpoint',
    dueLabel: '23:59 · PB138',
    subject: 'PB138',
    target: 'all',
    targetStudentName: null,
  },
  {
    id: 't2',
    title: 'Supplementary XML exercise',
    dueLabel: '23:59 · PB138',
    subject: 'PB138',
    target: 'one',
    targetStudentName: 'Anna Kovacs',
  },
  {
    id: 't3',
    title: 'Code review for team branch',
    dueLabel: '12:00 · PB138',
    subject: 'PB138',
    target: 'all',
    targetStudentName: null,
  },
];

export function getCourseDetailMock(_courseId: string): CourseDetailMock {
  void _courseId;
  return {
    code: 'PB138',
    name: 'Web Application Development Principles',
    mentorName: 'doc. RNDr. Jan Novak, Ph.D.',
    students: defaultStudents,
    materials: defaultMaterials,
    tasks: defaultTasks,
  };
}
