import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const schema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string(),
});

type EvalForm = z.infer<typeof schema>;

interface Props {
  taskId: number;
  evalType: 'pass_fail' | 'graded';
  currentScore: number | null;
  currentFeedback?: string;
  onClose: () => void;
  onSubmit: (taskId: number, score: number, feedback: string) => Promise<void>;
}

export default function EvalDialog({
  taskId,
  evalType,
  currentScore,
  currentFeedback = '',
  onClose,
  onSubmit,
}: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EvalForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...(currentScore !== null ? { score: currentScore } : {}),
      feedback: currentFeedback,
    },
  });

  const score = watch('score');

  async function onFormSubmit(data: EvalForm) {
    try {
      await onSubmit(taskId, data.score, data.feedback);
      onClose();
    } catch (err: unknown) {
      const e = err as { error?: string; message?: string };
      setError('root', { message: e?.message ?? e?.error ?? 'Failed to save evaluation.' });
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Evaluate</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 py-2">
          {evalType === 'pass_fail' ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setValue('score', 1, { shouldValidate: true })}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                  score === 1
                    ? 'bg-green-500 text-white border-green-500'
                    : 'text-green-600 border-green-200 dark:border-green-800'
                }`}
              >
                ✓ Pass
              </button>
              <button
                type="button"
                onClick={() => setValue('score', 0, { shouldValidate: true })}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                  score === 0
                    ? 'bg-red-500 text-white border-red-500'
                    : 'text-red-600 border-red-200 dark:border-red-800'
                }`}
              >
                ✗ Fail
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Score (0–100)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-transparent dark:text-gray-200"
                {...register('score', { valueAsNumber: true })}
              />
              {errors.score && (
                <p className="text-xs text-red-500">{errors.score.message}</p>
              )}
            </div>
          )}

          <textarea
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none bg-transparent dark:text-gray-200"
            placeholder="Feedback (optional)"
            rows={3}
            {...register('feedback')}
          />

          {errors.root && <p className="text-xs text-red-500">{errors.root.message}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting || score === undefined}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
