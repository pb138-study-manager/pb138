import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronUp, ChevronDown, ChevronLeft, Lock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useCustomNavManager } from '@/hooks/useCustomNavManager';

export const Route = createFileRoute('/custom-nav')({
  component: CustomNavPage,
});

function CustomNavPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedIds, displayItems, loading, saving, toggleItem, moveUp, moveDown, saveSettings } =
    useCustomNavManager();

  const handleSave = async () => {
    const success = await saveSettings();
    if (success) {
      navigate({ to: '/profile' });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 flex flex-col w-full">
      <div className="flex items-center px-4 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/profile' })}
          className="-ml-2 mr-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Customize Nav</h1>
        <div className="flex-1" />
        <Button
          onClick={handleSave}
          disabled={saving || selectedIds.length === 0}
          className="rounded-full px-5 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="p-4 space-y-6 max-w-md mx-auto w-full mt-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 px-2 text-center">
          Select up to 5 items to display in your mobile bottom navigation. Use the arrows to
          reorder them.
        </div>

        <Card className="border-0 shadow-md rounded-3xl overflow-hidden dark:bg-gray-800 transition-colors">
          <CardContent className="p-0 divide-y divide-gray-200 dark:divide-gray-700">
            {displayItems.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const selectedIndex = selectedIds.indexOf(item.id);
              const isOthers = item.id === 'others';

              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center justify-between p-4 bg-white dark:bg-gray-800',
                    isOthers && 'opacity-60 bg-gray-50 dark:bg-gray-800/50'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleItem(item.id)}
                      disabled={isOthers || (!isSelected && selectedIds.length >= 5)}
                      className="w-5 h-5 rounded-md border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <span
                      className={cn(
                        'font-medium transition-colors',
                        isSelected
                          ? 'text-gray-900 dark:text-gray-100'
                          : 'text-gray-400 dark:text-gray-500'
                      )}
                    >
                      {item.label.includes('.') ? t(item.label) : item.label}
                    </span>
                  </div>

                  {isSelected && !isOthers && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        onClick={() => moveUp(selectedIndex)}
                        disabled={selectedIndex === 0}
                      >
                        <ChevronUp className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        onClick={() => moveDown(selectedIndex)}
                        disabled={selectedIndex === selectedIds.length - 1}
                      >
                        <ChevronDown className="w-5 h-5" />
                      </Button>
                    </div>
                  )}
                  {isOthers && <Lock className="w-4 h-4 text-gray-400 mr-2" />}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
