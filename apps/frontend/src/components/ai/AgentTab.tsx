import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

type Message = { role: 'user' | 'assistant'; content: string };
type PendingAction = { name: string; args: Record<string, unknown>; label: string };

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
      const body: Record<string, unknown> = { messages: newMessages };
      if (confirmAction) body.confirm = { name: confirmAction.name, args: confirmAction.args };

      const res = await api.post<{ reply?: string; pendingAction?: PendingAction }>(
        '/ai/agent',
        body
      );

      if (res.pendingAction) {
        setPending(res.pendingAction);
      } else if (res.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: res.reply! }]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!pending) return;
    const action = pending;
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: `✓ Potvrdené: ${action.label}` },
    ]);
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
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
              }`}
            >
              {m.content}
            </div>
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