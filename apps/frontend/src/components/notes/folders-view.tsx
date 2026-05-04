import { useState } from 'react';
import { Folder, Plus, MoreVertical, Pencil, Trash2, Check, X } from 'lucide-react';
import { FolderModel } from '@/types/index';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import DeleteFolderDialog from '@/components/notes/delete-folder-dialog';
import { useTranslation } from 'react-i18next';

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
      if (onRenameFolder) {
        await onRenameFolder(id, editName.trim());
      } else {
        console.error('onRenameFolder prop is missing in index.tsx!');
      }
      setEditingId(null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="flex items-center w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {editingId === folder.id ? (
            <div className="flex items-center gap-3 w-full p-4">
              <Folder size={18} className="text-blue-600 flex-shrink-0" />
              <input
                autoFocus
                className="flex-1 border-b border-blue-500 focus:outline-none bg-transparent text-gray-900 dark:text-white"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave(folder.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                disabled={isSaving}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-green-600 hover:text-green-700"
                onClick={() => handleSave(folder.id)}
                disabled={isSaving}
              >
                <Check size={16} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-gray-400 hover:text-gray-600"
                onClick={() => setEditingId(null)}
                disabled={isSaving}
              >
                <X size={16} />
              </Button>
            </div>
          ) : (
            <>
              <button
                onClick={() => onOpenFolder(folder.id)}
                className="flex-1 flex items-center gap-3 p-4 text-left min-w-0"
              >
                <Folder size={18} className="text-blue-600 flex-shrink-0" />
                <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                  {folder.name}
                </span>
              </button>
              <div className="pr-2 flex items-center">
                <Popover>
                  <PopoverTrigger
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'sm' }),
                      'h-8 w-8 p-0 text-gray-400 hover:text-gray-600'
                    )}
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
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setFolderToDelete(folder.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('notes.delete')}
                    </Button>
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </div>
      ))}

      <button
        onClick={onAddFolder}
        className="w-full bg-black dark:bg-gray-100 text-white dark:text-black rounded-xl p-3 flex items-center justify-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors"
      >
        <Plus size={18} /> {t('notes.addFolder')}
      </button>

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
