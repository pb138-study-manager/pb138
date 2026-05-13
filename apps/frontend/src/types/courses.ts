export interface CourseProgress {
  total: number;
  done: number;
  percent: number;
}

export interface Course {
  id: number;
  code: string;
  name: string | null;
  semester: string;
  color?: string | null;
  lectureSchedule: string | null;
  seminarSchedule?: string | null;
  lectureTeacherId: number | null;
  seminarTeacherId?: number | null;
  enrolled: boolean;
  progress?: CourseProgress;
  enrolledCount?: number;
}

export interface CreateCourseDto {
  code: string;
  semester: string;
  name?: string;
  color?: string;
  lectureSchedule?: string;
  seminarSchedule?: string;
  lectureTeacherId?: number;
  seminarTeacherId?: number;
}