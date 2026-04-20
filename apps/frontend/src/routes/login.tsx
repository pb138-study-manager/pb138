import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isFilled = email.length > 0 && password.length >= 5;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: '/dashboard' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-5">
      <div className="w-full max-w-[362px] bg-white rounded-2xl shadow-[0px_10px_30px_0px_rgba(0,0,0,0.1)] p-8 flex flex-col gap-6">
        <h1 className="text-3xl font-bold text-black text-center">Login</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-11 px-4"
          />

          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-11 px-4"
          />

          <Button
            type="submit"
            disabled={loading}
            className={`w-full text-white rounded-lg h-11 px-4 transition-colors ${
              isFilled ? 'bg-[#555555] hover:bg-[#333333]' : 'bg-[#C4C4C4] hover:bg-[#b0b0b0]'
            }`}
          >
            {loading ? 'Logging in...' : 'Continue'}
          </Button>
        </form>

        <div className="flex flex-col gap-3 items-center">
          <div className="w-full h-px bg-gray-200" />
          <p className="text-sm text-gray-700">
            Not a member?{' '}
            <Link to="/register" className="underline text-black font-medium hover:text-gray-600">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
