import { useState } from 'react';
import { Plus, BookOpen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';

export interface StudyMaterial {
  id: number;
  title: string;
  url: string | null;
  description: string | null;
}

export default function TeacherMaterialsTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: materials = [] } = useQuery({
    queryKey: ['courseMaterials', courseId],
    queryFn: () => api.get<StudyMaterial[]>(`/courses/${courseId}/materials`).catch(() => []),
  });

  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [matTitle, setMatTitle] = useState('');
  const [matUrl, setMatUrl] = useState('');
  const [matDesc, setMatDesc] = useState('');

  const addMaterialMutation = useMutation({
    mutationFn: (data: { title: string; url?: string; description?: string }) =>
      api.post(`/courses/${courseId}/materials`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseMaterials', courseId] });
      setMatTitle('');
      setMatUrl('');
      setMatDesc('');
      setShowAddMaterial(false);
    },
  });

  async function handleAddMaterial() {
    if (!matTitle.trim()) return;
    addMaterialMutation.mutate({
      title: matTitle.trim(),
      url: matUrl.trim() || undefined,
      description: matDesc.trim() || undefined,
    });
  }

  const deleteMaterialMutation = useMutation({
    mutationFn: (materialId: number) => api.delete(`/courses/${courseId}/materials/${materialId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courseMaterials', courseId] }),
  });

  async function handleDeleteMaterial(materialId: number) {
    deleteMaterialMutation.mutate(materialId);
  }

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
              onClick={() => material.url && window.open(material.url, '_blank')}
              className={`flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-md ${material.url ? 'cursor-pointer active:scale-95 transition' : ''}`}
            >
              <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
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
                  handleDeleteMaterial(material.id);
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-8">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {t('courses.addMaterial', 'Add Material')}
            </h2>
            <input
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder={t('common.title', 'Title')}
              value={matTitle}
              onChange={(e) => setMatTitle(e.target.value)}
              autoFocus
            />
            <input
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder={t('courses.urlOptional', 'URL (optional)')}
              value={matUrl}
              onChange={(e) => setMatUrl(e.target.value)}
            />
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
                onClick={() => setShowAddMaterial(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddMaterial}
                disabled={addMaterialMutation.isPending || !matTitle.trim()}
              >
                {addMaterialMutation.isPending
                  ? t('common.saving', 'Saving…')
                  : t('common.add', 'Add')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
