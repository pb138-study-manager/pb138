import { X, Sparkles } from 'lucide-react';
import { useAIPanel } from '@/context/AIPanelContext';
import { AgentTab } from './AgentTab';

interface AICopilotPanelProps {
  inline?: boolean;
}

export function AICopilotPanel({ inline = false }: AICopilotPanelProps) {
  const { isOpen, close } = useAIPanel();

  // Mobile overlay mode: only render when open
  if (!inline && !isOpen) return null;

  const panelContent = (
    <div
      className={`${inline ? 'h-full w-full' : 'fixed right-0 top-0 h-full w-full md:w-72 z-40 shadow-xl'} bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-500" />
          <span className="font-semibold text-sm text-gray-900 dark:text-white">AI Copilot</span>
        </div>
        <button
          onClick={close}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <AgentTab />
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
