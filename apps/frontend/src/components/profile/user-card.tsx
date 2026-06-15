import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';

interface UserCardProps {
  login: string;
  name: string | null;
  title?: string | null;
  bio?: string | null;
  email: string;
  onProfileUpdated?: (updated: { name: string | null; title: string | null; bio: string | null }) => void;
}

export default function UserCard({ login, name, title, bio, email, onProfileUpdated }: UserCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: name ?? '', title: title ?? '', bio: bio ?? '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.patch('/users/me/profile', {
        name: form.name || null,
        title: form.title || null,
        bio: form.bio || null,
      });
      onProfileUpdated?.({ name: form.name || null, title: form.title || null, bio: form.bio || null });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ name: name ?? '', title: title ?? '', bio: bio ?? '' });
    setIsEditing(false);
  };

  return (
    <Card className="border-0 rounded-3xl shadow-md dark:bg-gray-800 transition-colors">
      <CardContent className="p-6">
        {!isEditing ? (
          <div className="flex items-start gap-4">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${login}`}
              alt={name || login}
              className="w-16 h-16 rounded-full object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{name || login}</h2>
              {title && (
                <p className="text-sm text-indigo-500 dark:text-indigo-400 font-medium mt-0.5">{title}</p>
              )}
              <p className="text-gray-600 dark:text-gray-300">{email}</p>
              {bio && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{bio}</p>
              )}
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="shrink-0 text-sm text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-lg px-3 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Computer Science student"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Bio
              </label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="A short bio about yourself"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
