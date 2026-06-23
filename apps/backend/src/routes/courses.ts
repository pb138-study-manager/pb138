import { Elysia } from 'elysia';
import { z } from 'zod';
import { authMiddleware, type AuthUser } from '../middleware/auth';
import { zodBody } from '../lib/validation';
import * as CoursesController from '../controllers/courses.controller';
import * as AssignmentsController from '../controllers/courses.assignments.controller';
import * as StudentsController from '../controllers/courses.students.controller';

const CreateCourseSchema = z.object({
  code: z.string().min(1), semester: z.string().min(1), name: z.string().optional(),
  color: z.string().optional(), lectureSchedule: z.string().optional(),
  seminarSchedule: z.string().optional(), lectureTeacherId: z.number().optional(),
  seminarTeacherId: z.number().optional(),
});
const UpdateCourseSchema = z.object({
  code: z.string().min(1).optional(), name: z.string().optional(),
  semester: z.string().min(1).optional(), color: z.string().optional(),
  lectureSchedule: z.string().optional(), seminarSchedule: z.string().optional(),
  lectureTeacherId: z.number().optional(), seminarTeacherId: z.number().optional(),
});
const CreateAssignmentSchema = z.object({
  title: z.string().min(1), description: z.string().optional(), dueDate: z.string(),
  evalType: z.enum(['none', 'pass_fail', 'graded']).optional().default('none'),
  targetUserId: z.number().int().positive().optional(),
});
const UpdateAssignmentSchema = z.object({
  title: z.string().min(1).optional(), description: z.string().optional(),
  dueDate: z.string().optional(), evalType: z.enum(['none', 'pass_fail', 'graded']).optional(),
});

export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>;
export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof UpdateAssignmentSchema>;

export const coursesRoutes = new Elysia({ prefix: '/courses' })
  .use(authMiddleware)
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'UNAUTHORIZED', message: 'Invalid or missing token' };
    }
  })
  // Base course CRUD
  .get('/', ({ user }) => CoursesController.listCourses(user as AuthUser))
  .get('/teaching', ({ user }) => CoursesController.listTeachingCourses(user as AuthUser))
  .get('/enrolled', ({ user }) => CoursesController.listEnrolledCourses(user as AuthUser))
  .post('/', ({ user, body }) => CoursesController.createCourse(user as AuthUser, body), zodBody(CreateCourseSchema))
  .get('/:id', ({ user, params }) => CoursesController.getCourse(user as AuthUser, Number(params.id)))
  .patch('/:id', ({ user, params, body }) => CoursesController.updateCourse(user as AuthUser, Number(params.id), body), zodBody(UpdateCourseSchema))
  .delete('/:id', ({ user, params }) => CoursesController.deleteCourse(user as AuthUser, Number(params.id)))
  .post('/:id/enroll', ({ user, params }) => CoursesController.enrollSelf(user as AuthUser, Number(params.id)))
  .delete('/:id/enroll', ({ user, params }) => CoursesController.unenrollSelf(user as AuthUser, Number(params.id)))
  .get('/:id/progress', ({ user, params }) => CoursesController.getCourseProgress(user as AuthUser, Number(params.id)))
  // Assignments
  .get('/:id/assignments', ({ user, params }) => AssignmentsController.listCourseAssignments(user as AuthUser, Number(params.id)))
  .post('/:id/assignments', ({ user, params, body }) => AssignmentsController.createCourseAssignment(user as AuthUser, Number(params.id), body), zodBody(CreateAssignmentSchema))
  .patch('/:id/assignments/:assignmentId', ({ user, params, body }) => AssignmentsController.updateCourseAssignment(user as AuthUser, Number(params.id), Number(params.assignmentId), body), zodBody(UpdateAssignmentSchema))
  .get('/:id/assignments/:assignmentId/subtasks', ({ user, params }) => AssignmentsController.listAssignmentSubtasks(user as AuthUser, Number(params.id), Number(params.assignmentId)))
  .post('/:id/assignments/:assignmentId/subtasks', ({ user, params, body }) => AssignmentsController.createAssignmentSubtask(user as AuthUser, Number(params.id), Number(params.assignmentId), body.title), zodBody(z.object({ title: z.string().min(1) })))
  .delete('/:id/assignments/:assignmentId/subtasks/:subtaskId', ({ user, params }) => AssignmentsController.deleteAssignmentSubtask(user as AuthUser, Number(params.id), Number(params.assignmentId), Number(params.subtaskId)))
  .get('/:id/assignments/:assignmentId/students', ({ user, params }) => StudentsController.listAssignmentStudents(user as AuthUser, Number(params.id), Number(params.assignmentId)))
  // Students
  .get('/:id/students', ({ user, params }) => StudentsController.listCourseStudents(user as AuthUser, Number(params.id)))
  .get('/:id/students/:studentId', ({ user, params }) => StudentsController.getStudentDetail(user as AuthUser, Number(params.id), Number(params.studentId)))
  .post('/:id/students', ({ user, params, body }) => StudentsController.enrollStudent(user as AuthUser, Number(params.id), body.userId), zodBody(z.object({ userId: z.number().int().positive() })))
  // Evaluations
  .get('/:id/my-evals', ({ user, params }) => StudentsController.getMyEvals(user as AuthUser, Number(params.id)))
  .get('/:id/evaluations', ({ user, params }) => StudentsController.listCourseEvaluations(user as AuthUser, Number(params.id)));
