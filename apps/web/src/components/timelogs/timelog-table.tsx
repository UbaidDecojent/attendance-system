'use client';

import { TimeLog } from '@/lib/api/timelogs';
import { format } from 'date-fns';
import { Clock, CheckCircle2, XCircle, AlertCircle, Plus, Pencil, RotateCcw } from 'lucide-react';

interface TimeLogTableProps {
    logs: TimeLog[];
    isAdmin?: boolean;
    currentEmployeeId?: string;
    onStatusUpdate?: (id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => void;
    onAddLog?: (date: string) => void;
    onEdit?: (log: TimeLog) => void;
}

export default function TimeLogTable({ logs, isAdmin, currentEmployeeId, onStatusUpdate, onAddLog, onEdit }: TimeLogTableProps) {
    // Group logs by date
    const groupedLogs = logs.reduce((acc, log) => {
        const date = log.date.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(log);
        return acc;
    }, {} as Record<string, TimeLog[]>);

    // Helper to format minutes to HH:MM
    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60).toString().padStart(2, '0');
        const m = (minutes % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
    };

    return (
        <div className="space-y-6">
            {Object.entries(groupedLogs).map(([date, dateLogs]) => {
                // Calculate Totals per day
                const totalMinutes = dateLogs.reduce((acc, log) => acc + log.durationMinutes, 0);
                const billableMinutes = dateLogs.filter(l => l.billingType === 'BILLABLE').reduce((acc, log) => acc + log.durationMinutes, 0);
                const nonBillableMinutes = totalMinutes - billableMinutes;

                return (
                    <div key={date} className="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden">
                        {/* Date Header */}
                        <div className="bg-zinc-900/80 p-4 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-white/5">
                                    <Clock className="h-4 w-4 text-lime" />
                                </div>
                                <div>
                                    <span className="text-white font-bold block leading-none">
                                        {format(new Date(date), 'EEEE, d MMMM yyyy')}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 text-sm font-mono bg-black/20 px-4 py-2 rounded-lg border border-white/5">
                                <span className="text-zinc-400">Total: <span className="text-white font-bold">{formatDuration(totalMinutes)}</span></span>
                                <div className="w-px h-3 bg-white/10" />
                                <span className="text-lime">B: {formatDuration(billableMinutes)}</span>
                                <div className="w-px h-3 bg-white/10" />
                                <span className="text-orange-400">NB: {formatDuration(nonBillableMinutes)}</span>
                            </div>
                        </div>

                        {/* Column Headers */}
                        <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-white/5 bg-white/[0.02] text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            <div className="col-span-4">Task / Project</div>
                            <div className="col-span-1">Duration</div>
                            <div className="col-span-2">User</div>
                            <div className="col-span-2">Billing</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-1 text-right">Actions</div>
                        </div>

                        {/* Logs List */}
                        <div className="divide-y divide-white/5">
                            {dateLogs.map((log) => {
                                const isOwner = currentEmployeeId === log.employee.id;
                                // Strict Rule: Editing Allowed ONLY if PENDING.
                                const canEdit = log.status === 'PENDING' && (isAdmin || isOwner);

                                return (
                                    <div key={log.id} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-white/5 transition-colors group">
                                        {/* Task & Project */}
                                        <div className="col-span-4 min-w-0">
                                            <div className="font-medium text-white truncate text-sm mb-0.5">{log.task.name}</div>
                                            <div className="text-xs text-zinc-500 truncate flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-lime/50"></span>
                                                {log.project.title}
                                            </div>
                                        </div>

                                        {/* Duration */}
                                        <div className="col-span-1 font-mono text-zinc-300 text-sm font-medium">
                                            {formatDuration(log.durationMinutes)}
                                        </div>

                                        {/* User */}
                                        <div className="col-span-2 flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[10px] text-white shrink-0">
                                                {log.employee.firstName[0]}{log.employee.lastName[0]}
                                            </div>
                                            <span className="text-sm text-zinc-400 truncate">{log.employee.firstName} {log.employee.lastName}</span>
                                        </div>

                                        {/* Billing - Color Coded */}
                                        <div className="col-span-2">
                                            <span className={`text-xs px-2 py-1 rounded bg-white/5 border border-white/5 font-medium ${log.billingType === 'BILLABLE' ? 'text-lime border-lime/20 bg-lime/5' : 'text-zinc-400'}`}>
                                                {log.billingType === 'BILLABLE' ? 'Billable' : 'Non-Billable'}
                                            </span>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="col-span-2">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider items-center inline-flex gap-1.5 border
                                            ${log.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                    log.status === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}
                                        `}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'APPROVED' ? 'bg-green-500' :
                                                        log.status === 'REJECTED' ? 'bg-red-500' : 'bg-blue-500'
                                                    }`} />
                                                {log.status}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                            {/* Edit Button - Only if PENDING */}
                                            {canEdit && (
                                                <button
                                                    onClick={() => onEdit?.(log)}
                                                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                            )}

                                            {/* Admin Status Actions */}
                                            {isAdmin && (
                                                <>
                                                    {/* If Pending: Only Approve */}
                                                    {log.status === 'PENDING' && (
                                                        <button
                                                            onClick={() => onStatusUpdate?.(log.id, 'APPROVED')}
                                                            className="p-1.5 text-zinc-400 hover:text-green-400 hover:bg-green-400/10 rounded-md transition-colors"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    {/* If Approved/Rejected: Revert to Pending */}
                                                    {(log.status === 'APPROVED' || log.status === 'REJECTED') && (
                                                        <button
                                                            onClick={() => onStatusUpdate?.(log.id, 'PENDING')}
                                                            className="p-1.5 text-zinc-400 hover:text-orange-400 hover:bg-orange-400/10 rounded-md transition-colors"
                                                            title="Revert to Pending"
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Inline Add Button Row */}
                            {/* <div
                                onClick={() => onAddLog?.(date)}
                                className="p-3 border-t border-dashed border-white/5 text-xs text-zinc-500 hover:text-white hover:bg-white/5 cursor-pointer flex items-center gap-2 transition-colors"
                            >
                                <Plus className="h-3 w-3" />
                                Add Time Log for {format(new Date(date), 'MMM dd')}
                            </div> */}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
