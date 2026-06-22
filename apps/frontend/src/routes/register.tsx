import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '../lib/api';

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});

const registerSchema = z.object({
  fullName: z.string().min(1, { message: 'Full name is required' }),
  email: z.string().email({ message: 'Enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type RegisterForm = z.infer<typeof registerSchema>;

function RegisterPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isValid, isDirty },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  async function onSubmit(data: RegisterForm) {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.fullName },
      },
    });

    if (error) {
      setError('root', { message: error.message });
      return;
    }

    if (authData?.user && authData.user.email) {
      await api.post('/auth/sync', {
        email: authData.user.email,
        authId: authData.user.id,
        fullName: data.fullName,
      });
    }

    navigate({ to: '/verify-email' });
  }

  const isFilled = isValid && isDirty;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-5">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0px_10px_30px_0px_rgba(0,0,0,0.1)] w-full max-w-sm p-8 flex flex-col gap-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center">Register</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          {errors.root && (
            <p className="text-red-500 text-sm text-center">{errors.root.message}</p>
          )}

          <div className="flex flex-col gap-1">
            <Input
              type="text"
              placeholder="Full name"
              {...register('fullName')}
              className="w-full h-11 px-4"
            />
            {errors.fullName && (
              <p className="text-xs text-red-500 px-1">{errors.fullName.message}</p>
            )}
          </div>

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
            {isSubmitting ? 'Creating account...' : 'Register'}
          </Button>
        </form>

        <div className="flex flex-col gap-3 items-center">
          <div className="w-full h-px bg-gray-200 dark:bg-gray-700" />
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Already have an account?{' '}
            <Link
              to="/login"
              className="underline text-gray-900 dark:text-white font-medium hover:text-gray-600 dark:hover:text-gray-300"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
