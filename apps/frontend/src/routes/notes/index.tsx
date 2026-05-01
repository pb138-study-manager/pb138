import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { FolderModel, NoteModel } from '@/types/index';
import CreateFolderDialog from '@/components/notes/create-folder-dialog';
import CreateNoteDialog from '@/components/notes/create-note-dialog';
import FoldersView from '@/components/notes/folders-view';
import NotesView from '@/components/notes/notes-view';
import NoteDetailView from '@/components/notes/note-detail-view';

// -------------------- Route --------------------

export const Route = createFileRoute('/notes/')({
  component: NotesPage,
});

// -------------------- App --------------------

function NotesPage() {
  // Synchronously apply theme from local storage to prevent white flash
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }

  const [folders, setFolders] = useState<FolderModel[]>([]);
  const [notes, setNotes] = useState<NoteModel[]>([]);

  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [view, setView] = useState<'notes' | 'folder' | 'detail'>('notes');
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [forceEditNoteId, setForceEditNoteId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    // Apply dark mode based on settings on direct page load
    api
      .get<{ lightTheme: boolean }>('/users/me/settings')
      .then((settings) => {
        const isDark = !settings.lightTheme;
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      })
      .catch(console.error);

    Promise.all([
      api.get<FolderModel[]>('/folders').then(setFolders),
      api.get<NoteModel[]>('/notes').then(setNotes),
    ])
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const activeFolder = folders.find((f) => f.id === activeFolderId);
  const activeFolderNotes = notes.filter((n) => n.folderId === activeFolderId);
  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? null;

  // -------------------- Actions --------------------

  function openFolder(folderId: number) {
    setActiveFolderId(folderId);
    setView('folder');
  }

  function openNote(noteId: number) {
    setSelectedNoteId(noteId);
    setView('detail');
  }

  function goBack() {
    if (view === 'detail') setView('folder');
    else setView('notes');
    setForceEditNoteId(null);
  }

  async function updateFolder(id: number, name: string) {
    try {
      const updated = await api.patch<FolderModel>(`/folders/${id}`, { name });
      setFolders((prev) => prev.map((f) => (f.id === id ? updated : f)));
    } catch (error) {
      console.error('Failed to rename folder:', error);
      throw error;
    }
  }

  async function deleteFolder(id: number) {
    try {
      // Delete all notes within the folder first
      const notesToDelete = notes.filter((n) => n.folderId === id);
      await Promise.all(notesToDelete.map((n) => api.delete(`/notes/${n.id}`)));

      // Then delete the folder
      await api.delete(`/folders/${id}`);
      setFolders((prev) => prev.filter((f) => f.id !== id));
      setNotes((prev) => prev.filter((n) => n.folderId !== id)); // Remove locally
      if (activeFolderId === id) {
        setView('notes');
        setActiveFolderId(null);
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
      throw error;
    }
  }

  async function handleCreateFolder(name: string) {
    try {
      const newFolder = await api.post<FolderModel>('/folders', { name });
      setFolders((prev) => [newFolder, ...prev]);
      setActiveFolderId(newFolder.id);
      setView('folder');
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  }

  async function handleCreateNote(title: string) {
    if (!activeFolder) return;

    try {
      const newNote = await api.post<NoteModel>('/notes', {
        title,
        description: '',
        folderId: activeFolder.id,
      });
      setNotes((prev) => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);
      setForceEditNoteId(newNote.id);
      setView('detail');
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
    }
  }

  async function updateNote(id: number, title: string, description?: string) {
    try {
      const payload: Partial<NoteModel> = { title };
      if (description !== undefined) {
        payload.description = description;
      }
      const updated = await api.patch<NoteModel>(`/notes/${id}`, payload);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch (error) {
      console.error('Failed to save note:', error);
      throw error;
    }
  }

  async function deleteNote(id: number) {
    try {
      await api.delete(`/notes/${id}`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setView('folder');
      setSelectedNoteId(null);
      setForceEditNoteId(null);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  }

  // -------------------- UI --------------------

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
          {view === 'notes' && 'Notes'}
          {view === 'folder' && activeFolder?.name}
          {view === 'detail' && selectedNote?.title}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-400 dark:text-gray-500">Loading notes...</p>
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
