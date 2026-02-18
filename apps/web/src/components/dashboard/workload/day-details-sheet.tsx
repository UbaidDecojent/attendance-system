'use client';

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Briefcase, Info } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TaskDetail {
    id: string;
    name: string;
    project: string;
    billingType?: string;
    estimatedHours: number;
    dailyHours: number;
    dailyLoggedHours?: Record<string, number>;
    status: string;
}

interface DayDetailsSheetProps {
    isOpen: boolean;
    onClose: () => void;
    employeeName: string;
    date: Date;
    tasks: TaskDetail[];
    avatar?: string | null;
    designation?: string;
}

export default function DayDetailsSheet({
    isOpen,
    onClose,
    employeeName,
    date,
    tasks
}: DayDetailsSheetProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    const dateKey = format(date, 'yyyy-MM-dd');

    // Calculate totals
    const totalDailyAllocated = tasks.reduce((sum, t) => sum + t.dailyHours, 0);
    const totalDailyLogged = tasks.reduce((sum, t) => sum + (t.dailyLoggedHours?.[dateKey] || 0), 0);
    const utilization = totalDailyAllocated > 0 ? (totalDailyLogged / totalDailyAllocated) * 100 : 0;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-end font-sans">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md bg-[#0a0a0a] h-full border-l border-white/10 shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-zinc-900/30">
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">{employeeName}</h2>
                                <div className="flex items-center gap-2 text-zinc-400 text-sm mt-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>{format(date, 'EEEE, MMMM do, yyyy')}</span>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* Daily Summary */}
                            <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Day Overview</h3>
                                    <span className={cn("text-xs font-bold px-2 py-1 rounded-full", totalDailyLogged > totalDailyAllocated ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500')}>
                                        {totalDailyLogged > totalDailyAllocated ? 'Over Capacity' : 'On Track'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/20 p-3 rounded-xl">
                                        <p className="text-xs text-zinc-500 mb-1">Allocated Hours</p>
                                        <p className="text-2xl font-bold text-white">{totalDailyAllocated.toFixed(1)}h</p>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-xl">
                                        <p className="text-xs text-zinc-500 mb-1">Logged Hours</p>
                                        <p className={cn("text-2xl font-bold", totalDailyLogged > totalDailyAllocated ? 'text-red-400' : 'text-emerald-400')}>
                                            {totalDailyLogged.toFixed(1)}h
                                        </p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-zinc-500">
                                        <span>Utilization</span>
                                        <span>{Math.round(utilization)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-500", totalDailyLogged > totalDailyAllocated ? 'bg-red-500' : 'bg-emerald-500')}
                                            style={{ width: `${Math.min(100, utilization)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tasks List */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Briefcase className="h-4 w-4 text-lime" />
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Assigned Tasks ({tasks.length})</h3>
                                </div>

                                {tasks.length === 0 ? (
                                    <div className="text-center py-8 text-zinc-500 bg-zinc-900/20 rounded-xl border border-dashed border-white/5">
                                        <Info className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        <p>No tasks assigned for this day.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {tasks.map(task => {
                                            const loggedToday = task.dailyLoggedHours?.[dateKey] || 0;
                                            return (
                                                <div key={task.id} className="group p-4 rounded-xl bg-zinc-900/30 border border-white/5 hover:border-lime/20 hover:bg-zinc-900/60 transition-all">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className="text-xs font-bold text-lime bg-lime/10 px-2 py-1 rounded-md border border-lime/10 truncate max-w-[120px]">
                                                            {task.project}
                                                        </span>
                                                        <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800 px-2 py-1 rounded-md border border-white/5">
                                                            {task.billingType?.replace('_', ' ') || 'N/A'}
                                                        </span>
                                                    </div>

                                                    <h4 className="text-white font-medium mb-4 leading-snug group-hover:text-lime transition-colors">{task.name}</h4>

                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        <div className="bg-black/40 p-2 rounded-lg text-center">
                                                            <p className="text-zinc-500 mb-0.5">Est. (Day)</p>
                                                            <p className="font-bold text-white">{task.dailyHours.toFixed(1)}h</p>
                                                        </div>
                                                        <div className="bg-black/40 p-2 rounded-lg text-center">
                                                            <p className="text-zinc-500 mb-0.5">Logged</p>
                                                            <p className={cn("font-bold", loggedToday > task.dailyHours ? 'text-red-400' : 'text-emerald-400')}>
                                                                {loggedToday.toFixed(1)}h
                                                            </p>
                                                        </div>
                                                        <div className="bg-black/40 p-2 rounded-lg text-center">
                                                            <p className="text-zinc-500 mb-0.5">Total Est.</p>
                                                            <p className="font-bold text-zinc-300">{task.estimatedHours}h</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/10 bg-[#0a0a0a]">
                            <button onClick={onClose} className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors border border-white/10">
                                Close Details
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
