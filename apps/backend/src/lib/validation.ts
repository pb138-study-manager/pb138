import { t } from 'elysia';
import { z } from 'zod';

export function zodBody<T extends z.ZodTypeAny>(schema: T) {
  return {
    body: t.Unsafe<z.infer<T>>({}),
    beforeHandle: ({ body, set }: { body: unknown; set: { status: number } }) => {
      const result = schema.safeParse(body);
      if (!result.success) {
        set.status = 400;
        return {
          error: 'VALIDATION_ERROR',
          fields: result.error.flatten().fieldErrors,
        };
      }
    },
  };
}
