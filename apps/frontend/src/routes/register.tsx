import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '../lib/api';

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isFilled = email.length > 0 && password.length >= 5 && fullName.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) throw error;

      // Sync the newly created user to our backend's public.users table
      if (data?.user && data.user.email) {
        await api.post('/auth/sync', {
          email: data.user.email,
          authId: data.user.id,
          fullName: fullName,
        });
      }

      // Supabase sends a verification email — tell the user to check their inbox
      navigate({ to: '/verify-email' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-5">
      <div className="bg-whte rounded-2xl shadow-[0px_10px_30px_0px_rgba(0,0,0,0.1)] w-full max-w-sm p-8 flex flex-col gap-6">
        <h1 className="text-3xl font-bold text-black text-center">Sign In</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <Input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full h-11 px-4"
          />

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
            minLength={6}
            className="w-full h-11 px-4"
          />

          <Button
            type="submit"
            disabled={loading}
            className={`w-full text-white rounded-lg h-11 px-4 transition-colors ${
              isFilled ? 'bg-[#555555] hover:bg-[#333333]' : 'bg-[#C4C4C4] hover:bg-[#b0b0b0]'
            }`}
          >
            {loading ? 'Creating account...' : 'Register'}
          </Button>
        </form>

        <div className="flex flex-col gap-3 items-center">
          <div className="w-full h-px bg-gray-200" />
          <p className="text-sm text-gray-700">
            Already have an account?{' '}
            <Link to="/login" className="underline text-black font-medium hover:text-gray-600">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
