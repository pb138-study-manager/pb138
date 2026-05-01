import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

export default function SubtasksDialog({
  isOpen,
  onOpenChange,
  subtasks,
  onSubtasksChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  subtasks: string[];
  onSubtasksChange: (subtasks: string[]) => void;
}) {
  const [newSubtask, setNewSubtask] = useState('');

  const handleAdd = () => {
    if (newSubtask.trim()) {
      onSubtasksChange([...subtasks, newSubtask.trim()]);
      setNewSubtask('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index: number) => {
    onSubtasksChange(subtasks.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Subtasks</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a subtask..."
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button onClick={handleAdd} size="icon" variant="outline" className="flex-shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {subtasks.map((subtask, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 border rounded-md bg-muted/20"
              >
                <span className="text-sm truncate mr-2">{subtask}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => handleRemove(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {subtasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No subtasks added yet.</p>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
