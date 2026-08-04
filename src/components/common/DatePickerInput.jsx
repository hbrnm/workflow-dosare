import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock, X } from "lucide-react";
import { fmtDate, fmtDateTime, todayISO } from "../../utils/dateUtils";

export default function DatePickerInput({
  value,
  onChange,
  withTime = false,
  placeholder,
  className = "in",
  disabled = false,
  popDirection = "down",
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const parseVal = (valStr) => {
    if (!valStr) return { dateStr: "", timeStr: "08:00" };
    const str = String(valStr);
    if (str.includes("T")) {
      const [d, t] = str.split("T");
      return { dateStr: d, timeStr: t ? t.slice(0, 5) : "08:00" };
    }
    return { dateStr: str, timeStr: "08:00" };
  };

  const parsed = parseVal(value);
  const selectedDate = parsed.dateStr;
  const selectedTime = parsed.timeStr;

  const initialDateObj = selectedDate ? new Date(selectedDate) : new Date();
  const validInitialDate = isNaN(initialDateObj.getTime()) ? new Date() : initialDateObj;

  const [viewYear, setViewYear] = useState(validInitialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(validInitialDate.getMonth());

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (value && !open) {
      const { dateStr } = parseVal(value);
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          setViewYear(d.getFullYear());
          setViewMonth(d.getMonth());
        }
      }
    }
  }, [value, open]);

  const handleSelectDay = (year, month, day) => {
    const yStr = String(year);
    const mStr = String(month + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const newDateStr = `${yStr}-${mStr}-${dStr}`;

    if (withTime) {
      const timeToUse = selectedTime || "08:00";
      onChange(`${newDateStr}T${timeToUse}`);
    } else {
      onChange(newDateStr);
      setOpen(false);
    }
  };

  const handleSelectTime = (newTime) => {
    const dateToUse = selectedDate || todayISO();
    onChange(`${dateToUse}T${newTime}`);
  };

  // Snap minutes to 30-min grid
  const snapTo30 = (timeStr) => {
    const [h, m] = timeStr.split(":");
    return `${h}:${Number(m) < 30 ? "00" : "30"}`;
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setOpen(false);
  };

  const handleToday = (e) => {
    e.stopPropagation();
    const today = todayISO();
    if (withTime) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      onChange(`${today}T${hh}:${mm}`);
    } else {
      onChange(today);
    }
    setOpen(false);
  };

  const prevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const daysGrid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: viewMonth - 1,
        year: viewMonth === 0 ? viewYear - 1 : viewYear,
        currentMonth: false,
      });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        month: viewMonth,
        year: viewYear,
        currentMonth: true,
      });
    }
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: viewMonth + 1,
        year: viewMonth === 11 ? viewYear + 1 : viewYear,
        currentMonth: false,
      });
    }
    return days;
  }, [viewYear, viewMonth]);

  const monthNames = [
    "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
    "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
  ];

  const formattedDisplay = withTime ? fmtDateTime(value) : fmtDate(value);
  const defaultPlaceholder = placeholder || (withTime ? "zi/luna/an, ore" : "zi/luna/an");

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <div
        onClick={() => {
          if (!disabled) setOpen(!open);
        }}
        className={`${className} flex items-center justify-between cursor-pointer select-none ${
          disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
        }`}
      >
        <span className={`truncate ${value ? "text-[#23282E] font-medium" : "text-[#8A8375]"}`}>
          {value ? formattedDisplay : defaultPlaceholder}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {value && !disabled && (
            <X
              size={13}
              className="text-[#8A8375] hover:text-[#B23A2E] cursor-pointer"
              onClick={handleClear}
            />
          )}
          <Calendar size={14} className="text-[#6B6558]" />
        </div>
      </div>

      {open && !disabled && (
        <div className={`absolute ${popDirection === "up" ? "bottom-full mb-1" : "top-full mt-1"} left-0 z-50 bg-white border border-[#DAD4C6] shadow-2xl rounded-lg p-3 w-[290px] text-[#23282E] text-[12px]`}>
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#EFEAE1]">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded hover:bg-[#EFEAE1] text-[#6B6558]"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-[13px]">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded hover:bg-[#EFEAE1] text-[#6B6558]"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center font-semibold text-[#8A8375] text-[10.5px] mb-1">
            <span>Lu</span><span>Ma</span><span>Mi</span><span>Jo</span><span>Vi</span><span>Sâ</span><span>Du</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {daysGrid.map((item, idx) => {
              const itemY = item.year;
              const itemM = (item.month + 12) % 12;
              const itemDateStr = `${itemY}-${String(itemM + 1).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`;
              const isSelected = selectedDate === itemDateStr;
              const isToday = itemDateStr === todayISO();

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(item.year, item.month, item.day)}
                  className={`h-7 w-7 rounded-md flex items-center justify-center text-[11.5px] font-medium transition-colors mx-auto ${
                    isSelected
                      ? "bg-[#3B5166] text-white font-bold"
                      : isToday
                      ? "border border-[#C98A2B] text-[#C98A2B] font-bold"
                      : item.currentMonth
                      ? "hover:bg-[#EFEAE1] text-[#23282E]"
                      : "text-[#C2BCB0] hover:bg-[#F5F2EA]"
                  }`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {withTime && (
            <div className="mt-3 pt-2.5 border-t border-[#EFEAE1]">
              <div className="text-[11px] font-bold text-[#6B6558] mb-1.5 flex items-center gap-1">
                <Clock size={12} /> Ora (HH:mm)
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <select
                  className="border border-[#DAD4C6] rounded px-1.5 py-1 text-[11.5px] bg-[#FAF8F5] focus:bg-white font-mono flex-1"
                  value={selectedTime.split(":")[0] || "08"}
                  onChange={(e) => {
                    const mins = selectedTime.split(":")[1] || "00";
                    handleSelectTime(`${e.target.value}:${mins}`);
                  }}
                >
                  {Array.from({ length: 24 }).map((_, h) => {
                    const hh = String(h).padStart(2, "0");
                    return <option key={hh} value={hh}>{hh}:00h</option>;
                  })}
                </select>
                <span className="font-bold text-[#8A8375]">:</span>
                <select
                  className="border border-[#DAD4C6] rounded px-1.5 py-1 text-[11.5px] bg-[#FAF8F5] focus:bg-white font-mono flex-1"
                  value={["00", "30"].includes(selectedTime.split(":")[1]) ? selectedTime.split(":")[1] : "00"}
                  onChange={(e) => {
                    const hrs = selectedTime.split(":")[0] || "08";
                    handleSelectTime(`${hrs}:${e.target.value}`);
                  }}
                >
                  {["00", "30"].map((mm) => (
                    <option key={mm} value={mm}>{mm} min</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-1">
                {["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSelectTime(t)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                      selectedTime === t
                        ? "bg-[#3B5166] text-white border-[#3B5166]"
                        : "bg-[#F5F2EA] text-[#3B5166] border-[#DAD4C6] hover:bg-[#EFEAE1]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 pt-2 border-t border-[#EFEAE1] flex items-center justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-[#B23A2E] hover:underline font-semibold"
            >
              Șterge
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToday}
                className="text-[11px] text-[#3B5166] hover:underline font-semibold"
              >
                {withTime ? "Acum" : "Azi"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-2 py-0.5 bg-[#3B5166] text-white rounded text-[11px] font-semibold hover:bg-[#2C4160]"
              >
                Gata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
