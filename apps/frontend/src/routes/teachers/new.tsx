import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Search } from 'lucide-react';

export const Route = createFileRoute('/teachers/new')({
  component: AddTeacherPage,
});

function AddTeacherPage() {
  const navigate = useNavigate();
  const [mentorLogin, setMentorLogin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleBack = () => {
    navigate({ to: '/teachers' });
  };

  const handleAdd = async () => {
    if (!mentorLogin.trim()) return;

    setIsLoading(true);
    try {
      // TODO: API call to add teacher/mentor
      // POST /api/users/me/mentors with { mentorLogin: mentorLogin }
      console.log('Adding mentor:', mentorLogin);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Navigate back to teachers page
      navigate({ to: '/teachers' });
    } catch (error) {
      console.error('Error adding mentor:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleBack} className="p-0 h-auto w-auto">
          <ChevronLeft className="w-6 h-6 text-gray-900" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Add Teacher</h1>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Search Input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-900">
            <Search className="w-5 h-5 text-gray-600" />
            <Input
              type="text"
              placeholder="@name"
              value={mentorLogin}
              onChange={(e) => setMentorLogin(e.target.value)}
              onKeyPress={handleKeyPress}
              className="border-0 outline-none focus-visible:ring-0 text-base placeholder-gray-400 p-0 h-auto"
            />
          </div>
        </div>

        {/* Add Button */}
        <div className="pt-4">
          <Button
            onClick={handleAdd}
            disabled={!mentorLogin.trim() || isLoading}
            className="w-full bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 text-white font-bold py-6 rounded-2xl text-lg"
          >
            {isLoading ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </div>
    </div>
  );
}
