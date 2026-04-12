import React from 'react';

interface DaySelectorProps {
  days: string[];
  selectedDay: number;
  onDaySelect: (day: number) => void;
}

export const DaySelector: React.FC<DaySelectorProps> = ({ days, selectedDay, onDaySelect }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {days.map((day, index) => (
        <button
          key={index}
          onClick={() => onDaySelect(index)}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            selectedDay === index
              ? 'bg-primary-600 dark:bg-primary-500 text-white shadow-md'
              : 'bg-sage-100 dark:bg-surface-container-dark text-sage-700 dark:text-sage-300 hover:bg-sage-200 dark:hover:bg-surface-container-high-dark'
          }`}
        >
          {day.substring(0, 3)}
        </button>
      ))}
    </div>
  );
};