import { useState } from 'react';
import { Folder, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { FolderModel } from '@/types/index';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import DeleteFolderDialog from '@/components/notes/delete-folder-dialog';
import { useTranslation } from 'react-i18next';
import { ListRow } from '@/components/ui/list-row';

interface FoldersViewProps {
  folders: FolderModel[];
  onOpenFolder: (id: number) => void;
  onRenameFolder: (id: number, newName: string) => Promise<void>;
  onDeleteFolder: (id: number) => Promise<void>;
}

export default function FoldersView({
  folders,
  onOpenFolder,
  onRenameFolder,
  onDeleteFolder,
}: FoldersViewProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<number | null>(null);
  const { t } = useTranslation();

  async function handleSave(id: number) {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      await onRenameFolder(id, editName.trim());
      setEditingId(null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
        >
          <ListRow
            icon={<Folder size={18} className="text-blue-500 dark:text-blue-400" />}
            title={folder.name}
            subtitle={
              folder.tags?.length ? folder.tags.map((tag) => `#${tag}`).join(' ') : undefined
            }
            onClick={() => onOpenFolder(folder.id)}
            isRenaming={editingId === folder.id}
            renameValue={editName}
            onRenameChange={setEditName}
            onRenameSubmit={() => handleSave(folder.id)}
            onRenameCancel={() => setEditingId(null)}
            trailing={
              <Popover>
                <PopoverTrigger
                  disabled={isSaving}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </PopoverTrigger>
                <PopoverContent className="w-32 p-1" align="end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start dark:text-gray-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(folder.id);
                      setEditName(folder.name);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    {t('notes.rename')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFolderToDelete(folder.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('notes.delete')}
                  </Button>
                </PopoverContent>
              </Popover>
            }
          />
        </div>
      ))}

      <DeleteFolderDialog
        isOpen={folderToDelete !== null}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
        onConfirm={async () => {
          if (folderToDelete !== null && onDeleteFolder) {
            await onDeleteFolder(folderToDelete);
            setFolderToDelete(null);
          }
        }}
      />
    </div>
  );
}
