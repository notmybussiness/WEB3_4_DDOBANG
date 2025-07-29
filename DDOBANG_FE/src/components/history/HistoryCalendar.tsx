"use client";

import { useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface HistoryCalendarProps {
  selectedDate: Date | null;
  onChange: (date: Date) => void;
  markedDates?: Date[];
  startDate?: Date | null;
  endDate?: Date | null;
  onMonthChange?: (date: Date) => void;
}

export function HistoryCalendar({
  selectedDate,
  onChange,
  markedDates = [],
  startDate,
  endDate,
  onMonthChange,
}: HistoryCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  const goToPreviousMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const isMarkedDate = (date: Date) =>
    markedDates.some((markedDate) => isSameDay(date, markedDate));

  const isDateInRange = (date: Date) => {
    if (!startDate || !endDate) return false;
    return date >= startDate && date <= endDate && !isSameDay(date, startDate) && !isSameDay(date, endDate);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-white">
          {format(currentMonth, "yyyy년 MM월", { locale: ko })}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="h-8 flex items-center justify-center text-sm font-medium text-gray-300"
          >
            {day}
          </div>
        ))}

        {days.map((day, dayIdx) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isMarked = isMarkedDate(day);
          const isInRange = isDateInRange(day);

          return (
            <button
              key={day.toString()}
              onClick={() => onChange(day)}
              className={`
                h-10 flex flex-col items-center justify-center relative
                ${isCurrentMonth ? "text-white" : "text-gray-500"}
                ${isSelected ? "bg-gray-700" : "hover:bg-gray-700"}
                rounded-lg transition-colors
              `}
            >
              <span className={isMarked ? "font-bold" : ""}>
                {format(day, "d")}
              </span>
              {isMarked && (
                <div className="absolute bottom-1 w-1.5 h-1.5 bg-[#FFB130] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
