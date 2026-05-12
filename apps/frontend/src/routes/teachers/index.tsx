import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Plus } from 'lucide-react';
import { type Mentor } from '@/types/index';

export const Route = createFileRoute('/teachers/')({
  component: TeachersPage,
});

const mockMentors: Mentor[] = [
  {
    id: 1,
    name: "Mentor's name",
    code: 'CODE123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor1',
  },
  {
    id: 2,
    name: "Mentor's name",
    code: 'CODE123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor2',
  },
  {
    id: 3,
    name: "Mentor's name",
    code: 'CODE123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor3',
  },
  {
    id: 4,
    name: "Mentor's name",
    code: 'CODE123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor4',
  },
  {
    id: 5,
    name: "Mentor's name",
    code: 'CODE123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor5',
  },
  {
    id: 6,
    name: "Mentor's name",
    code: 'CODE123',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor6',
  },
];

function TeachersPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate({ to: '/profile' });
  };

  const handleAddTeacher = () => {
    navigate({ to: '/teachers/new' });
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack} className="p-0 h-auto w-auto">
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAddTeacher}
          className="p-0 h-auto w-auto"
        >
          <Plus className="w-6 h-6 text-gray-900" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-3">
        {mockMentors.map((mentor) => (
          <Card key={mentor.id} className="border-0 rounded-2xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <img
                  src={mentor.avatarUrl}
                  alt={mentor.name}
                  className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900">{mentor.name}</h3>
                </div>
                <Badge variant="secondary" className="ml-2 flex-shrink-0">
                  {mentor.code}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
