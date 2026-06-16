import { useTranslation } from 'react-i18next';

export default function WeekCalendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const { i18n } = useTranslation();

  // Get current week starting from Monday
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }).map((_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });

  const isSameDay = (date1: Date, date2: Date) =>
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();

  return (
    <div className="flex justify-between items-center w-full mb-8 overflow-x-auto gap-1 pb-4 pt-1 px-1 -mx-1">
      {days.map((day) => {
        const isSelected = isSameDay(day, selectedDate);

        return (
          <div
            key={day.toISOString()}
            onClick={() => onSelectDate(day)}
            className={`flex flex-col items-center justify-between w-[38px] h-[58px] py-1.5 rounded-2xl cursor-pointer shadow-[0_1px_6px_rgba(0,0,0,0.1)] dark:shadow-none border transition-transform active:scale-95 flex-shrink-0 ${
              isSelected
                ? 'bg-[#FF3B30] border-[#FF3B30] dark:bg-red-600 dark:border-red-600'
                : 'bg-white border-transparent dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span
              className={`text-[10px] font-medium uppercase ${
                isSelected ? 'text-white/90' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {new Intl.DateTimeFormat(i18n.language === 'cs' ? 'cs-CZ' : 'en-US', {
                weekday: 'narrow',
              }).format(day)}
            </span>

            <span
              className={`text-sm font-bold ${
                isSelected ? 'text-white' : 'text-gray-800 dark:text-gray-200'
              }`}
            >
              {day.getDate()}
            </span>
            <div
              className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#FF3B30] dark:bg-red-500'}`}
            />
          </div>
        );
      })}
    </div>
  );
}
