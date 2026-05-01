import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { NoteModel } from '@/types/index';
import { Button } from '@/components/ui/button';
import DeleteNoteDialog from '@/components/notes/delete-note-dialog';

interface NoteDetailViewProps {
  note: NoteModel;
  autoEdit?: boolean;
  onSave: (id: number, title: string, description: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function NoteDetailView({ note, autoEdit, onSave, onDelete }: NoteDetailViewProps) {
  const [isEditing, setIsEditing] = useState(autoEdit || false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      await onSave(note.id, title.trim(), content);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await onDelete(note.id);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col min-h-[50vh] h-full">
      <div className="flex justify-between items-center mb-4 border-b pb-3 gap-4">
        {isEditing ? (
          <input
            className="text-xl font-bold flex-1 border rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-50"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            autoFocus
          />
        ) : (
          <h2 className="text-xl font-bold truncate flex-1">{note.title}</h2>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isDeleting}
          >
            <Trash2 size={18} />
          </Button>
          {isEditing ? (
            <Button onClick={handleSave} size="sm" disabled={isSaving || !title.trim()}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              Edit
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <textarea
          className="flex-1 w-full p-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-50"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing your note..."
        />
      ) : (
        <p className="text-gray-600 whitespace-pre-wrap flex-1">{note.description || 'Empty...'}</p>
      )}

      <DeleteNoteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
