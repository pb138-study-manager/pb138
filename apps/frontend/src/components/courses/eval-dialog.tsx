import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

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

  async function handleSubmit() {
    if (score === null) return;
    setSaving(true);
    try {
      await onSubmit(taskId, score, feedback);
      onClose();
    } catch {
      // stay open
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 px-4 pb-8">
      <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Evaluate</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {evalType === 'pass_fail' ? (
          <div className="flex gap-3">
            <button
              onClick={() => setScore(1)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                score === 1
                  ? 'bg-green-500 text-white border-green-500'
                  : 'text-green-600 border-green-200'
              }`}
            >
              ✓ Pass
            </button>
            <button
              onClick={() => setScore(0)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                score === 0
                  ? 'bg-red-500 text-white border-red-500'
                  : 'text-red-600 border-red-200'
              }`}
            >
              ✗ Fail
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs text-gray-500 font-medium">Score (0–100)</label>
            <input
              type="number"
              min={0}
              max={100}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              value={score ?? ''}
              onChange={(e) => setScore(e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
        )}

        <textarea
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"
          placeholder="Feedback (optional)"
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={saving || score === null}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
