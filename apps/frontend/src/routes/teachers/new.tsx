import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Search } from 'lucide-react';

const schema = z.object({
  login: z.string().min(1, { message: 'Login is required' }),
});

type TeacherForm = z.infer<typeof schema>;

export const Route = createFileRoute('/teachers/new')({
  component: AddTeacherPage,
});

function AddTeacherPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { isValid, isSubmitting },
  } = useForm<TeacherForm>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { login: '' },
  });

  async function onFormSubmit(_data: TeacherForm) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    navigate({ to: '/teachers' });
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/teachers' })}
          className="p-0 h-auto w-auto"
        >
          <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Teacher</h1>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="px-4 py-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-900 dark:border-gray-100">
            <Search className="w-5 h-5 text-gray-600" />
            <Input
              type="text"
              placeholder="@name"
              {...register('login')}
              className="border-0 outline-none focus-visible:ring-0 text-base placeholder-gray-400 p-0 h-auto"
            />
          </div>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 text-white font-bold py-6 rounded-2xl text-lg"
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </form>
    </div>
  );
}
