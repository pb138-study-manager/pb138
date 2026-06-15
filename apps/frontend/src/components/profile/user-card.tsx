import { useState } from 'react';
import { ArrowUp, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import AvatarUploadDialog from './AvatarUploadDialog';

interface UserCardProps {
  login: string;
  name: string | null;
  title?: string | null;
  bio?: string | null;
  email: string;
  avatar?: string | null;
  onProfileUpdated?: (updated: { name: string | null; title: string | null; bio: string | null }) => Promise<void>;
  onAvatarUploaded?: (file: File) => Promise<void>;
}

export default function UserCard({
  login,
  name,
  title,
  bio,
  email,
  avatar,
  onProfileUpdated,
  onAvatarUploaded,
}: UserCardProps) {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: name ?? '', title: title ?? '', bio: bio ?? '' });
  const [isSaving, setIsSaving] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  const avatarSrc = avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${login}`;

  const handleSave = async () => {
    if (!onProfileUpdated) return;
    setIsSaving(true);
    try {
      await onProfileUpdated({
        name: form.name || null,
        title: form.title || null,
        bio: form.bio || null,
      });
      setEditOpen(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="border-0 rounded-3xl shadow-md dark:bg-gray-800 transition-colors">
        <CardContent className="p-6">
          <button
            className="flex items-start gap-4 w-full text-left group"
            onClick={() => setEditOpen(true)}
          >
            <div className="relative shrink-0">
              <img
                src={avatarSrc}
                alt={name || login}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{name || login}</h2>
              {title && (
                <p className="text-sm text-indigo-500 dark:text-indigo-400 font-medium mt-0.5">{title}</p>
              )}
              <p className="text-gray-600 dark:text-gray-300 text-sm">{email}</p>
              {bio && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed line-clamp-2">{bio}</p>
              )}
            </div>
          </button>

          {onAvatarUploaded && (
            <button
              onClick={() => setAvatarDialogOpen(true)}
              className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-500 transition-colors"
            >
              <Camera size={12} />
              {t('profile.changeAvatar', 'Change avatar')}
            </button>
          )}
        </CardContent>
      </Card>

      {/* Edit profile dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
          }}
        >
          <div className="px-5 pt-5 pb-3 space-y-3">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border-none text-lg font-semibold bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
              placeholder={t('profile.namePlaceholder', 'Your name...')}
              autoFocus
            />
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          <div className="px-5 py-3 space-y-3">
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full text-sm bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none border-b border-gray-100 dark:border-gray-700 pb-2"
              placeholder={t('profile.titlePlaceholder', 'Title / role...')}
            />
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
              className="w-full text-sm bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none resize-none"
              placeholder={t('profile.bioPlaceholder', 'Short bio...')}
            />
          </div>

          <div className="flex justify-end px-5 py-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 disabled:opacity-40 transition-colors"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {onAvatarUploaded && (
        <AvatarUploadDialog
          open={avatarDialogOpen}
          onOpenChange={setAvatarDialogOpen}
          onUpload={onAvatarUploaded}
        />
      )}
    </>
  );
}
