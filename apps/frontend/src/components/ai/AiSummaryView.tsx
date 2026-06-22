import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { UrgencyDot } from '@/components/shared/UrgencyPill';

interface Priority {
  title: string;
  dueDate: string;
  urgency: 'high' | 'medium' | 'low';
}

interface BriefData {
  brief: string;
  priorities: Priority[];
}

interface AiSummaryViewProps {
  active: boolean;
}

export function AiSummaryView({ active }: AiSummaryViewProps) {
  const { t, i18n } = useTranslation();
  const [summary, setSummary] = useState<string | null>(null);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const inFlight = useRef(false);

  async function load(force = false) {
    if (inFlight.current) return;
    if (summary !== null && !force) return;
    inFlight.current = true;
    setIsLoading(true);
    setHasError(false);
    try {
      const result = await api.post<BriefData>('/ai/brief', { lang: i18n.language });
      setSummary(result.brief);
      setPriorities(result.priorities ?? []);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
      inFlight.current = false;
    }
  }

  useEffect(() => {
    if (active) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-3">
        <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-12">
        <p className="text-sm text-gray-400 text-center">{t('ai.briefError')}</p>
        <Button
          onClick={() => load(true)}
          className="gap-2 bg-indigo-500 hover:bg-indigo-600 text-white"
        >
          <RefreshCw size={14} />
          {t('ai.refresh')}
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h3 className="text-base font-bold text-gray-900 dark:text-white mt-3 mb-1.5">
                {children}
              </h3>
            ),
            h2: ({ children }) => (
              <h3 className="text-base font-bold text-gray-900 dark:text-white mt-3 mb-1.5">
                {children}
              </h3>
            ),
            h3: ({ children }) => (
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mt-3 mb-1">
                {children}
              </h4>
            ),
            p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
            strong: ({ children }) => (
              <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>
            ),
            em: ({ children }) => <em className="italic">{children}</em>,
            ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-2">{children}</ol>,
            li: ({ children }) => <li>{children}</li>,
            code: ({ children }) => (
              <code className="bg-gray-100 dark:bg-gray-700 rounded px-1 text-xs font-mono">
                {children}
              </code>
            ),
          }}
        >
          {summary ?? ''}
        </ReactMarkdown>
      </div>

      {priorities.length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            {t('ai.topPriority')}
          </p>
          {priorities.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3"
            >
              <UrgencyDot urgency={p.urgency} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {p.title}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(p.dueDate).toLocaleDateString(
                    i18n.language === 'cs' ? 'cs-CZ' : 'en-US'
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 dark:border-gray-600 dark:text-gray-300"
        onClick={() => load(true)}
        disabled={isLoading}
      >
        <Sparkles size={14} />
        {t('ai.refresh')}
      </Button>
    </div>
  );
}
