import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Palette, Globe, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { type User } from '@/types/index';
import BottomNav from '@/components/ui/bottom-nav';

export const Route = createFileRoute('/profile/')({
  component: ProfilePage,
});

const user: User = {
  id: 1,
  login: 'johndoe',
  email: 'john@example.com',
  name: 'John Doe',
  roles: ['USER'],
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=johndoe',
};

function ProfilePage() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleLogout = () => {
    // TODO: Logout logic
    console.log('Logging out...');
  };

  const handleTeachersClick = () => {
    navigate({ to: '/teachers' });
  };

  return (
    <div className="overflow-y-auto bg-white">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-4">
        {/* User Card */}
        <Card className="border-0 rounded-3xl shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card className="border-0 rounded-3xl shadow-md">
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {/* Theme */}
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-600 font-medium">Theme</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <button className="flex items-center gap-2 text-gray-600 cursor-pointer text-sm">
                      {theme === 'light' ? 'Light' : 'Dark'}
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Language */}
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-600 font-medium">Language</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <button className="flex items-center gap-2 text-gray-600 cursor-pointer text-sm">
                      {language === 'en' ? 'English' : 'Čeština'}
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setLanguage('en')}>English</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLanguage('cs')}>Čeština</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-600 font-medium">Notifications</span>
                </div>
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationsEnabled ? 'bg-gray-400' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationsEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Integrations */}
              <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <Plus className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-600 font-medium">Integrations</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Teachers */}
              <button
                onClick={handleTeachersClick}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border-2 border-gray-600 flex items-center justify-center gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-gray-600" />
                    <div className="w-1 h-1 rounded-full bg-gray-600" />
                    <div className="w-1 h-1 rounded-full bg-gray-600" />
                    <div className="w-1 h-1 rounded-full bg-gray-600" />
                  </div>
                  <span className="text-gray-600 font-medium">Teachers</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Log Out Button */}
        <Button
          onClick={handleLogout}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-6 rounded-2xl text-lg"
        >
          Log Out
        </Button>
      </div>
      <BottomNav active="profile" />
    </div>
  );
}
