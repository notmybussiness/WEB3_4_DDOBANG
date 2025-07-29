"use client";

import { useState, useEffect } from "react";

interface TimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (time: string) => void;
  initialTime?: string;
}

export function TimePickerModal({
  isOpen,
  onClose,
  onSelect,
  initialTime,
}: TimePickerModalProps) {
  const [hour, setHour] = useState<number>(0);
  const [minute, setMinute] = useState<number>(0);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  useEffect(() => {
    if (!isOpen) return;

    // 초기 시간이 있으면 시간 설정
    if (initialTime) {
      const [hours, minutes] = initialTime.split(":").map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        if (hours >= 12) {
          setHour(hours === 12 ? 12 : hours - 12);
          setPeriod("PM");
        } else {
          setHour(hours === 0 ? 12 : hours);
          setPeriod("AM");
        }
        // 5분 단위로 반올림
        setMinute(Math.round(minutes / 5) * 5);
      }
    } else {
      // 현재 시간으로 설정
      const now = new Date();
      const currentHour = now.getHours();
      setHour(currentHour % 12 === 0 ? 12 : currentHour % 12);
      setPeriod(currentHour >= 12 ? "PM" : "AM");
      // 5분 단위로 반올림
      setMinute(Math.round(now.getMinutes() / 5) * 5);
    }
  }, [isOpen, initialTime]);

  const handleTimeSelect = () => {
    // 24시간 형식으로 변환
    let hours24 = hour;
    if (period === "PM" && hour !== 12) {
      hours24 += 12;
    } else if (period === "AM" && hour === 12) {
      hours24 = 0;
    }

    // HH:MM 형식으로 시간 포맷팅
    const timeString = `${hours24.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
    onSelect(timeString);
    onClose();
  };

  // 시간 증가
  const incrementHour = () => {
    setHour((prev) => (prev === 12 ? 1 : prev + 1));
  };

  // 시간 감소
  const decrementHour = () => {
    setHour((prev) => (prev === 1 ? 12 : prev - 1));
  };

  // 분 증가 (5분 단위)
  const incrementMinute = () => {
    setMinute((prev) => (prev + 5) % 60);
  };

  // 분 감소 (5분 단위)
  const decrementMinute = () => {
    setMinute((prev) => (prev - 5 + 60) % 60);
  };

  // AM/PM 토글
  const togglePeriod = () => {
    setPeriod((prev) => (prev === "AM" ? "PM" : "AM"));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">시간 선택</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex justify-center items-center space-x-4 mb-6">
          {/* 시간 선택 */}
          <div className="flex flex-col items-center">
            <button
              onClick={incrementHour}
              className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4L12 20M12 4L6 10M12 4L18 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="w-16 h-16 flex items-center justify-center text-2xl font-bold my-2">
              {hour.toString().padStart(2, "0")}
            </div>
            <button
              onClick={decrementHour}
              className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 20L12 4M12 20L6 14M12 20L18 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="text-2xl font-bold">:</div>

          {/* 분 선택 */}
          <div className="flex flex-col items-center">
            <button
              onClick={incrementMinute}
              className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4L12 20M12 4L6 10M12 4L18 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="w-16 h-16 flex items-center justify-center text-2xl font-bold my-2">
              {minute.toString().padStart(2, "0")}
            </div>
            <button
              onClick={decrementMinute}
              className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 20L12 4M12 20L6 14M12 20L18 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* AM/PM 선택 */}
          <div className="flex flex-col items-center ml-4">
            <button
              onClick={togglePeriod}
              className={`w-16 h-12 rounded-t-lg ${
                period === "AM"
                  ? "bg-[#FFB130] text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              AM
            </button>
            <button
              onClick={togglePeriod}
              className={`w-16 h-12 rounded-b-lg ${
                period === "PM"
                  ? "bg-[#FFB130] text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              PM
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleTimeSelect}
            className="px-4 py-2 bg-[#FFB130] text-white rounded-lg hover:bg-[#FFB130]/90"
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  );
}
