import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FolderModel, NoteModel } from '@/types/index';

export function useNotesManager() {
  const queryClient = useQueryClient();

  const { data: folders = [], isPending: pendingFolders } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.get<FolderModel[]>('/folders').catch(() => []),
  });

  const { data: notes = [], isPending: pendingNotes } = useQuery({
    queryKey: ['notes'],
    queryFn: () => api.get<NoteModel[]>('/notes').catch(() => []),
  });

  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [view, setView] = useState<'notes' | 'folder' | 'detail'>('notes');
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [forceEditNoteId, setForceEditNoteId] = useState<number | null>(null);

  const isPending = pendingFolders || pendingNotes;

  const activeFolder = folders.find((f) => f.id === activeFolderId);
  const activeFolderNotes = notes.filter((n) => n.folderId === activeFolderId);
  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? null;

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
      queryClient.setQueryData<FolderModel[]>(['folders'], (prev = []) =>
        prev.map((f) => (f.id === id ? updated : f))
      );
    } catch (error) {
      console.error('Failed to rename folder:', error);
      throw error;
    }
  }

  async function deleteFolder(id: number) {
    try {
      const notesToDelete = notes.filter((n) => n.folderId === id);
      await Promise.all(notesToDelete.map((n) => api.delete(`/notes/${n.id}`)));
      await api.delete(`/folders/${id}`);
      queryClient.setQueryData<FolderModel[]>(['folders'], (prev = []) =>
        prev.filter((f) => f.id !== id)
      );
      queryClient.setQueryData<NoteModel[]>(['notes'], (prev = []) =>
        prev.filter((n) => n.folderId !== id)
      );
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
      queryClient.setQueryData<FolderModel[]>(['folders'], (prev = []) => [newFolder, ...prev]);
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
      queryClient.setQueryData<NoteModel[]>(['notes'], (prev = []) => [newNote, ...prev]);
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
      queryClient.setQueryData<NoteModel[]>(['notes'], (prev = []) =>
        prev.map((n) => (n.id === id ? updated : n))
      );
    } catch (error) {
      console.error('Failed to save note:', error);
      throw error;
    }
  }

  async function deleteNote(id: number) {
    try {
      await api.delete(`/notes/${id}`);
      queryClient.setQueryData<NoteModel[]>(['notes'], (prev = []) =>
        prev.filter((n) => n.id !== id)
      );
      setView('folder');
      setSelectedNoteId(null);
      setForceEditNoteId(null);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  }

  return {
    folders,
    notes,
    view,
    isPending,
    activeFolder,
    activeFolderNotes,
    selectedNote,
    isCreateFolderOpen,
    setIsCreateFolderOpen,
    isCreateNoteOpen,
    setIsCreateNoteOpen,
    forceEditNoteId,
    openFolder,
    openNote,
    goBack,
    updateFolder,
    deleteFolder,
    handleCreateFolder,
    handleCreateNote,
    updateNote,
    deleteNote,
  };
}