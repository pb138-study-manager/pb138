import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { type User } from '@supabase/supabase-js';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});

export function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <h2 className="text-xl font-semibold mb-2">Current Supabase User:</h2>
      {user ? (
        <pre className="bg-white p-4 border border-gray-200 shadow-sm rounded-lg overflow-auto text-sm">
          {JSON.stringify(user, null, 2)}
        </pre>
      ) : (
        <p className="text-gray-500">Loading user data...</p>
      )}
    </div>
  );
}
