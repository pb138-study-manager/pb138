import { Card, CardContent } from '@/components/ui/card';

interface UserCardProps {
  login: string;
  name: string | null;
  email: string;
}

export default function UserCard({ login, name, email }: UserCardProps) {
  return (
    <Card className="border-0 rounded-3xl shadow-md dark:bg-gray-800 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${login}`}
            alt={name || login}
            className="w-16 h-16 rounded-full object-cover"
          />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{name || login}</h2>
            <p className="text-gray-600 dark:text-gray-300">{email}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
