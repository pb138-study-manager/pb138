import { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, BrainCircuit, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { NoteModel } from '@/types/index';
import { Button } from '@/components/ui/button';
import DeleteNoteDialog from '@/components/notes/delete-note-dialog';
import { useTranslation } from 'react-i18next';
import { QuizModal } from '@/components/notes/QuizModal';
import { NoteAIChat } from '@/components/notes/NoteAIChat';
import { getReadingStats } from '@/lib/note-utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Course {
  id: number;
  code: string;
  name: string | null;
}

interface NoteDetailViewProps {
  note: NoteModel;
  autoEdit?: boolean;
  onSave: (id: number, title: string, description: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function NoteDetailView({
  note,
  autoEdit,
  onSave,
  onDelete,
}: NoteDetailViewProps) {
  const [isEditing, setIsEditing] = useState(autoEdit || false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSavingRef = useRef(false);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { words, minutes } = getReadingStats(content);

  // Close dropdown on outside click
  useEffect(() => {
    if (!courseDropdownOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCourseDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [courseDropdownOpen]);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing) textareaRef.current?.focus();
  }, [isEditing]);

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.get<Course[]>('/courses').catch(() => []),
  });

  const currentCourse = courses.find((c) => c.id === note.courseId);

  const handleAutoSave = useCallback(async () => {
    if (isSavingRef.current) return;
    if (!title.trim()) return;
    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await onSave(note.id, title.trim(), content);
      setIsEditing(false);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [note.id, title, content, onSave]);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await onDelete(note.id);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  }

  async function handleLinkCourse(courseId: number | null) {
    try {
      await api.patch(`/notes/${note.id}`, { courseId });
      queryClient.setQueryData<NoteModel[]>(['notes'], (prev = []) =>
        prev.map((n) => (n.id === note.id ? { ...n, courseId } : n))
      );
    } catch (err) {
      console.error('Failed to link course', err);
    } finally {
      setCourseDropdownOpen(false);
    }
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleAutoSave();
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex flex-col min-h-[50vh] h-full transition-colors">
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-3 border-b dark:border-gray-700 pb-3 gap-4">
        {isEditing ? (
          <input
            className="text-xl font-bold flex-1 border dark:border-gray-600 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('dialog.noteTitle')}
            onBlur={handleAutoSave}
          />
        ) : (
          <h2
            className="text-xl font-bold truncate flex-1 text-gray-900 dark:text-white cursor-text"
            onClick={() => setIsEditing(true)}
          >
            {title}
          </h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setIsDeleteDialogOpen(true)}
          disabled={isDeleting}
        >
          <Trash2 size={18} />
        </Button>
      </div>

      {/* Stats + course badge + AI buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {words} slov · ~{minutes} min čítania
          {isSaving && <span className="ml-2 text-indigo-400">{t('notes.saving')}</span>}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Course badge */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setCourseDropdownOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                currentCourse
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700'
                  : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-300'
              }`}
            >
              <span>📚</span>
              <span>{currentCourse ? currentCourse.code : t('notes.linkCourse')}</span>
              {currentCourse && <span className="text-gray-400">▾</span>}
            </button>
            {courseDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 overflow-hidden">
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b dark:border-gray-700">
                  {t('notes.assignCourse')}
                </div>
                {courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleLinkCourse(c.id)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      note.courseId === c.id
                        ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {note.courseId === c.id && <span>✓</span>}
                    {note.courseId !== c.id && <span className="inline-block w-4" />}
                    {c.code}
                    {c.name ? ` — ${c.name}` : ''}
                  </button>
                ))}
                <button
                  onClick={() => handleLinkCourse(null)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-t dark:border-gray-700 transition-colors"
                >
                  {t('notes.noCourse')}
                </button>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 dark:border-gray-600 dark:text-gray-300"
            onClick={() => setQuizOpen(true)}
            disabled={words < 20}
          >
            <BrainCircuit size={14} />
            Quiz me
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 dark:border-gray-600 dark:text-gray-300"
            onClick={() => setAiChatOpen(true)}
            disabled={words < 5}
          >
            <Sparkles size={14} />
            Ask AI
          </Button>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <>
          {/* Markdown hint bar */}
          <div className="flex gap-3 px-2 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-t-lg border border-b-0 border-gray-200 dark:border-gray-600 text-xs text-gray-400 font-mono overflow-x-auto whitespace-nowrap">
            <span>**tučné**</span>
            <span>*kurzíva*</span>
            <span># Nadpis</span>
            <span>- zoznam</span>
            <span>`kód`</span>
            <span className="ml-auto text-indigo-400 font-sans font-medium">Esc = uložiť</span>
          </div>
          <textarea
            ref={textareaRef}
            className="flex-1 w-full p-3 border dark:border-gray-600 rounded-b-lg resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleAutoSave}
            onKeyDown={handleTextareaKeyDown}
            placeholder={t('notes.startWriting')}
          />
        </>
      ) : (
        <div
          className="flex-1 cursor-text rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors p-2 -mx-2"
          onClick={() => setIsEditing(true)}
          title={t('notes.clickToEdit')}
        >
          {content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed
              prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
              prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:rounded prose-code:px-1 prose-code:text-sm
              prose-pre:bg-gray-100 dark:prose-pre:bg-gray-700 prose-pre:rounded-lg prose-pre:p-3
              prose-ul:pl-4 prose-ol:pl-4">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 italic text-sm">{t('notes.empty')}</p>
          )}
        </div>
      )}

      <DeleteNoteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      <QuizModal
        noteId={note.id}
        noteTitle={note.title}
        isOpen={quizOpen}
        onClose={() => setQuizOpen(false)}
      />

      <NoteAIChat
        noteId={note.id}
        noteTitle={note.title}
        isOpen={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
      />
    </div>
  );
}
