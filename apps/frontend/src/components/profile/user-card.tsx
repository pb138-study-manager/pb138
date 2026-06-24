import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowUp, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import AvatarUploadDialog from './avatar-upload-dialog';

const schema = z.object({
  name: z.string(),
  title: z.string(),
  bio: z.string(),
});

type ProfileForm = z.infer<typeof schema>;

interface UserCardProps {
  login: string;
  name: string | null;
  title?: string | null;
  bio?: string | null;
  email: string;
  avatar?: string | null;
  onProfileUpdated?: (updated: {
    name: string | null;
    title: string | null;
    bio: string | null;
  }) => Promise<void>;
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
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  const avatarSrc = avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${login}`;

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: name ?? '', title: title ?? '', bio: bio ?? '' },
  });

  useEffect(() => {
    if (editOpen) {
      reset({ name: name ?? '', title: title ?? '', bio: bio ?? '' });
    }
  }, [editOpen, name, title, bio, reset]);

  async function onFormSubmit(data: ProfileForm) {
    if (!onProfileUpdated) return;
    await onProfileUpdated({
      name: data.name.trim() || null,
      title: data.title.trim() || null,
      bio: data.bio.trim() || null,
    });
    setEditOpen(false);
  }

  return (
    <>
      <Card className="border-0 rounded-3xl shadow-md dark:bg-gray-800 transition-colors">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 w-full">
            <button
              className="relative shrink-0 group"
              onClick={() => onAvatarUploaded && setAvatarDialogOpen(true)}
              disabled={!onAvatarUploaded}
            >
              <img
                src={avatarSrc}
                alt={name || login}
                className="w-16 h-16 rounded-full object-cover"
              />
              {onAvatarUploaded && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={16} className="text-white" />
                </div>
              )}
            </button>

            <button className="flex-1 min-w-0 text-left" onClick={() => setEditOpen(true)}>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{name || login}</h2>
              {title && (
                <p className="text-sm text-indigo-500 dark:text-indigo-400 font-medium mt-0.5">
                  {title}
                </p>
              )}
              <p className="text-gray-600 dark:text-gray-300 text-sm">{email}</p>
              {bio && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed line-clamp-2">
                  {bio}
                </p>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl"
        >
          <form onSubmit={handleSubmit(onFormSubmit)}>
            <div className="px-5 pt-5 pb-3 space-y-3">
              <input
                type="text"
                {...register('name')}
                className="w-full border-none text-lg font-semibold bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                placeholder={t('profile.namePlaceholder', 'Your name...')}
                autoFocus
              />
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800" />

            <div className="px-5 py-3 space-y-3">
              <input
                type="text"
                {...register('title')}
                className="w-full text-sm bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none border-b border-gray-100 dark:border-gray-700 pb-2"
                placeholder={t('profile.titlePlaceholder', 'Title / role...')}
              />
              <textarea
                rows={3}
                {...register('bio')}
                className="w-full text-sm bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none resize-none"
                placeholder={t('profile.bioPlaceholder', 'Short bio...')}
              />
            </div>

            <div className="flex justify-end px-5 py-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 disabled:opacity-40 transition-colors"
              >
                <ArrowUp size={16} />
              </button>
            </div>
          </form>
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
