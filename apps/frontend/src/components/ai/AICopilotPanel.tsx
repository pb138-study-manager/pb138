import { useState } from 'react';
import { X, Sparkles, MessageSquare, Newspaper } from 'lucide-react';
import { useAIPanel } from '@/context/AIPanelContext';
import { BriefTab } from './BriefTab';
import { ChatTab } from './ChatTab';
import { AgentTab } from './AgentTab';

type Tab = 'brief' | 'chat' | 'agent';

interface AICopilotPanelProps {
  inline?: boolean;
}

export function AICopilotPanel({ inline = false }: AICopilotPanelProps) {
  const { isOpen, close } = useAIPanel();
  const [tab, setTab] = useState<Tab>('brief');

  // Mobile overlay mode: only render when open
  if (!inline && !isOpen) return null;

  const panelContent = (
    <div className={`${inline ? 'h-full w-full' : 'fixed right-0 top-0 h-full w-full md:w-72 z-40 shadow-xl'} bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-500" />
          <span className="font-semibold text-sm text-gray-900 dark:text-white">AI Copilot</span>
        </div>
        <button onClick={close} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b dark:border-gray-700">
        <button
          onClick={() => setTab('brief')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
            tab === 'brief'
              ? 'text-indigo-600 border-b-2 border-indigo-500'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Newspaper size={14} />
          Brief
        </button>
        <button
          onClick={() => setTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
            tab === 'chat'
              ? 'text-indigo-600 border-b-2 border-indigo-500'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <MessageSquare size={14} />
          Chat
        </button>
        <button
          onClick={() => setTab('agent')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
            tab === 'agent'
              ? 'text-indigo-600 border-b-2 border-indigo-500'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Sparkles size={14} />
          Agent
        </button>
      </div>

      {/* Content — both tabs always mounted, hidden tab just invisible */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className={tab === 'brief' ? 'flex flex-col flex-1 overflow-hidden' : 'hidden'}>
          <BriefTab />
        </div>
        <div className={tab === 'chat' ? 'flex flex-col flex-1 overflow-hidden' : 'hidden'}>
          <ChatTab />
        </div>
        <div className={tab === 'agent' ? 'flex flex-col flex-1 overflow-hidden' : 'hidden'}>
          <AgentTab />
        </div>
      </div>
    </div>
  );

  if (inline) return panelContent;

  return (
    <>
      {/* Backdrop on mobile */}
      <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={close} />
      {panelContent}
    </>
  );
}
