import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
  const [score, setScore] = useState<number | null>(currentScore);
  const [feedback, setFeedback] = useState(currentFeedback);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (score === null) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(taskId, score, feedback);
      onClose();
    } catch (err: unknown) {
      console.error('Eval submit error:', err);
      const e = err as { error?: string; message?: string };
      setError(e?.message ?? e?.error ?? 'Failed to save evaluation.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Evaluate</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {evalType === 'pass_fail' ? (
            <div className="flex gap-3">
              <button
                onClick={() => setScore(1)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                  score === 1
                    ? 'bg-green-500 text-white border-green-500'
                    : 'text-green-600 border-green-200 dark:border-green-800'
                }`}
              >
                ✓ Pass
              </button>
              <button
                onClick={() => setScore(0)}
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
                value={score ?? ''}
                onChange={(e) =>
                  setScore(e.target.value === '' ? null : Math.round(Number(e.target.value)))
                }
              />
            </div>
          )}

          <textarea
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none bg-transparent dark:text-gray-200"
            placeholder="Feedback (optional)"
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={saving || score === null}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
