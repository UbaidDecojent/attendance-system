'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Loader2, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DailyRecord {
    id: string | null;
    date: string;
    actualMinutes: number;
    expectedMinutes: number;
    shortMinutes: number;
    extraMinutes: number;
    checkoutMissing: boolean;
    status: string;
    isOverridden: boolean;
    adminNote: string | null;
    leavesAdjusted: number;
    isWeekend: boolean;
}

interface EmployeeSummary {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    month: string;
    totalShortMinutes: number;
    totalExtraMinutes: number;
    netMinutes: number;
    dailyRecords: DailyRecord[];
}

export function HoursAdjustmentsTab({ isAdmin }: { isAdmin: boolean }) {
    const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
    const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
    const queryClient = useQueryClient();

    const { data: summaries, isLoading } = useQuery({
        queryKey: ['hours-adjustments', selectedMonth, isAdmin],
        queryFn: async () => {
            if (isAdmin) {
                const res = await api.get(`/mission-strict/summary?month=${selectedMonth}`);
                return (res.data?.data || []) as EmployeeSummary[];
            } else {
                const res = await api.get(`/mission-strict/summary/me?month=${selectedMonth}`);
                return [res.data?.data || res.data] as EmployeeSummary[];
            }
        },
    });

    // Gather all actionable (PENDING, not checkoutMissing) records across all employees
    const allActionableRecords = useMemo(() => {
        if (!summaries) return [];
        const records: { employeeId: string; day: DailyRecord }[] = [];
        for (const emp of summaries) {
            for (const day of emp.dailyRecords || []) {
                if (day.status === 'PENDING' && !day.checkoutMissing && (day.shortMinutes > 0 || day.extraMinutes > 0)) {
                    records.push({ employeeId: emp.employeeId, day });
                }
            }
        }
        return records;
    }, [summaries]);

    const allSelected = allActionableRecords.length > 0 && selectedRecords.size === allActionableRecords.length;

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedRecords(new Set());
        } else {
            const keys = new Set<string>();
            for (const r of allActionableRecords) {
                keys.add(`${r.employeeId}::${r.day.date}`);
            }
            setSelectedRecords(keys);
        }
    };

    const toggleRecord = (employeeId: string, date: string) => {
        const key = `${employeeId}::${date}`;
        const next = new Set(selectedRecords);
        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
        }
        setSelectedRecords(next);
    };

    const isRecordSelected = (employeeId: string, date: string) => {
        return selectedRecords.has(`${employeeId}::${date}`);
    };

    const approveMutation = useMutation({
        mutationFn: async ({ records, status }: { records: { employeeId: string; date: string; shortMinutes: number; extraMinutes: number }[]; status: 'APPROVED' | 'REJECTED' }) => {
            await api.post('/mission-strict/approve-daily', { records, status });
        },
        onSuccess: (_, variables) => {
            toast.success(variables.status === 'APPROVED' ? 'Records approved & leaves adjusted' : 'Records rejected');
            setSelectedRecords(new Set());
            queryClient.invalidateQueries({ queryKey: ['hours-adjustments'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Error processing records');
        }
    });

    const handleSingleAction = (employeeId: string, day: DailyRecord, status: 'APPROVED' | 'REJECTED') => {
        approveMutation.mutate({
            records: [{ employeeId, date: day.date, shortMinutes: day.shortMinutes, extraMinutes: day.extraMinutes }],
            status,
        });
    };

    const handleBulkAction = (status: 'APPROVED' | 'REJECTED') => {
        const records: { employeeId: string; date: string; shortMinutes: number; extraMinutes: number }[] = [];
        for (const key of Array.from(selectedRecords)) {
            const [employeeId, date] = key.split('::');
            const emp = summaries?.find((e) => e.employeeId === employeeId);
            const day = emp?.dailyRecords?.find((d) => d.date === date);
            if (day) {
                records.push({ employeeId, date, shortMinutes: day.shortMinutes, extraMinutes: day.extraMinutes });
            }
        }
        if (records.length === 0) return;
        approveMutation.mutate({ records, status });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-lime" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold">Hours Adjustments</h3>
                    <p className="text-sm text-zinc-400">Review short and extra hours for {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={e => { setSelectedMonth(e.target.value); setSelectedRecords(new Set()); }}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-lime/30 px-3 py-1.5"
                    />
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {isAdmin && allActionableRecords.length > 0 && (
                <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                                type="checkbox"
                                checked={allSelected}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-zinc-600 text-lime focus:ring-lime accent-[#BFFF00]"
                            />
                            <span className="text-sm font-medium text-zinc-300">
                                Select All ({allActionableRecords.length} pending)
                            </span>
                        </label>
                    </div>
                    {selectedRecords.size > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 mr-2">{selectedRecords.size} selected</span>
                            <button 
                                onClick={() => handleBulkAction('APPROVED')}
                                disabled={approveMutation.isPending}
                                className="px-4 py-1.5 bg-lime/10 hover:bg-lime/20 text-lime font-semibold text-xs rounded-lg transition-colors border border-lime/20 disabled:opacity-50"
                            >
                                {approveMutation.isPending ? 'Processing...' : 'Approve Selected'}
                            </button>
                            <button 
                                onClick={() => handleBulkAction('REJECTED')}
                                disabled={approveMutation.isPending}
                                className="px-4 py-1.5 hover:bg-red-500/10 text-red-400 font-semibold text-xs rounded-lg transition-colors border border-transparent hover:border-red-500/20 disabled:opacity-50"
                            >
                                Reject Selected
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Employee Cards */}
            <div className="space-y-4">
                {summaries?.map((employee) => {
                    const pendingDays = employee.dailyRecords?.filter((d) => d.status === 'PENDING' && !d.checkoutMissing && (d.shortMinutes > 0 || d.extraMinutes > 0)) || [];
                    
                    return (
                        <div key={employee.employeeId} className="bg-card border border-zinc-800 rounded-2xl overflow-hidden">
                            {/* Employee Header */}
                            <div className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-white">
                                        {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white">{employee.firstName} {employee.lastName}</h4>
                                        <p className="text-xs text-zinc-500">{employee.employeeCode}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Short</p>
                                        <p className="font-bold text-red-500 text-sm">{(employee.totalShortMinutes / 60).toFixed(1)}h</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Extra</p>
                                        <p className="font-bold text-lime text-sm">{(employee.totalExtraMinutes / 60).toFixed(1)}h</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Net</p>
                                        <p className={cn(
                                            "font-bold text-sm",
                                            employee.netMinutes > 0 ? "text-lime" : employee.netMinutes < 0 ? "text-red-500" : "text-zinc-400"
                                        )}>
                                            {employee.netMinutes > 0 ? '+' : ''}{(employee.netMinutes / 60).toFixed(1)}h
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Daily Records Grid */}
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                                {employee.dailyRecords?.map((day, i) => {
                                    const isPending = day.status === 'PENDING';
                                    const isActionable = isPending && !day.checkoutMissing && (day.shortMinutes > 0 || day.extraMinutes > 0);
                                    const selected = isRecordSelected(employee.employeeId, day.date);

                                    return (
                                        <div 
                                            key={i} 
                                            className={cn(
                                                "p-3 rounded-xl border transition-all relative",
                                                day.checkoutMissing 
                                                    ? "bg-amber-500/5 border-amber-500/20"
                                                    : day.status === 'APPROVED'
                                                        ? "bg-lime/5 border-lime/20 opacity-60"
                                                        : day.status === 'REJECTED'
                                                            ? "bg-red-500/5 border-red-500/10 opacity-60"
                                                            : day.shortMinutes > 0 
                                                                ? "bg-red-500/5 border-red-500/20" 
                                                                : day.extraMinutes > 0 
                                                                    ? "bg-lime/5 border-lime/20" 
                                                                    : "bg-zinc-900/50 border-zinc-800",
                                                selected && "ring-2 ring-lime/40",
                                            )}
                                        >
                                            {/* Checkbox for selection */}
                                            {isAdmin && isActionable && (
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => toggleRecord(employee.employeeId, day.date)}
                                                    className="absolute top-2 left-2 w-3.5 h-3.5 rounded border-zinc-600 accent-[#BFFF00] cursor-pointer"
                                                />
                                            )}

                                            <div className="flex flex-col items-center text-center">
                                                <span className="text-[10px] text-zinc-500 font-medium uppercase">
                                                    {format(new Date(day.date), 'EEE')}
                                                </span>
                                                <span className="font-bold text-sm text-white">
                                                    {format(new Date(day.date), 'MMM dd')}
                                                </span>

                                                {/* Content based on state */}
                                                {day.checkoutMissing ? (
                                                    <div className="mt-2 flex items-center gap-1 text-amber-500">
                                                        <Clock className="h-3 w-3" />
                                                        <span className="text-[10px] font-bold">Checkout Missing</span>
                                                    </div>
                                                ) : day.status === 'APPROVED' ? (
                                                    <div className="mt-2 flex items-center gap-1 text-lime">
                                                        <CheckCircle className="h-3 w-3" />
                                                        <span className="text-[10px] font-bold">Approved</span>
                                                    </div>
                                                ) : day.status === 'REJECTED' ? (
                                                    <div className="mt-2 flex items-center gap-1 text-red-400">
                                                        <XCircle className="h-3 w-3" />
                                                        <span className="text-[10px] font-bold">Rejected</span>
                                                    </div>
                                                ) : (day.shortMinutes > 0 || day.extraMinutes > 0) ? (
                                                    <div className="mt-2 flex flex-col gap-0.5">
                                                        {day.shortMinutes > 0 && (
                                                            <span className="text-[10px] text-red-500 font-bold">
                                                                -{(day.shortMinutes / 60).toFixed(1)}h Short
                                                            </span>
                                                        )}
                                                        {day.extraMinutes > 0 && (
                                                            <span className="text-[10px] text-lime font-bold">
                                                                +{(day.extraMinutes / 60).toFixed(1)}h Extra
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="mt-2">
                                                        <span className="text-[10px] text-zinc-500 font-medium">On Time</span>
                                                    </div>
                                                )}

                                                {/* Per-day Approve/Reject buttons */}
                                                {isAdmin && isActionable && (
                                                    <div className="mt-2 flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleSingleAction(employee.employeeId, day, 'APPROVED')}
                                                            disabled={approveMutation.isPending}
                                                            className="p-1 rounded-md hover:bg-lime/20 text-lime transition-colors disabled:opacity-50"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleSingleAction(employee.employeeId, day, 'REJECTED')}
                                                            disabled={approveMutation.isPending}
                                                            className="p-1 rounded-md hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                                                            title="Reject"
                                                        >
                                                            <XCircle className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {(!summaries || summaries.length === 0) && (
                    <div className="p-12 text-center text-zinc-500 bg-card border border-zinc-800 rounded-2xl">
                        No adjustment records found for this month.
                    </div>
                )}
            </div>
        </div>
    );
}
