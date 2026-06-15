import { useState } from 'react';
import { FileText, Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { NoteModel } from '@/types/index';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import DeleteNoteDialog from '@/components/notes/delete-note-dialog';
import { useTranslation } from 'react-i18next';
import { ListRow } from '@/components/ui/list-row';

interface NotesViewProps {
  notes: NoteModel[];
  onOpenNote: (id: number) => void;
  onAddNote: () => void;
  onRenameNote: (id: number, newTitle: string) => Promise<void>;
  onDeleteNote: (id: number) => Promise<void>;
}

export default function NotesView({
  notes,
  onOpenNote,
  onAddNote,
  onRenameNote,
  onDeleteNote,
}: NotesViewProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const { t } = useTranslation();

  async function handleSave(id: number) {
    if (!editTitle.trim()) return;
    setIsSaving(true);
    try {
      await onRenameNote(id, editTitle.trim());
      setEditingId(null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Header row with "New note" button */}
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          {t('notes.notes')}
        </span>
        <button
          onClick={onAddNote}
          className="flex items-center gap-1 px-3 py-1 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          {t('notes.addNote')}
        </button>
      </div>

      {notes.map((note) => (
        <div key={note.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
        <ListRow
          icon={<FileText size={18} className="text-yellow-500 dark:text-yellow-400" />}
          title={note.title}
          subtitle={note.tags?.length ? note.tags.map((tag) => `#${tag}`).join(' ') : undefined}
          onClick={() => onOpenNote(note.id)}
          isRenaming={editingId === note.id}
          renameValue={editTitle}
          onRenameChange={setEditTitle}
          onRenameSubmit={() => handleSave(note.id)}
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
                    setEditingId(note.id);
                    setEditTitle(note.title);
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
                    setNoteToDelete(note.id);
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

      <DeleteNoteDialog
        isOpen={noteToDelete !== null}
        onOpenChange={(open) => !open && setNoteToDelete(null)}
        onConfirm={async () => {
          if (noteToDelete !== null && onDeleteNote) {
            await onDeleteNote(noteToDelete);
            setNoteToDelete(null);
          }
        }}
      />
    </div>
  );
}
