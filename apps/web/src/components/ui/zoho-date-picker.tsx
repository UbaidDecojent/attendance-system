import { useState, useRef, useEffect } from 'react';
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval,
    startOfWeek, endOfWeek, addDays, subDays, getYear, setMonth, setYear,
    addWeeks, subWeeks, isAfter, isBefore, startOfDay
} from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type DateRange = { from: Date; to: Date };
type ViewType = 'Day' | 'Week' | 'Month' | 'Range';

interface ZohoDatePickerProps {
    dateRange: DateRange;
    onChange: (range: DateRange) => void;
}

export default function ZohoDatePicker({ dateRange, onChange }: ZohoDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<ViewType>('Month');

    // Internal state for the picker (applied only on OK)
    const [tempRange, setTempRange] = useState<DateRange>(dateRange);
    const [currentMonth, setCurrentMonth] = useState(new Date()); // For navigation

    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync temp range when opening
    useEffect(() => {
        if (isOpen) {
            setTempRange(dateRange);
            setCurrentMonth(dateRange.from);

            const isOneDay = isSameDay(dateRange.from, dateRange.to);
            const isFullMonth = isSameDay(dateRange.from, startOfMonth(dateRange.from)) && isSameDay(dateRange.to, endOfMonth(dateRange.from));

            if (isOneDay) {
                setView('Day');
            } else if (isFullMonth) {
                setView('Month');
            } else {
                // Keep current view or default to Range?
                // If the user manually selected Range view, keep it. 
                // But if we are initializing, maybe Range is safer if not Month/Day.
                // For now, let's respect previous view unless it mismatches.
                // Actually, if we want default "Month" behavior, we already set initial state.
            }
        }
    }, [isOpen, dateRange]);

    const handleApply = () => {
        onChange(tempRange);
        setIsOpen(false);
    };

    const handleCancel = () => {
        setIsOpen(false);
    };

    // Navigation (Top Arrows)
    // Navigation (Top Arrows)
    const handlePrev = () => {
        let newRange = { ...dateRange };
        if (view === 'Day') {
            const newDate = subDays(dateRange.from, 1);
            newRange = { from: newDate, to: newDate };
        } else if (view === 'Week') {
            const newFrom = subWeeks(dateRange.from, 1);
            const newTo = endOfWeek(newFrom, { weekStartsOn: 1 });
            newRange = { from: startOfWeek(newFrom, { weekStartsOn: 1 }), to: newTo };
        } else if (view === 'Month') {
            const newFrom = subMonths(dateRange.from, 1);
            newRange = { from: startOfMonth(newFrom), to: endOfMonth(newFrom) };
        } else {
            // Range: Shift by duration
            const duration = dateRange.to.getTime() - dateRange.from.getTime();
            const days = Math.round(duration / (1000 * 60 * 60 * 24)) + 1;
            const newFrom = subDays(dateRange.from, days);
            const newTo = subDays(dateRange.to, days);
            newRange = { from: newFrom, to: newTo };
        }

        onChange(newRange);
        setTempRange(newRange);
        setCurrentMonth(newRange.from);
    };

    const handleNext = () => {
        let newRange = { ...dateRange };
        if (view === 'Day') {
            const newDate = addDays(dateRange.from, 1);
            newRange = { from: newDate, to: newDate };
        } else if (view === 'Week') {
            const newFrom = addWeeks(dateRange.from, 1);
            const newTo = endOfWeek(newFrom, { weekStartsOn: 1 });
            newRange = { from: startOfWeek(newFrom, { weekStartsOn: 1 }), to: newTo };
        } else if (view === 'Month') {
            const newFrom = addMonths(dateRange.from, 1);
            newRange = { from: startOfMonth(newFrom), to: endOfMonth(newFrom) };
        } else {
            // Range: Shift by duration
            const duration = dateRange.to.getTime() - dateRange.from.getTime();
            const days = Math.round(duration / (1000 * 60 * 60 * 24)) + 1;
            const newFrom = addDays(dateRange.from, days);
            const newTo = addDays(dateRange.to, days);
            newRange = { from: newFrom, to: newTo };
        }

        onChange(newRange);
        setTempRange(newRange);
        setCurrentMonth(newRange.from);
    };

    // Calendar Navigation (Inside Popup)
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    // Render Logic
    const renderCalendar = (monthDate: Date, isSecond: boolean = false) => {
        const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start, end });

        const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

        return (
            <div className="w-[280px]">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 px-2">
                    {!isSecond && <button onClick={prevMonth} className="p-1 hover:text-white text-zinc-500"><ChevronLeft className="h-4 w-4" /></button>}
                    {isSecond && <div />} {/* Spacer */}

                    <span className="font-medium text-white">
                        {format(monthDate, 'MMM yyyy')}
                    </span>

                    {((!isSecond && view !== 'Range') || (isSecond && view === 'Range')) && (
                        <button onClick={nextMonth} className="p-1 hover:text-white text-zinc-500"><ChevronRight className="h-4 w-4" /></button>
                    )}
                    {!isSecond && view === 'Range' && <div />} {/* Spacer */}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7 mb-2 text-center">
                    {weekDays.map(d => (
                        <div key={d} className="text-[10px] font-bold text-zinc-500">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-y-1">
                    {days.map((day) => {
                        const isCurrentMonth = isSameMonth(day, monthDate);
                        const isSelected = isSameDay(day, tempRange.from) || isSameDay(day, tempRange.to);
                        const isInRange = isWithinInterval(day, { start: tempRange.from, end: tempRange.to });
                        const isToday = isSameDay(day, new Date());

                        let bgClass = '';
                        let textClass = 'text-zinc-400';

                        // Range Styles
                        if (isSelected) {
                            bgClass = 'bg-lime text-black font-bold rounded-full'; // Selected Start/End
                            textClass = 'text-black';
                        } else if (isInRange) {
                            bgClass = 'bg-lime/20'; // In Between
                            textClass = 'text-lime';
                            if (isSameDay(day, startOfWeek(day, { weekStartsOn: 1 }))) {
                                // Rounded left for start of row
                                bgClass += ' rounded-l-full';
                            }
                            if (isSameDay(day, endOfWeek(day, { weekStartsOn: 1 }))) {
                                // Rounded right for end of row
                                bgClass += ' rounded-r-full';
                            }
                        }

                        if (!isCurrentMonth) textClass = 'text-zinc-700';

                        return (
                            <div
                                key={day.toString()}
                                className={`h-8 w-8 mx-auto flex items-center justify-center text-sm cursor-pointer relative ${bgClass} ${!isSelected && !isInRange ? 'hover:bg-white/5 rounded-full' : ''}`}
                                onClick={() => handleDateClick(day)}
                                onMouseEnter={() => handleMouseEnter(day)}
                            >
                                <span className={textClass}>{format(day, 'd')}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderMonthPicker = () => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentYear = getYear(currentMonth);

        return (
            <div className="w-[280px] p-2">
                <div className="flex items-center justify-between mb-6 px-2">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 12))} className="p-1 hover:text-white text-zinc-500"><ChevronLeft className="h-4 w-4" /></button>
                    <span className="font-medium text-white">{currentYear}</span>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 12))} className="p-1 hover:text-white text-zinc-500"><ChevronRight className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                    {months.map((m, idx) => {
                        const isSelected = isSameMonth(new Date(currentYear, idx), tempRange.from);
                        return (
                            <button
                                key={m}
                                onClick={() => {
                                    const newDate = new Date(currentYear, idx, 1);
                                    setTempRange({ from: startOfMonth(newDate), to: endOfMonth(newDate) });
                                }}
                                className={`py-2 rounded-full text-sm font-medium transition-colors ${isSelected ? 'bg-lime text-black' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
                            >
                                {m}
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    const handleDateClick = (day: Date) => {
        if (view === 'Day') {
            setTempRange({ from: day, to: day });
        } else if (view === 'Week') {
            const start = startOfWeek(day, { weekStartsOn: 1 });
            const end = endOfWeek(day, { weekStartsOn: 1 });
            setTempRange({ from: start, to: end });
        } else if (view === 'Range') {
            // Logic for range selection:
            // If we have a single day active (from==to), user is likely picking the second date.
            // If from != to, user is starting a new selection.
            if (isSameDay(tempRange.from, tempRange.to)) {
                // Determine order
                if (isBefore(day, tempRange.from)) {
                    setTempRange({ from: day, to: tempRange.from });
                } else {
                    setTempRange({ from: tempRange.from, to: day });
                }
            } else {
                // Reset to start new selection
                setTempRange({ from: day, to: day });
            }
        }
    };

    const handleMouseEnter = (day: Date) => {
        // Optional: Preview hover effect for range
    };

    // Footer Shortcuts
    const setToday = () => {
        const today = new Date();
        setTempRange({ from: today, to: today });
        setView('Day');
        setCurrentMonth(today);
    };
    const setCurrentWeek = () => {
        const today = new Date();
        setTempRange({ from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) });
        setView('Week');
        setCurrentMonth(today);
    };
    const setCurrentMonthRange = () => {
        const today = new Date();
        setTempRange({ from: startOfMonth(today), to: endOfMonth(today) });
        setView('Month'); // Or Range
        setCurrentMonth(today);
    };

    // Format Display
    const getDisplayText = () => {
        const f = 'dd/MM/yyyy';
        return `${format(dateRange.from, f)} to ${format(dateRange.to, f)}`;
    };

    const activeTabClass = "text-lime border-b-2 border-lime pb-2 -mb-[2px]";
    const inactiveTabClass = "text-zinc-400 hover:text-zinc-200 pb-2";

    return (
        <div className="relative" ref={containerRef}>
            {/* Top Navigation Bar Trigger */}
            <div className="flex items-center gap-2 select-none group">
                <button onClick={handlePrev} className="p-1 hover:bg-white/10 rounded-full text-zinc-400 transition-colors"><ChevronLeft className="h-4 w-4" /></button>
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 cursor-pointer bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 hover:border-lime/50 transition-colors"
                >
                    <CalendarIcon className="h-4 w-4 text-lime" />
                    <span className="text-sm font-mono text-zinc-200">{getDisplayText()}</span>
                </div>
                <button onClick={handleNext} className="p-1 hover:bg-white/10 rounded-full text-zinc-400 transition-colors"><ChevronRight className="h-4 w-4" /></button>
            </div>

            {/* Popover */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 mt-2 z-50 bg-[#121212] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[320px]"
                    >
                        {/* Tabs */}
                        <div className="flex border-b border-white/10 px-4 pt-3 gap-6 text-sm font-medium">
                            {['Day', 'Week', 'Month', 'Range'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => {
                                        setView(t as ViewType);
                                        // Optional: Reset range logic when switching tabs? No, keep context.
                                    }}
                                    className={`transition-colors relative ${view === t ? activeTabClass : inactiveTabClass}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* Calendar Content */}
                        <div className="p-4 bg-[#0a0a0a]">
                            <div className="flex gap-4">
                                {view !== 'Month' && renderCalendar(currentMonth)}
                                {view === 'Range' && renderCalendar(addMonths(currentMonth, 1), true)}
                                {view === 'Month' && renderMonthPicker()}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between p-4 border-t border-white/10 bg-[#121212]">
                            <div>
                                {view === 'Day' && <button onClick={setToday} className="text-lime text-sm hover:underline">Today</button>}
                                {view === 'Week' && <button onClick={setCurrentWeek} className="text-lime text-sm hover:underline">Current Week</button>}
                                {(view === 'Month') && <button onClick={setCurrentMonthRange} className="text-lime text-sm hover:underline">Current Month</button>}
                                {(view === 'Range') && <button onClick={setCurrentMonthRange} className="text-lime text-sm hover:underline">Current Month</button>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleCancel} className="px-4 py-1.5 rounded-lg border border-white/10 text-white text-sm hover:bg-white/5">Cancel</button>
                                <button onClick={handleApply} className="px-4 py-1.5 rounded-lg bg-lime text-black text-sm font-bold hover:bg-lime/90">OK</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
