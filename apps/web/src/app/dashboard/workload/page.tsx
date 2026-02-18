'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, addDays, subDays, eachDayOfInterval, isSameDay, isWeekend, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, BarChart3, User, AlertCircle } from 'lucide-react';
import { tasksApi, WorkloadResponse } from '@/lib/api/tasks';
import { useAuthStore } from '@/lib/stores/auth-store';
import { cn } from '@/lib/utils'; // Assuming this exists
import DayDetailsSheet from '@/components/dashboard/workload/day-details-sheet';

export default function WorkloadPage() {
    const { user } = useAuthStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDayDetail, setSelectedDayDetail] = useState<{
        employeeName: string;
        date: Date;
        tasks: any[];
    } | null>(null);

    // Permission Check
    const isManager = ['COMPANY_ADMIN', 'HR_MANAGER', 'TEAM_MANAGER', 'SUPER_ADMIN'].includes(user?.role || '');

    if (!isManager) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-zinc-400">You do not have permission to view this page.</p>
                </div>
            </div>
        );
    }

    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    const { data: workload, isLoading } = useQuery<WorkloadResponse[]>({
        queryKey: ['workload', format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')],
        queryFn: async () => {
            const data = await tasksApi.getWorkload(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
            return data as WorkloadResponse[];
        }
    });

    const getCapacityColor = (hours: number, capacity: number) => {
        if (hours === 0) return 'bg-zinc-800';
        if (hours <= capacity) return 'bg-emerald-500';
        if (hours <= capacity * 1.25) return 'bg-amber-500';
        return 'bg-red-500';
    };

    return (
        <div className="h-full flex flex-col space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <BarChart3 className="h-6 w-6 text-lime" />
                        Workload Overview
                    </h1>
                    <p className="text-zinc-400 mt-1">Monitor team capacity and resource allocation</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-zinc-900 rounded-lg p-1 border border-white/5">
                        <button
                            onClick={() => setCurrentDate(subDays(currentDate, 7))}
                            className="p-2 hover:bg-white/5 rounded-md text-zinc-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="text-sm font-medium text-white px-4 min-w-[160px] text-center">
                            {format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}
                        </span>
                        <button
                            onClick={() => setCurrentDate(addDays(currentDate, 7))}
                            className="p-2 hover:bg-white/5 rounded-md text-zinc-400 hover:text-white transition-colors"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Matrix View */}
            <div className="flex-1 bg-[#111111] border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-xl">
                {/* Header Row */}
                <div className="flex border-b border-white/5 bg-zinc-900/50 sticky top-0 z-10">
                    <div className="w-[300px] shrink-0 p-4 border-r border-white/5 flex items-center gap-2 text-sm font-medium text-zinc-400">
                        <User className="h-4 w-4" /> Employees
                    </div>
                    <div className="flex-1 grid grid-cols-7 divide-x divide-white/5">
                        {days.map(day => {
                            const isToday = isSameDay(day, new Date());
                            return (
                                <div key={day.toString()} className={cn("p-3 text-center transition-colors", isToday ? "bg-white/5" : "")}>
                                    <p className={cn("text-xs font-medium uppercase mb-1", isToday ? "text-lime" : "text-zinc-500")}>
                                        {format(day, 'EEE')}
                                    </p>
                                    <p className={cn("text-lg font-bold", isToday ? "text-white" : "text-zinc-300")}>
                                        {format(day, 'd')}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Rows Area */}
                <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-zinc-500 space-y-4">
                            <div className="animate-spin h-8 w-8 border-2 border-lime border-t-transparent rounded-full" />
                            <p>Calculating workload distribution...</p>
                        </div>
                    ) : !workload || workload.length === 0 ? (
                        <div className="p-12 text-center text-zinc-500">
                            <User className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No active employees found in this view.</p>
                        </div>
                    ) : (
                        workload.map(emp => {
                            // Calculate weekly stats
                            let totalHours = 0;
                            days.forEach(day => {
                                const key = format(day, 'yyyy-MM-dd');
                                if (!isWeekend(day)) totalHours += (emp.workload[key] || 0);
                            });
                            const weeklyCapacity = 5 * emp.capacity; // Assume 5 working days
                            const usagePercent = weeklyCapacity > 0 ? Math.min(100, (totalHours / weeklyCapacity) * 100) : 0;

                            return (
                                <div key={emp.id} className="flex group hover:bg-white/[0.02] transition-colors relative">
                                    {/* Employee Info Cell */}
                                    <div className="w-[300px] shrink-0 p-4 border-r border-white/5 flex flex-col justify-center min-h-[100px] bg-[#111111]/50 sticky left-0 z-10 backdrop-blur-sm">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 font-bold text-sm overflow-hidden shrink-0">
                                                {emp.avatar ? (
                                                    <img src={emp.avatar} alt={emp.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    emp.name.substring(0, 2).toUpperCase()
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-white truncate group-hover:text-lime transition-colors">{emp.name}</p>
                                                <p className="text-xs text-zinc-500 truncate">{emp.designation}</p>
                                            </div>
                                        </div>

                                        {/* Weekly Capacity Bar */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[10px] items-center">
                                                <span className={cn("font-medium", totalHours > weeklyCapacity ? "text-red-400" : "text-zinc-400")}>
                                                    {totalHours.toFixed(1)}h <span className="text-zinc-600">/ {weeklyCapacity}h</span>
                                                </span>
                                                <span className="text-zinc-600">{Math.round(usagePercent)}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all duration-500", getCapacityColor(totalHours, weeklyCapacity))}
                                                    style={{ width: `${usagePercent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Daily Cells */}
                                    <div className="flex-1 grid grid-cols-7 divide-x divide-white/5">
                                        {days.map(day => {
                                            const dateKey = format(day, 'yyyy-MM-dd');
                                            const hours = emp.workload[dateKey] || 0;
                                            const isWeekendDay = isWeekend(day);
                                            const isOverloaded = hours > emp.capacity;

                                            // Filter tasks for tooltip
                                            const activeTasks = emp.tasks.filter(t => {
                                                const tStart = parseISO(t.startDate);
                                                const tEnd = parseISO(t.dueDate);
                                                const dStart = startOfDay(day);
                                                // Check intersection
                                                return dStart >= startOfDay(tStart) && dStart <= endOfDay(tEnd);
                                            });

                                            return (
                                                <div
                                                    key={dateKey}
                                                    onClick={() => !isWeekendDay && hours > 0 && setSelectedDayDetail({
                                                        employeeName: emp.name,
                                                        date: day,
                                                        tasks: activeTasks
                                                    })}
                                                    className={cn(
                                                        "relative h-[120px] flex flex-col justify-end p-2 border-b border-white/5 transition-all outline-none",
                                                        isWeekendDay
                                                            ? "bg-[#0a0a0a]/40 cursor-not-allowed opacity-60 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0px,rgba(255,255,255,0.03)_10px,transparent_10px,transparent_20px)]"
                                                            : "hover:bg-white/[0.02] cursor-pointer"
                                                    )}
                                                >

                                                    {/* Workload Bar (ZenPilot Style) */}
                                                    {hours > 0 && !isWeekendDay ? (
                                                        <div className="relative h-full w-full flex items-end justify-center group/bar">
                                                            <div
                                                                className={cn(
                                                                    "w-3/5 rounded-t-sm transition-all duration-500 ease-out relative shadow-sm hover:brightness-110 hover:w-4/5",
                                                                    getCapacityColor(hours, emp.capacity)
                                                                )}
                                                                style={{ height: `${Math.min(100, (hours / emp.capacity) * 100)}%`, maxHeight: '85%' }}
                                                            >
                                                                <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-black/30 text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 shadow-sm whitespace-nowrap z-10 backdrop-blur-sm">
                                                                    {hours.toFixed(1)}h
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        !isWeekendDay && (
                                                            <div className="h-full w-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-zinc-800" />
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <DayDetailsSheet
                isOpen={!!selectedDayDetail}
                onClose={() => setSelectedDayDetail(null)}
                employeeName={selectedDayDetail?.employeeName || ''}
                date={selectedDayDetail?.date || new Date()}
                tasks={selectedDayDetail?.tasks || []}
            />
        </div>
    );
}
