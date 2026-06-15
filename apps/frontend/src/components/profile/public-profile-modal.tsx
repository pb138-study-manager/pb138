import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import type { PublicProfile } from '@/types';

interface PublicProfileModalProps {
  userId: number | null;
  onClose: () => void;
}

export function PublicProfileModal({ userId, onClose }: PublicProfileModalProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api
      .get<PublicProfile>(`/users/${userId}`)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <Dialog open={userId !== null} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>
        {loading && (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        )}
        {profile && !loading && (
          <div className="flex flex-col items-center gap-4 py-4">
            <Avatar src={profile.avatar} name={profile.name ?? profile.login} size="lg" />
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {profile.name ?? profile.login}
              </p>
              {profile.title && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{profile.title}</p>
              )}
              {profile.organization && (
                <p className="text-xs text-gray-400 dark:text-gray-500">{profile.organization}</p>
              )}
            </div>
            {profile.bio && (
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                {profile.bio}
              </p>
            )}
          </div>
        )}
        {!profile && !loading && (
          <p className="text-sm text-gray-400 text-center py-8">Profile not found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
