import { useState } from 'react';
import { FileText, Plus, MoreVertical, Pencil, Trash2, Check, X } from 'lucide-react';
import { NoteModel } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import DeleteNoteDialog from '@/components/notes/delete-note-dialog';

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

  async function handleSave(id: number) {
    if (!editTitle.trim()) return;
    setIsSaving(true);
    try {
      if (onRenameNote) {
        await onRenameNote(id, editTitle.trim());
      } else {
        console.error('onRenameNote prop is missing in index.tsx!');
      }
      setEditingId(null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <div
          key={note.id}
          className="flex items-center w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {editingId === note.id ? (
            <div className="flex items-center gap-3 w-full p-4">
              <FileText size={18} className="text-yellow-600 flex-shrink-0" />
              <input
                autoFocus
                className="flex-1 border-b border-yellow-500 focus:outline-none bg-transparent text-gray-900 dark:text-white"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave(note.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                disabled={isSaving}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-green-600 hover:text-green-700"
                onClick={() => handleSave(note.id)}
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
                onClick={() => onOpenNote(note.id)}
                className="flex-1 flex items-center gap-3 p-4 text-left min-w-0"
              >
                <FileText size={18} className="text-yellow-600 flex-shrink-0" />
                <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                  {note.title}
                </span>
              </button>
              <div className="pr-2 flex items-center">
                <Popover>
                  <PopoverTrigger>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
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
                      Rename
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setNoteToDelete(note.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </div>
      ))}

      <button
        onClick={onAddNote}
        className="w-full bg-black dark:bg-gray-100 text-white dark:text-black rounded-xl p-3 flex items-center justify-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-300 transition-colors"
      >
        <Plus size={18} /> Add note
      </button>

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
