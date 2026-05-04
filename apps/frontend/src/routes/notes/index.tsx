import { createFileRoute } from '@tanstack/react-router';
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

export const Route = createFileRoute('/notes/')({
  component: NotesPage,
});

function NotesPage() {
  const { t } = useTranslation();
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
    <div className="flex-1 w-full bg-gray-100 dark:bg-gray-900 flex flex-col transition-colors">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center gap-3 shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors text-gray-900 dark:text-white">
        {view !== 'notes' && (
          <button onClick={goBack}>
            <ArrowLeft size={20} />
          </button>
        )}

        <h1 className="text-lg font-semibold">
          {view === 'notes' && t('notes.title')}
          {view === 'folder' && activeFolder?.name}
          {view === 'detail' && selectedNote?.title}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
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
