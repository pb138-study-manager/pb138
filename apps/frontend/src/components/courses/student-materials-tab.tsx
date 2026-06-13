import { BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';

export interface StudyMaterial {
  id: number;
  title: string;
  url: string | null;
  description: string | null;
}

export default function StudentMaterialsTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation();

  const { data: materials = [] } = useQuery({
    queryKey: ['courseMaterials', courseId],
    queryFn: () => api.get<StudyMaterial[]>(`/courses/${courseId}/materials`).catch(() => []),
  });

  return (
    <div className="px-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          <span className="font-semibold text-gray-900 dark:text-white">
            {t('courses.materials', 'Study Materials')}
          </span>
          <span className="text-gray-400 text-sm">{materials.length}</span>
        </div>
      </div>
      {materials.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          {t('courses.noMaterials', 'No materials for this course')}
        </p>
      ) : (
        <div className="space-y-2">
          {materials.map((material) => (
            <div
              key={material.id}
              onClick={() => material.url && window.open(material.url, '_blank')}
              className={`flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm ${material.url ? 'cursor-pointer active:scale-95 transition' : ''}`}
            >
              <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {material.title}
                </p>
                {material.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{material.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}