import { useState } from 'react';
import { Folder, Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react';
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
  onAddFolder: () => void;
  onRenameFolder: (id: number, newName: string) => Promise<void>;
  onDeleteFolder: (id: number) => Promise<void>;
}

export default function FoldersView({
  folders,
  onOpenFolder,
  onAddFolder,
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
    <div className="space-y-1">
      {/* Header row with "New folder" button */}
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          {t('notes.title')}
        </span>
        <button
          onClick={onAddFolder}
          className="flex items-center gap-1 px-3 py-1 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          {t('notes.addFolder')}
        </button>
      </div>

      {folders.map((folder) => (
        <ListRow
          key={folder.id}
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
