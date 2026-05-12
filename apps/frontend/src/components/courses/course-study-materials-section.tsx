import { BookMarked, ExternalLink, Plus } from 'lucide-react';
import type { CourseStudyMaterial } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type CourseStudyMaterialsSectionProps = {
  materials: CourseStudyMaterial[];
  isMentorView: boolean;
  onAddClick: () => void;
};

export function CourseStudyMaterialsSection({
  materials,
  isMentorView,
  onAddClick,
}: CourseStudyMaterialsSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded bg-amber-100 p-1">
            <BookMarked className="size-4 text-amber-700" />
          </div>
          <h2 className="font-bold text-gray-900">Study materials</h2>
          <span className="font-normal text-gray-400">{materials.length}</span>
        </div>
        {isMentorView && (
          <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={onAddClick}>
            <Plus className="size-5 text-gray-900" />
          </Button>
        )}
      </div>
      <p className="text-xs text-gray-500">
        {isMentorView
          ? 'As a teacher you can add materials visible to everyone enrolled in the course.'
          : 'Materials provided by the course instructor.'}
      </p>
      <div className="space-y-3">
        {materials.length === 0 ? (
          <Card className="rounded-2xl border-gray-100 shadow-sm">
            <CardContent className="p-4 text-sm text-gray-500">No materials yet.</CardContent>
          </Card>
        ) : (
          materials.map((m) => (
            <Card key={m.id} className="rounded-2xl border-gray-100 shadow-sm">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900">{m.title}</p>
                  {m.url && (
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      <ExternalLink className="size-3" />
                      link
                    </Badge>
                  )}
                </div>
                {m.description && <p className="text-sm text-gray-600">{m.description}</p>}
                {m.url && (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
                  >
                    Open material
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}
