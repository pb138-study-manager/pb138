import { t } from 'elysia';
import { z } from 'zod';

export function zodBody<T extends z.ZodTypeAny>(schema: T) {
  return {
    body: t.Any(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    beforeHandle: (ctx: any) => {
      const result = schema.safeParse(ctx.body);
      if (!result.success) {
        ctx.set.status = 400;
        return {
          error: 'VALIDATION_ERROR',
          fields: result.error.flatten().fieldErrors,
        };
      }
    },
  };
}
