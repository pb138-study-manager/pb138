import { createContext, useContext, useState, ReactNode } from 'react';

interface AIPanelContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const AIPanelContext = createContext<AIPanelContextType | null>(null);

export function AIPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AIPanelContext.Provider value={{
      isOpen,
      toggle: () => setIsOpen((v) => !v),
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }}>
      {children}
    </AIPanelContext.Provider>
  );
}

export function useAIPanel() {
  const ctx = useContext(AIPanelContext);
  if (!ctx) throw new Error('useAIPanel must be used inside AIPanelProvider');
  return ctx;
}
