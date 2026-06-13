import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import CreateNoteDialog from '@/components/notes/create-note-dialog';

export interface CourseNote {
  id: number;
  title: string;
  courseId: number | null;
  folderId: number | null;
}

export default function StudentNotesTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNewNote, setShowNewNote] = useState(false);

  const { data: allNotes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: () => api.get<CourseNote[]>('/notes').catch(() => []),
  });

  const notes = allNotes.filter((n) => n.courseId === Number(courseId));

  const createNoteMutation = useMutation({
    mutationFn: (title: string) =>
      api.post('/notes', { title, description: '', courseId: Number(courseId) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  async function handleCreateNote(title: string) {
    createNoteMutation.mutate(title);
  }

  return (
    <div className="px-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold text-gray-900 dark:text-white">
            {t('notes.title', 'Notes')}
          </span>
          <span className="text-gray-400 text-sm">{notes.length}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setShowNewNote(true)}
        >
          <Plus className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </Button>
      </div>

      {notes.length === 0 && (
        <p className="text-sm text-gray-400 py-4 text-center">
          {t('courses.noNotes', 'No notes for this course')}
        </p>
      )}

      {notes.length > 0 && (
        <div className="space-y-2 mb-3">
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => navigate({ to: '/notes', search: { open: note.id } })}
              className="w-full text-left flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white">{note.title}</p>
            </button>
          ))}
        </div>
      )}

      <CreateNoteDialog
        isOpen={showNewNote}
        onOpenChange={setShowNewNote}
        onSubmit={handleCreateNote}
      />
    </div>
  );
}
