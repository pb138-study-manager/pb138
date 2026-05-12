import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Folder, FileText, Home, User, ArrowLeft, Plus } from 'lucide-react';

// -------------------- Types --------------------

type Note = {
  id: string;
  title: string;
  content: string;
};

type FolderType = {
  id: string;
  name: string;
  notes: Note[];
};

// -------------------- Mock Data --------------------

const initialFolders: FolderType[] = [
  {
    id: 'f1',
    name: 'Hello',
    notes: [
      { id: '1', title: 'Hello note', content: 'Hello world content' },
      { id: '2', title: 'Second note', content: 'More text here' },
    ],
  },
  {
    id: 'f2',
    name: 'Nice',
    notes: [{ id: '3', title: 'Nice note', content: 'Some nice content' }],
  },
];

// -------------------- Route --------------------

export const Route = createFileRoute('/notes/')({
  component: NotesApp,
});

// -------------------- App --------------------

function NotesApp() {
  const [folders, setFolders] = useState<FolderType[]>(initialFolders);

  const [activeFolderId, setActiveFolderId] = useState<string>('f1');
  const [view, setView] = useState<'notes' | 'folder' | 'detail'>('notes');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const activeFolder = folders.find(f => f.id === activeFolderId);

  const selectedNote =
    activeFolder?.notes.find(n => n.id === selectedNoteId) ?? null;

  // -------------------- Actions --------------------

  function openFolder(folderId: string) {
    setActiveFolderId(folderId);
    setView('folder');
  }

  function openNote(noteId: string) {
    setSelectedNoteId(noteId);
    setView('detail');
  }

  function goBack() {
    if (view === 'detail') setView('folder');
    else setView('notes');
  }

  function addFolder() {
    const newFolder: FolderType = {
      id: crypto.randomUUID(),
      name: 'New Folder',
      notes: [],
    };

    setFolders(prev => [newFolder, ...prev]);
    setActiveFolderId(newFolder.id);
    setView('folder');
  }

  function addNote() {
    if (!activeFolder) return;

    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'New Note',
      content: 'Empty...',
    };

    setFolders(prev =>
      prev.map(folder =>
        folder.id === activeFolderId
          ? { ...folder, notes: [newNote, ...folder.notes] }
          : folder
      )
    );

    setSelectedNoteId(newNote.id);
    setView('detail');
  }

  // -------------------- UI --------------------

  return (
    <div className="h-screen w-full bg-gray-100 flex flex-col">
      {/* Top bar */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
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
        {/* FOLDERS VIEW */}
        {view === 'notes' && (
          <div className="space-y-3">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => openFolder(folder.id)}
                className="w-full bg-white rounded-xl p-4 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Folder size={18} />
                  <span>{folder.name}</span>
                </div>
              </button>
            ))}

            {/* ADD FOLDER BUTTON */}
            <button
              onClick={addFolder}
              className="w-full bg-black text-white rounded-xl p-3 flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Add folder
            </button>
          </div>
        )}

        {/* NOTES VIEW */}
        {view === 'folder' && activeFolder && (
          <div className="space-y-3">
            {activeFolder.notes.map(note => (
              <button
                key={note.id}
                onClick={() => openNote(note.id)}
                className="w-full bg-white rounded-xl p-4 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} />
                  <span>{note.title}</span>
                </div>
              </button>
            ))}

            <button
              onClick={addNote}
              className="w-full bg-black text-white rounded-xl p-3 flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Add note
            </button>
          </div>
        )}

        {/* DETAIL VIEW */}
        {view === 'detail' && selectedNote && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-xl font-bold mb-2">
              {selectedNote.title}
            </h2>
            <p className="text-gray-600 whitespace-pre-wrap">
              {selectedNote.content}
            </p>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="bg-white border-t flex justify-around py-2">
        <button className="flex flex-col items-center text-xs">
          <Home size={18} /> Tasks
        </button>
        <button className="flex flex-col items-center text-xs">
          <Folder size={18} /> Today
        </button>
        <button className="flex flex-col items-center text-xs text-blue-600">
          <FileText size={18} /> Notes
        </button>
        <button className="flex flex-col items-center text-xs">
          <User size={18} /> Profile
        </button>
      </div>
    </div>
  );
}