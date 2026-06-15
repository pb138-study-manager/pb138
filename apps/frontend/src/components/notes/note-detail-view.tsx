import { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, BrainCircuit, Sparkles, X as XIcon } from 'lucide-react';
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingBody, setIsEditingBody] = useState(autoEdit || false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.description || '');
  const [tags, setTags] = useState<string[]>(note.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const [linkedCourseId, setLinkedCourseId] = useState<number | null>(note.courseId ?? null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSavingRef = useRef(false);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { words } = getReadingStats(content);

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

  // Auto-focus textarea only when body editing starts
  useEffect(() => {
    if (isEditingBody) textareaRef.current?.focus();
  }, [isEditingBody]);

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.get<Course[]>('/courses').catch(() => []),
  });

  const currentCourse = courses.find((c) => c.id === linkedCourseId);

  const handleAutoSave = useCallback(async () => {
    if (isSavingRef.current) return;
    if (!title.trim()) return;
    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await onSave(note.id, title.trim(), content);
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
      setLinkedCourseId(courseId);
    } catch (err) {
      console.error('Failed to link course', err);
    } finally {
      setCourseDropdownOpen(false);
    }
  }

  async function handleAddTag(tag: string) {
    const trimmed = tag.trim().replace(/^#/, '');
    if (!trimmed || tags.includes(trimmed)) return;
    const next = [...tags, trimmed];
    setTags(next);
    setTagInput('');
    try {
      await api.patch(`/notes/${note.id}`, { tags: next });
      queryClient.setQueryData<NoteModel[]>(['notes'], (prev = []) =>
        prev.map((n) => (n.id === note.id ? { ...n, tags: next } : n))
      );
    } catch (err) {
      console.error('Failed to update tags', err);
    }
  }

  async function handleRemoveTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    try {
      await api.patch(`/notes/${note.id}`, { tags: next });
      queryClient.setQueryData<NoteModel[]>(['notes'], (prev = []) =>
        prev.map((n) => (n.id === note.id ? { ...n, tags: next } : n))
      );
    } catch (err) {
      console.error('Failed to update tags', err);
    }
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingBody(false);
      handleAutoSave();
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex flex-col min-h-[50vh] h-full transition-colors">
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-3 border-b dark:border-gray-700 pb-3 gap-4">
        {isEditingTitle ? (
          <input
            autoFocus
            className="text-xl font-bold flex-1 border dark:border-gray-600 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('dialog.noteTitle')}
            onBlur={() => {
              setIsEditingTitle(false);
              handleAutoSave();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                setIsEditingTitle(false);
                handleAutoSave();
              }
            }}
          />
        ) : (
          <h2
            className="text-xl font-bold truncate flex-1 text-gray-900 dark:text-white cursor-text"
            onClick={() => setIsEditingTitle(true)}
          >
            {title}
          </h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
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
          {isSaving && <span className="text-indigo-400">{t('notes.saving')}</span>}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Course badge */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setCourseDropdownOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                currentCourse
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700'
                  : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
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
                      linkedCourseId === c.id
                        ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {linkedCourseId === c.id && <span>✓</span>}
                    {linkedCourseId !== c.id && <span className="inline-block w-4" />}
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

          <button
            onClick={() => setQuizOpen(true)}
            disabled={words < 20}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BrainCircuit size={14} />
            {t('notes.quizMe')}
          </button>
          <button
            onClick={() => setAiChatOpen(true)}
            disabled={words < 5}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-medium transition-colors bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles size={14} />
            {t('notes.askAI')}
          </button>
        </div>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap items-center gap-1 mb-3">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => handleRemoveTag(tag)}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors border border-gray-200 dark:border-gray-700"
          >
            #{tag}
            <XIcon size={9} />
          </button>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              handleAddTag(tagInput);
            }
          }}
          placeholder="+ tag"
          className="text-xs px-2 py-0.5 rounded-full bg-transparent text-gray-400 dark:text-gray-500 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:text-gray-700 dark:focus:text-gray-300 w-12 focus:w-24 transition-all"
        />
      </div>

      {/* Content */}
      {isEditingBody ? (
        <>
          {/* Markdown hint bar */}
          <div className="flex gap-3 px-2 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-t-lg border border-b-0 border-gray-200 dark:border-gray-600 text-xs text-gray-400 font-mono overflow-x-auto whitespace-nowrap">
            <span>{t('notes.mdBold')}</span>
            <span>{t('notes.mdItalic')}</span>
            <span>{t('notes.mdHeading')}</span>
            <span>{t('notes.mdList')}</span>
            <span>{t('notes.mdCode')}</span>
            <span className="ml-auto text-indigo-400 font-sans font-medium">{t('notes.escToSave')}</span>
          </div>
          <textarea
            ref={textareaRef}
            className="flex-1 w-full p-3 border dark:border-gray-600 rounded-b-lg resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => {
              setIsEditingBody(false);
              handleAutoSave();
            }}
            onKeyDown={handleTextareaKeyDown}
            placeholder={t('notes.startWriting')}
          />
        </>
      ) : (
        <div
          className="flex-1 cursor-text rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors p-2 -mx-2"
          onClick={() => setIsEditingBody(true)}
          title={t('notes.clickToEdit')}
        >
          {content ? (
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm space-y-1.5">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-bold mt-3 mb-1 text-gray-900 dark:text-white">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-1 text-gray-900 dark:text-white">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1 text-gray-800 dark:text-gray-100">{children}</h3>,
                  p: ({ children }) => <p className="mb-1.5 leading-relaxed">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ children }) => <code className="bg-gray-100 dark:bg-gray-700 rounded px-1 text-xs font-mono">{children}</code>,
                  ul: ({ children }) => <ul className="list-disc pl-5 mb-1.5 space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 mb-1.5 space-y-0.5">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-3 italic text-gray-500 dark:text-gray-400 my-2">{children}</blockquote>,
                }}
              >
                {content}
              </ReactMarkdown>
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
