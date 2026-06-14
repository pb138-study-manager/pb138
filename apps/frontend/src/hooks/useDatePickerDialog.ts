import { useCallback, useEffect, useState } from 'react';

export interface UseDatePickerDialogProps {
  isOpen: boolean;
  currentDate?: Date | null;
  currentEndDate?: Date | null;
  onDateSelect?: (date: Date | null) => void;
  onEndDateSelect?: (date: Date) => void;
  onOpenChange: (open: boolean) => void;
}

export function useDatePickerDialog({
  isOpen,
  currentDate,
  currentEndDate,
  onDateSelect,
  onEndDateSelect,
  onOpenChange,
}: UseDatePickerDialogProps) {
  const [date, setDate] = useState<Date | null>(new Date());
  const [time, setTime] = useState<string>('08:30');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDate(currentDate ?? null);

    if (currentDate) {
      const d = new Date(currentDate);
      setTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
    }

    if (currentDate && currentEndDate) {
      const diffMs = new Date(currentEndDate).getTime() - new Date(currentDate).getTime();
      setDurationMinutes(Math.max(15, Math.round(diffMs / 60000)));
    } else {
      setDurationMinutes(60);
    }
  }, [currentDate, currentEndDate, isOpen]);

  const handleSave = useCallback(() => {
    if (onDateSelect) {
      if (date) {
        const finalDate = new Date(date);
        const [hours, minutes] = time.split(':').map(Number);
        finalDate.setHours(hours || 0, minutes || 0, 0, 0);
        onDateSelect(finalDate);

        if (onEndDateSelect) {
          const endDate = new Date(finalDate.getTime() + durationMinutes * 60000);
          onEndDateSelect(endDate);
        }
      } else {
        onDateSelect(null);
      }
    }

    onOpenChange(false);
  }, [date, durationMinutes, onDateSelect, onEndDateSelect, onOpenChange, time]);

  const setDateToToday = useCallback(() => {
    setDate(new Date(Date.now()));
  }, []);

  const setDateToTomorrow = useCallback(() => {
    setDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  }, []);

  const setDateToNextWeek = useCallback(() => {
    setDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  }, []);

  const clearDate = useCallback(() => {
    setDate(null);
  }, []);

  return {
    date,
    time,
    durationMinutes,
    open,
    setDate,
    setTime,
    setDurationMinutes,
    setOpen,
    handleSave,
    setDateToToday,
    setDateToTomorrow,
    setDateToNextWeek,
    clearDate,
  };
}
