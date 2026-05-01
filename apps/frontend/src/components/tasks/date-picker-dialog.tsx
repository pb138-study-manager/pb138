import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ArrowRight,
  X,
  Clock,
  Timer,
  ChevronDownIcon,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DatePickerDialog({
  isOpen,
  onOpenChange,
  currentDate,
  onDateSelect,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate?: Date | null;
  onDateSelect?: (date: Date | null) => void;
}) {
  const [date, setDate] = useState<Date | null>(new Date(Date.now()));
  const [time, setTime] = useState<string>('08:30:00');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDate(currentDate || null);
      if (currentDate) {
        const d = new Date(currentDate);
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const seconds = d.getSeconds().toString().padStart(2, '0');
        setTime(`${hours}:${minutes}:${seconds}`);
      }
    }
  }, [isOpen, currentDate]);

  const handleSave = () => {
    if (onDateSelect) {
      if (date) {
        const finalDate = new Date(date);
        const [hours, minutes, seconds] = time.split(':').map(Number);
        finalDate.setHours(hours || 0, minutes || 0, seconds || 0, 0);
        onDateSelect(finalDate);
      } else {
        onDateSelect(null);
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 p-0 overflow-hidden rounded-2xl [&>button]:hidden">
        {/* Hlavička */}
        <DialogHeader className="flex flex-row items-center justify-between p-4 border-b border-border/50 bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            className="font-normal text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <DialogTitle className="text-base font-semibold m-0">Date & Time</DialogTitle>
          <Button
            variant="default"
            size="sm"
            className="font-medium rounded-full px-4"
            onClick={handleSave}
          >
            Done
          </Button>
        </DialogHeader>

        <div className="p-5 space-y-6 bg-background">
          {/* Rychlé volby (Grid) */}
          <div className="grid grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4 px-2 rounded-xl border-border/60 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
              onClick={() => setDate(new Date(Date.now()))}
            >
              <CalendarIcon className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Today</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4 px-2 rounded-xl border-border/60 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all"
              onClick={() => setDate(new Date(Date.now() + 24 * 60 * 60 * 1000))}
            >
              <CalendarDays className="w-5 h-5 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground">Tomorrow</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4 px-2 rounded-xl border-border/60 hover:border-green-500/50 hover:bg-green-500/5 transition-all"
              onClick={() => setDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))}
            >
              <ArrowRight className="w-5 h-5 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground">Next week</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4 px-2 rounded-xl border-border/60 hover:border-destructive/50 hover:bg-destructive/5 transition-all"
              onClick={() => setDate(null)}
            >
              <X className="w-5 h-5 text-destructive/70" />
              <span className="text-xs font-medium text-muted-foreground">No date</span>
            </Button>
          </div>

          {/* Nastavení (List) */}
          <div className="flex flex-col rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
            {/* Date Row */}
            <div className="w-full h-auto flex items-center justify-between p-3.5 rounded-none border-b border-border/60 hover:bg-muted/50 transition-colors group font-normal">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30 group-hover:scale-105 transition-transform">
                  <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-foreground">Date</span>
              </div>

              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger
                  className={cn(
                    buttonVariants({ variant: 'outline' }),
                    'w-[160px] justify-between font-normal bg-transparent'
                  )}
                >
                  {date ? date.toLocaleDateString() : 'No date selected'}
                  <ChevronDownIcon className="w-4 h-4 opacity-50" />
                </PopoverTrigger>

                <PopoverContent className="w-auto min-w-[280px] p-3" align="start">
                  <Calendar
                    mode="single"
                    selected={date!}
                    onSelect={(newDate) => {
                      if (newDate) {
                        setDate(newDate);
                        setOpen(false);
                      }
                    }}
                    initialFocus
                    className="w-full"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Row */}
            <div className="w-full h-auto flex items-center justify-between p-3.5 rounded-none border-b border-border/60 hover:bg-muted/50 transition-colors group font-normal">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg dark:bg-orange-900/30 group-hover:scale-105 transition-transform">
                  <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-sm font-medium text-foreground">Time</span>
              </div>
              <Input
                type="time"
                step="1"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-auto bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
              />
            </div>

            {/* Duration Row */}
            <div className="w-full h-auto flex items-center justify-between p-3.5 rounded-none hover:bg-muted/50 transition-colors group font-normal">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/30 group-hover:scale-105 transition-transform">
                  <Timer className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-sm font-medium text-foreground">Duration</span>
              </div>
              <Input
                type="time"
                defaultValue="02:00"
                className="w-auto bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
