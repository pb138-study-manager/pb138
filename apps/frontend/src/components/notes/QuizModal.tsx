import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Question {
  question: string;
  options: string[];
  correct: number;
}

interface QuizModalProps {
  noteId: number;
  noteTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QuizModal({ noteId, noteTitle, isOpen, onClose }: QuizModalProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [done, setDone] = useState(false);
  const { i18n } = useTranslation();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isOpen) return;
    setQuestions([]);
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setDone(false);
    load();
  }, [isOpen, noteId]);

  async function load() {
    setIsLoading(true);
    try {
      const result = await api.post<{ questions: Question[] }>(`/ai/notes/${noteId}/quiz`, { lang: i18n.language });
      setQuestions(result.questions ?? []);
      setAnswers(new Array(result.questions?.length ?? 0).fill(null));
    } catch {
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }

  function selectAnswer(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    setAnswers((prev) => prev.map((a, i) => (i === current ? idx : a)));
  }

  function next() {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(answers[current + 1]);
    } else {
      setDone(true);
    }
  }

  function prev() {
    if (current > 0) {
      setCurrent((c) => c - 1);
      setSelected(answers[current - 1]);
    }
  }

  function restart() {
    setCurrent(0);
    setSelected(null);
    setAnswers(new Array(questions.length).fill(null));
    setDone(false);
  }

  if (!isOpen) return null;

  const score = answers.filter((a, i) => a === questions[i]?.correct).length;
  const q = questions[current];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{noteTitle}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && (
            <div className="space-y-3 py-4">
              <p className="text-center text-sm text-gray-400 mb-4">Generujem otázky...</p>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && questions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">Nepodarilo sa vygenerovať otázky.</p>
              <Button onClick={load} className="mt-4" size="sm">Skúsiť znova</Button>
            </div>
          )}

          {!isLoading && done && (
            <div className="text-center py-6 space-y-4">
              <p className="text-4xl">{score >= questions.length * 0.8 ? '🎉' : score >= questions.length * 0.5 ? '👍' : '📚'}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{score}/{questions.length} správnych</p>
              <p className="text-sm text-gray-400">
                {score === questions.length ? 'Perfektné!' : score >= questions.length * 0.5 ? 'Dobrá práca!' : 'Prečítaj si poznámku znova.'}
              </p>
              <Button onClick={restart} className="mt-2">Skúsiť znova</Button>
            </div>
          )}

          {!isLoading && !done && q && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400 font-medium">Otázka {current + 1} z {questions.length}</p>
              <p className="font-semibold text-gray-900 dark:text-white text-sm leading-relaxed">{q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, i) => {
                  const isSelected = selected === i;
                  const isCorrect = i === q.correct;
                  const revealed = selected !== null;
                  return (
                    <button
                      key={i}
                      onClick={() => selectAnswer(i)}
                      className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-colors ${
                        revealed
                          ? isCorrect
                            ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300'
                            : isSelected
                              ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300'
                              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:border-indigo-300'
                      }`}
                    >
                      <span className="font-medium mr-2">{['A', 'B', 'C', 'D'][i]}.</span>{opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        {!isLoading && !done && questions.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t dark:border-gray-700">
            <Button variant="outline" size="sm" onClick={prev} disabled={current === 0} className="gap-1">
              <ChevronLeft size={14} /> Predošlá
            </Button>
            <Button size="sm" onClick={next} disabled={selected === null} className="gap-1">
              {current === questions.length - 1 ? 'Dokončiť' : 'Ďalšia'} <ChevronRight size={14} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
