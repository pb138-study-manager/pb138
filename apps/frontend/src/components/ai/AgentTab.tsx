import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, CheckCircle, XCircle, BookOpen, FileText } from 'lucide-react';
import { api } from '@/lib/api';

type AgentDisplay = { type: 'tasks' | 'events' | 'notes' | 'courses'; items: unknown[] };
type Message = { role: 'user' | 'assistant'; content: string; display?: AgentDisplay };
type PendingAction = { name: string; args: Record<string, unknown>; label: string };

// ── Display card sub-components ──────────────────────────────────────────────

function TaskCard({ item }: { item: Record<string, unknown> }) {
  const priorityDot: Record<string, string> = {
    HIGH: 'bg-red-500',
    MEDIUM: 'bg-amber-400',
    LOW: 'bg-indigo-400',
  };
  const priority = String(item.priority ?? 'LOW');
  const dueDate = item.dueDate ? new Date(String(item.dueDate)) : null;
  const overdue = dueDate && dueDate < new Date();

  return (
    <div className="flex items-center gap-2.5 bg-white dark:bg-gray-700 rounded-xl p-3 border border-gray-200 dark:border-gray-600">
      <div className={`w-2 h-2 rounded-full shrink-0 ${priorityDot[priority] ?? 'bg-indigo-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {String(item.title ?? '')}
        </p>
        {dueDate && (
          <p className={`text-xs ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
            {overdue ? 'Overdue · ' : ''}{dueDate.toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

function EventCard({ item }: { item: Record<string, unknown> }) {
  const start = item.startDate ? new Date(String(item.startDate)) : null;
  const end = item.endDate ? new Date(String(item.endDate)) : null;
  const isDeadline = item.type === 'DEADLINE';
  const startTime = start
    ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  let duration: string | null = null;
  if (start && end && !isDeadline) {
    const diffMin = Math.round((end.getTime() - start.getTime()) / 60000);
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    duration = h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  return (
    <div className="flex items-stretch gap-2">
      <div className={`w-1.5 rounded-full shrink-0 ${isDeadline ? 'bg-red-500' : 'bg-green-500'}`} />
      <div className="flex-1 bg-white dark:bg-gray-700 rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-600 shadow-sm min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
          {String(item.title ?? '')}
        </p>
        {startTime && (
          <p className="text-xs text-gray-400 mt-0.5">
            {startTime}{duration ? ` · ${duration}` : ''}
            {isDeadline && <span className="text-red-400 font-medium"> · deadline</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function NoteCard({ item }: { item: Record<string, unknown> }) {
  return (
    <div className="flex items-center gap-2.5 bg-white dark:bg-gray-700 rounded-xl p-3 border border-gray-200 dark:border-gray-600">
      <FileText size={14} className="text-purple-400 shrink-0" />
      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
        {String(item.title ?? '')}
      </p>
    </div>
  );
}

function CourseCard({ item }: { item: Record<string, unknown> }) {
  return (
    <div className="flex items-center gap-2.5 bg-white dark:bg-gray-700 rounded-xl p-3 border border-gray-200 dark:border-gray-600">
      <BookOpen size={14} className="text-indigo-400 shrink-0" />
      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
        {item.code ? `${item.code} — ` : ''}{String(item.name ?? '')}
      </p>
    </div>
  );
}

function DisplayCards({ display }: { display: AgentDisplay }) {
  const items = display.items as Record<string, unknown>[];
  if (items.length === 0) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {items.map((item, i) => {
        if (display.type === 'tasks') return <TaskCard key={i} item={item} />;
        if (display.type === 'events') return <EventCard key={i} item={item} />;
        if (display.type === 'notes') return <NoteCard key={i} item={item} />;
        return <CourseCard key={i} item={item} />;
      })}
    </div>
  );
}


export function AgentTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  async function send(confirmAction?: PendingAction) {
    if (!input.trim() && !confirmAction) return;

    const userMsg: Message = { role: 'user', content: input };
    const newMessages = confirmAction ? messages : [...messages, userMsg];
    if (!confirmAction) {
      setMessages(newMessages);
      setInput('');
    }
    setPending(null);
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        messages: newMessages.map(({ role, content }) => ({ role, content })),
      };
      if (confirmAction) body.confirm = { name: confirmAction.name, args: confirmAction.args };

      const res = await api.post<{
        reply?: string;
        pendingAction?: PendingAction;
        display?: AgentDisplay;
      }>('/ai/agent', body);

      if (res.pendingAction) {
        setPending(res.pendingAction);
      } else if (res.reply) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: res.reply!, display: res.display },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!pending) return;
    const action = pending;
    setMessages((prev) => [...prev, { role: 'user', content: `✓ Potvrdené: ${action.label}` }]);
    await send(action);
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-8">
            Opýtaj sa ma čokoľvek alebo mi daj úlohu...
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'user' ? (
              <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm bg-indigo-500 text-white">
                {m.content}
              </div>
            ) : (
              <div className="max-w-[95%] rounded-xl px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-1 leading-relaxed">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5 mb-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 mb-1">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                  }}
                >
                  {m.content}
                </ReactMarkdown>
                {m.display && <DisplayCards display={m.display} />}
              </div>
            )}
          </div>
        ))}

        {/* Confirm card */}
        {pending && (
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-3 space-y-2">
            <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
              Chceš vykonať:
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
              {pending.label}
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirm}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-sm hover:bg-indigo-600"
              >
                <CheckCircle size={14} /> Potvrdiť
              </button>
              <button
                onClick={() => setPending(null)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-300"
              >
                <XCircle size={14} /> Zrušiť
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2">
              <Loader2 size={16} className="animate-spin text-indigo-500" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t dark:border-gray-700 p-3 flex gap-2">
        <input
          className="flex-1 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 outline-none text-gray-900 dark:text-white placeholder-gray-400"
          placeholder="Napíš správu..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="p-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}