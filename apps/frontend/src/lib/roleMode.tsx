import { createContext, useContext, useState, ReactNode } from 'react';

export type RoleMode = 'student' | 'teacher';

interface RoleModeContextType {
  mode: RoleMode;
  toggle: () => void;
}

const RoleModeContext = createContext<RoleModeContextType | null>(null);

export function RoleModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<RoleMode>(
    () => (localStorage.getItem('roleMode') as RoleMode) ?? 'student'
  );

  function toggle() {
    setMode((prev) => {
      const next = prev === 'student' ? 'teacher' : 'student';
      localStorage.setItem('roleMode', next);
      return next;
    });
  }

  return <RoleModeContext.Provider value={{ mode, toggle }}>{children}</RoleModeContext.Provider>;
}

export function useRoleMode() {
  const ctx = useContext(RoleModeContext);
  if (!ctx) throw new Error('useRoleMode must be used inside RoleModeProvider');
  return ctx;
}
