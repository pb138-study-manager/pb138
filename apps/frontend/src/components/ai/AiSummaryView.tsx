import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface AiSummaryViewProps {
  endpoint: string;
  active: boolean;
}

export function AiSummaryView({ endpoint, active }: AiSummaryViewProps) {
  const { t, i18n } = useTranslation();
  const [summary, set_summary] = useState<string | null>(null);
  const [is_loading, set_is_loading] = useState(false);
  const [has_error, set_has_error] = useState(false);
  const in_flight = useRef(false);

  async function load(force = false) {
    if (in_flight.current) return;
    if (summary !== null && !force) return;
    in_flight.current = true;
    set_is_loading(true);
    set_has_error(false);
    try {
      const result = await api.get<{ summary: string }>(
        `${endpoint}?lang=${i18n.language}`
      );
      set_summary(result.summary);
    } catch {
      set_has_error(true);
    } finally {
      set_is_loading(false);
      in_flight.current = false;
    }
  }

  useEffect(() => {
    if (active) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (is_loading) {
    return (
      <div className="px-4 py-6 space-y-3">
        <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (has_error) {
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
            ul: ({ children }) => (
              <ul className="list-disc pl-5 space-y-1 mb-2">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-5 space-y-1 mb-2">{children}</ol>
            ),
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

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 dark:border-gray-600 dark:text-gray-300"
        onClick={() => load(true)}
        disabled={is_loading}
      >
        <Sparkles size={14} />
        {t('ai.refresh')}
      </Button>
    </div>
  );
}
