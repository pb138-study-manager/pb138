import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isValid, isDirty },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  async function onSubmit(data: LoginForm) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setError('root', { message: error.message });
      return;
    }

    if (authData?.user) {
      try {
        await api.post('/auth/sync', {
          email: authData.user.email!,
          authId: authData.user.id,
          fullName: authData.user.user_metadata?.full_name ?? '',
        });
      } catch {
        // sync is best-effort; login still proceeds
      }
    }

    navigate({ to: '/today' });
  }

  const isFilled = isValid && isDirty;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-5">
      <div className="w-full max-w-[362px] bg-white dark:bg-gray-800 rounded-2xl shadow-[0px_10px_30px_0px_rgba(0,0,0,0.1)] p-8 flex flex-col gap-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center">Login</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          {errors.root && (
            <p className="text-sm text-red-500 text-center">{errors.root.message}</p>
          )}

          <div className="flex flex-col gap-1">
            <Input
              type="email"
              placeholder="Email"
              {...register('email')}
              className="w-full h-11 px-4"
            />
            {errors.email && (
              <p className="text-xs text-red-500 px-1">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Input
              type="password"
              placeholder="Password"
              {...register('password')}
              className="w-full h-11 px-4"
            />
            {errors.password && (
              <p className="text-xs text-red-500 px-1">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className={`w-full text-white rounded-lg h-11 px-4 transition-colors ${
              isFilled ? 'bg-[#555555] hover:bg-[#333333]' : 'bg-[#C4C4C4] hover:bg-[#b0b0b0]'
            }`}
          >
            {isSubmitting ? 'Logging in...' : 'Continue'}
          </Button>
        </form>

        <div className="flex flex-col gap-3 items-center">
          <div className="w-full h-px bg-gray-200 dark:bg-gray-700" />
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Not a member?{' '}
            <Link
              to="/register"
              className="underline text-gray-900 dark:text-white font-medium hover:text-gray-600 dark:hover:text-gray-300"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
