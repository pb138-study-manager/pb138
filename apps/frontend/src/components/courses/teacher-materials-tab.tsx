import { useRef, useState } from 'react';
import { Plus, BookOpen, Trash2, Link2, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';

export interface StudyMaterial {
  id: number;
  title: string;
  url: string | null;
  storagePath: string | null;
  description: string | null;
}

type AddMode = 'link' | 'file';

export default function TeacherMaterialsTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: materials = [] } = useQuery({
    queryKey: ['courseMaterials', courseId],
    queryFn: () => api.get<StudyMaterial[]>(`/courses/${courseId}/materials`).catch(() => []),
  });

  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('link');
  const [matTitle, setMatTitle] = useState('');
  const [matUrl, setMatUrl] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function resetDialog() {
    setMatTitle('');
    setMatUrl('');
    setMatDesc('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const addLinkMutation = useMutation({
    mutationFn: (data: { title: string; url?: string; description?: string }) =>
      api.post(`/courses/${courseId}/materials`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseMaterials', courseId] });
      resetDialog();
      setShowAddMaterial(false);
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: ({ title, file, description }: { title: string; file: File; description?: string }) => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('file', file);
      if (description) formData.append('description', description);
      return api.upload(`/courses/${courseId}/materials/upload`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseMaterials', courseId] });
      resetDialog();
      setShowAddMaterial(false);
    },
  });

  function handleAdd() {
    const title = matTitle.trim();
    if (!title) return;
    if (addMode === 'link') {
      addLinkMutation.mutate({ title, url: matUrl.trim() || undefined, description: matDesc.trim() || undefined });
    } else {
      if (!selectedFile) return;
      uploadFileMutation.mutate({ title, file: selectedFile, description: matDesc.trim() || undefined });
    }
  }

  const isPending = addLinkMutation.isPending || uploadFileMutation.isPending;
  const canSubmit = matTitle.trim().length > 0 && (addMode === 'link' || selectedFile !== null);

  async function handleDownload(material: StudyMaterial) {
    try {
      const { url } = await api.get<{ url: string }>(`/courses/${courseId}/materials/${material.id}/download`);
      window.open(url, '_blank');
    } catch (e) {
      alert(`Could not open file: ${(e as Error)?.message ?? 'Unknown error'}`);
    }
  }

  const deleteMaterialMutation = useMutation({
    mutationFn: (materialId: number) => api.delete(`/courses/${courseId}/materials/${materialId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courseMaterials', courseId] }),
  });

  return (
    <div className="px-4 mt-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          <span className="font-semibold text-gray-900 dark:text-white">
            {t('courses.materials', 'Study Materials')}
          </span>
          <span className="text-gray-400 text-sm">{materials.length}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setShowAddMaterial(true)}
        >
          <Plus className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </Button>
      </div>

      {materials.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          {t('courses.noMaterialsTeacher', 'No materials yet')}
        </p>
      ) : (
        <div className="space-y-2">
          {materials.map((material) => (
            <div
              key={material.id}
              onClick={() => {
                if (material.url) window.open(material.url, '_blank');
                else if (material.storagePath) handleDownload(material);
              }}
              className={`flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-md ${material.url || material.storagePath ? 'cursor-pointer active:scale-95 transition' : ''}`}
            >
              {material.storagePath ? (
                <FileUp className="w-4 h-4 text-indigo-400 shrink-0" />
              ) : (
                <Link2 className="w-4 h-4 text-indigo-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {material.title}
                </p>
                {material.description && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{material.description}</p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMaterialMutation.mutate(material.id);
                }}
                className="text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 transition-colors p-1 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAddMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {t('courses.addMaterial', 'Add Material')}
            </h2>

            {/* Mode toggle */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 text-sm">
              <button
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${addMode === 'link' ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-medium' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                onClick={() => setAddMode('link')}
              >
                <Link2 className="w-3.5 h-3.5" />
                {t('courses.addViaLink', 'Link')}
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${addMode === 'file' ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-medium' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                onClick={() => setAddMode('file')}
              >
                <FileUp className="w-3.5 h-3.5" />
                {t('courses.addViaFile', 'File')}
              </button>
            </div>

            <input
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder={t('common.title', 'Title')}
              value={matTitle}
              onChange={(e) => setMatTitle(e.target.value)}
              autoFocus
            />

            {addMode === 'link' ? (
              <input
                className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
                placeholder={t('courses.urlOptional', 'URL (optional)')}
                value={matUrl}
                onChange={(e) => setMatUrl(e.target.value)}
              />
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border border-dashed border-gray-300 dark:border-gray-600 rounded-xl px-3 py-3 text-sm text-left transition-colors hover:border-indigo-400 dark:hover:border-indigo-500"
                >
                  <span className={selectedFile ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-400'}>
                    {selectedFile ? selectedFile.name : t('courses.chooseFile', 'Choose file…')}
                  </span>
                </button>
              </>
            )}

            <input
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder={t('common.descriptionOptional', 'Description (optional)')}
              value={matDesc}
              onChange={(e) => setMatDesc(e.target.value)}
            />

            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => { setShowAddMaterial(false); resetDialog(); }}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                className="flex-1"
                onClick={handleAdd}
                disabled={isPending || !canSubmit}
              >
                {isPending
                  ? (addMode === 'file' ? t('courses.uploading', 'Uploading…') : t('common.saving', 'Saving…'))
                  : t('common.add', 'Add')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
