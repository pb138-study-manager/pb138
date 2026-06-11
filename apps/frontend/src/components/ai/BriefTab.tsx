import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Priority {
  title: string;
  dueDate: string;
  urgency: 'high' | 'medium' | 'low';
}

interface BriefData {
  brief: string;
  priorities: Priority[];
}

const urgencyColors = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-green-500',
};

export function BriefTab() {
  const [data, setData] = useState<BriefData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { t, i18n } = useTranslation();

  async function load() {
    setIsLoading(true);
    try {
      const result = await api.post<BriefData>('/ai/brief', { lang: i18n.language });
      setData(result);
      setLoaded(true);
    } catch {
      setData({ brief: t('ai.briefError'), priorities: [] });
      setLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (!loaded && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
        <p className="text-sm text-gray-400 text-center">{t('ai.briefSubtitle')}</p>
        <Button onClick={load} className="bg-indigo-500 hover:bg-indigo-600 text-white">
          {t('ai.generateBrief')}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse w-full" />
        <div className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse w-4/5" />
        <div className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse w-3/5" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-1.5">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-1.5 leading-relaxed">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5 mb-1.5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 mb-1.5">{children}</ol>,
            li: ({ children }) => <li>{children}</li>,
            code: ({ children }) => <code className="bg-gray-100 dark:bg-gray-700 rounded px-1 text-xs font-mono">{children}</code>,
          }}
        >
          {data?.brief ?? ''}
        </ReactMarkdown>
      </div>

      {data && data.priorities.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Top priority</p>
          {data.priorities.map((p, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${urgencyColors[p.urgency]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.title}</p>
                <p className="text-xs text-gray-400">
                  {new Date(p.dueDate).toLocaleDateString(i18n.language === 'cs' ? 'cs-CZ' : 'en-US')}
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
        onClick={load}
        disabled={isLoading}
      >
        <RefreshCw size={14} />
        {t('ai.refresh')}
      </Button>
    </div>
  );
}
