import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import CreateFolderDialog from '@/components/notes/create-folder-dialog';
import CreateNoteDialog from '@/components/notes/create-note-dialog';
import FoldersView from '@/components/notes/folders-view';
import NotesView from '@/components/notes/notes-view';
import NoteDetailView from '@/components/notes/note-detail-view';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNotesManager } from '@/hooks/useNotesManager';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/notes/')({
  validateSearch: (search: Record<string, unknown>): { open?: number } => {
    const raw = search.open;
    const parsed = typeof raw === 'string' ? parseInt(raw, 10) : undefined;
    return parsed && !isNaN(parsed) ? { open: parsed } : {};
  },
  component: NotesPage,
});

function NotesPage() {
  const { t } = useTranslation();
  const { open } = Route.useSearch();
  const {
    folders,
    view,
    isCreateFolderOpen,
    setIsCreateFolderOpen,
    isCreateNoteOpen,
    setIsCreateNoteOpen,
    forceEditNoteId,
    isPending,
    activeFolder,
    activeFolderNotes,
    selectedNote,
    openFolder,
    openNote,
    goBack,
    updateFolder,
    deleteFolder,
    handleCreateFolder,
    handleCreateNote,
    updateNote,
    deleteNote,
  } = useNotesManager();

  useEffect(() => {
    if (open && !isPending) openNote(open);
  }, [open, isPending]);

  useQuery({
    queryKey: ['settings'],
    queryFn: () =>
      api
        .get<{ lightTheme: boolean }>('/users/me/settings')
        .then((settings) => {
          const isDark = !settings.lightTheme;
          document.documentElement.classList.toggle('dark', isDark);
          localStorage.setItem('theme', isDark ? 'dark' : 'light');
          return settings;
        })
        .catch(console.error),
  });

  return (
    <div className="flex-1 w-full bg-white dark:bg-gray-900 flex flex-col transition-colors">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-900 px-6 py-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 transition-colors text-gray-900 dark:text-white sticky top-0 z-10">
        {view !== 'notes' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="-ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300"
          >
            <ArrowLeft size={24} />
          </Button>
        )}

        <h1 className="text-2xl font-bold truncate">
          {view === 'notes' && t('notes.title')}
          {view === 'folder' && activeFolder?.name}
          {view === 'detail' && selectedNote?.title}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {isPending ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-400 dark:text-gray-500">{t('notes.loading')}</p>
          </div>
        ) : (
          <>
            {/* FOLDERS VIEW */}
            {view === 'notes' && (
              <FoldersView
                folders={folders}
                onOpenFolder={openFolder}
                onAddFolder={() => setIsCreateFolderOpen(true)}
                onRenameFolder={updateFolder}
                onDeleteFolder={deleteFolder}
              />
            )}

            {/* NOTES VIEW */}
            {view === 'folder' && activeFolder && (
              <NotesView
                notes={activeFolderNotes}
                onOpenNote={openNote}
                onAddNote={() => setIsCreateNoteOpen(true)}
                onRenameNote={updateNote}
                onDeleteNote={deleteNote}
              />
            )}

            {/* DETAIL VIEW */}
            {view === 'detail' && selectedNote && (
              <NoteDetailView
                key={selectedNote.id}
                note={selectedNote}
                autoEdit={forceEditNoteId === selectedNote.id}
                onSave={updateNote}
                onDelete={deleteNote}
              />
            )}
          </>
        )}
      </div>

      <CreateFolderDialog
        isOpen={isCreateFolderOpen}
        onOpenChange={setIsCreateFolderOpen}
        onSubmit={handleCreateFolder}
      />
      <CreateNoteDialog
        isOpen={isCreateNoteOpen}
        onOpenChange={setIsCreateNoteOpen}
        onSubmit={handleCreateNote}
      />
    </div>
  );
}
