'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
    Clock,
    Calendar,
    CheckCircle,
    XCircle,
    MapPin,
    X,
    AlertTriangle,
    ArrowLeft,
    CalendarDays,
    Users,
    UserCheck,
    UserX,
    TimerOff
} from 'lucide-react';
import { attendanceApi } from '@/lib/api/attendance';
import { employeesApi } from '@/lib/api/employees';
import { formatDate, formatTime, cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, differenceInCalendarDays, getDay } from 'date-fns';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import ZohoDatePicker from '@/components/ui/zoho-date-picker';
import { CorrectionRequestModal } from '@/components/dashboard/attendance/correction-request-modal';
import { RegularizationList } from '@/components/dashboard/attendance/regularization-list';

// Interface for date-wise aggregated stats (Admin view)
interface DateStats {
    date: string;
    dateObj: Date;
    totalEmployees: number;
    present: number;
    absent: number;
    late: number;
    halfday: number;
    onTime: number;
    onLeave: number;
    records: any[];
}

export default function AttendancePage() {
    const user = useAuthStore((state) => state.user);
    const isAdmin = ['COMPANY_ADMIN', 'HR_MANAGER'].includes(user?.role || '');
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });
    const startDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = format(dateRange.to, 'yyyy-MM-dd');
    const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'history' | 'employees' | 'requests' | 'archived'>('history');

    // For Admin: track which date card is selected (null = showing cards view)
    const [selectedDateForTable, setSelectedDateForTable] = useState<string | null>(null);
    // For Admin: track which employee card is selected
    const [selectedEmployeeForTable, setSelectedEmployeeForTable] = useState<string | null>(null);

    const { data: history, isLoading } = useQuery({
        queryKey: ['attendanceHistory', startDate, endDate, isAdmin],
        queryFn: () => isAdmin
            ? attendanceApi.getHistory({ startDate, endDate, limit: 500 })
            : attendanceApi.getMyHistory({ startDate, endDate, limit: 100 }),
    });

    const { data: employeeStats } = useQuery({
        queryKey: ['employeeStats', isAdmin],
        queryFn: () => employeesApi.getStats(),
        enabled: isAdmin,
    });

    const { data: employeeSummary, isLoading: isLoadingEmployees, isError: isEmployeeError, error: employeeError, refetch: refetchEmployees } = useQuery({
        queryKey: ['employeeSummary', startDate, endDate, isAdmin],
        queryFn: () => attendanceApi.getEmployeeSummary({
            startDate,
            endDate,
            limit: 50
        }),
        enabled: isAdmin && activeTab === 'employees',
    });

    const { data: employeeDetailHistory, isLoading: isLoadingEmployeeDetail } = useQuery({
        queryKey: ['employeeHistory', selectedEmployeeForTable, startDate, endDate],
        queryFn: () => attendanceApi.getHistory({
            employeeId: selectedEmployeeForTable!,
            startDate,
            endDate,
            limit: 100
        }),
        enabled: !!selectedEmployeeForTable,
    });

    const { data: regularizationsData, refetch: refetchRequests } = useQuery({
        queryKey: ['regularizations', isAdmin],
        queryFn: () => attendanceApi.getRegularizationRequests(),
    });

    const regularizations = useMemo(() => {
        if (!regularizationsData) return [];
        if (Array.isArray(regularizationsData)) return regularizationsData;
        if ((regularizationsData as any).data && Array.isArray((regularizationsData as any).data)) {
            return (regularizationsData as any).data;
        }
        return [];
    }, [regularizationsData]);

    // Employee view: filtered history items
    const filteredHistoryItems = useMemo(() => {
        if (!history?.items) return [];
        return history.items
            .filter((item: any) => differenceInCalendarDays(new Date(item.date), new Date()) <= 0)
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [history]);

    // Admin view: aggregate attendance by date
    const dateWiseStats = useMemo<DateStats[]>(() => {
        if (!isAdmin || !history?.items || history.items.length === 0) return [];

        const dateMap = new Map<string, DateStats>();
        const totalActive = employeeStats?.active || 0;

        // Group records by date
        history.items.forEach((record: any) => {
            const dateStr = format(new Date(record.date), 'yyyy-MM-dd');
            const dateObj = new Date(record.date);

            // Skip weekends (Saturday = 6, Sunday = 0)
            const dayOfWeek = getDay(dateObj);
            if (dayOfWeek === 0 || dayOfWeek === 6) return;

            // Skip future dates
            if (differenceInCalendarDays(dateObj, new Date()) > 0) return;

            if (!dateMap.has(dateStr)) {
                dateMap.set(dateStr, {
                    date: dateStr,
                    dateObj,
                    totalEmployees: totalActive,
                    present: 0,
                    absent: 0,
                    late: 0,
                    halfday: 0,
                    onTime: 0,
                    onLeave: 0,
                    records: []
                });
            }

            const stats = dateMap.get(dateStr)!;
            stats.records.push(record);
            // Ensure totalEmployees covers historical records count if > current active
            stats.totalEmployees = Math.max(stats.totalEmployees, stats.records.length);

            if (record.status === 'PRESENT') {
                stats.present++;

                // Check if halfday (worked less than 5 hours)
                if (record.totalWorkMinutes && record.totalWorkMinutes < 300) {
                    stats.halfday++;
                }

                // Check if late
                const shiftStart = record.employee?.shift?.startTime;
                if (record.checkInTime && shiftStart) {
                    const actual = new Date(record.checkInTime);
                    const [h, m] = shiftStart.split(':').map(Number);
                    const shiftDate = new Date(actual);
                    shiftDate.setHours(h, m, 0, 0);
                    const diff = Math.floor((actual.getTime() - shiftDate.getTime()) / 60000);
                    if (diff > 15) {
                        stats.late++;
                    } else {
                        stats.onTime++;
                    }
                }
            } else if (record.status === 'ABSENT') {
                // Explicit absent is counted, but usually implicit is the main source
                // We'll calculate total absent at the end
            } else if (record.status === 'HALF_DAY') {
                stats.halfday++;
                stats.present++;
            } else if (record.status === 'ON_LEAVE') {
                stats.onLeave++;
            }
        });

        // Final calculation for absent: Total - (Present + OnLeave)
        dateMap.forEach(stats => {
            // Absent is everyone who isn't Present (includes halfday) or On Leave
            // Note: Explicit 'ABSENT' records are just placeholders, they don't add to 'present' or 'onLeave'
            // So they remain in the pool of 'Total - Accounted', effectively becoming 'Absent'.
            stats.absent = Math.max(0, stats.totalEmployees - stats.present);
        });

        // Convert to array and sort by date descending
        return Array.from(dateMap.values())
            .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
    }, [isAdmin, history, employeeStats]);

    // Admin view: records for selected date
    const selectedDateRecords = useMemo(() => {
        if (!selectedDateForTable || !isAdmin) return [];
        const stats = dateWiseStats.find(d => d.date === selectedDateForTable);
        return stats?.records || [];
    }, [selectedDateForTable, dateWiseStats, isAdmin]);

    const [selectedLocation, setSelectedLocation] = useState<any>(null);

    const columns: ColumnDef<any>[] = useMemo(() => {
        const cols: ColumnDef<any>[] = [
            {
                accessorKey: 'date',
                header: 'Date',
                cell: ({ row }) => (
                    <div>
                        <div className="font-bold text-white">{formatDate(row.original.date, 'MMM d, yyyy')}</div>
                        <div className="text-xs text-zinc-500 font-medium mt-0.5">{formatDate(row.original.date, 'EEEE')}</div>
                    </div>
                ),
            },
        ];

        if (isAdmin && !selectedEmployeeForTable) {
            cols.push({
                accessorKey: 'employee',
                header: 'Employee',
                cell: ({ row }) => (
                    <div>
                        <div className="font-bold text-white">{row.original.employee?.firstName} {row.original.employee?.lastName}</div>
                        <div className="text-xs text-zinc-500">{row.original.employee?.employeeCode}</div>
                    </div>
                ),
            });
        }

        cols.push(
            {
                accessorKey: 'checkInTime',
                header: 'Check In',
                cell: ({ row }) => {
                    const record = row.original;
                    const shiftStart = record.employee?.shift?.startTime;

                    let statusLabel = null;
                    if (record.checkInTime && shiftStart) {
                        const actual = new Date(record.checkInTime);
                        const [h, m] = shiftStart.split(':').map(Number);
                        const shiftDate = new Date(actual);
                        shiftDate.setHours(h, m, 0, 0);

                        const diff = Math.floor((actual.getTime() - shiftDate.getTime()) / 60000);
                        const absDiff = Math.abs(diff);
                        const formatDuration = (mins: number) => mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;

                        if (diff <= 15) {
                            // Early or within grace period -> On Time (Green)
                            statusLabel = { text: 'On Time', color: 'text-lime' };
                        } else {
                            // Late -> Red with duration
                            statusLabel = { text: `Late: ${formatDuration(diff)}`, color: 'text-red-500' };
                        }
                    }

                    return record.checkInTime ? (
                        <div className="flex flex-col gap-1">
                            <span className="text-lime font-bold">
                                {formatTime(record.checkInTime)}
                            </span>
                            {statusLabel && (
                                <span className={`${statusLabel.color} text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1`}>
                                    {statusLabel.text}
                                </span>
                            )}
                            {record.checkInLocation && (
                                <button
                                    onClick={() => setSelectedLocation({
                                        lat: record.checkInLocation.lat,
                                        lng: record.checkInLocation.lng,
                                        address: record.checkInLocation.address,
                                        type: 'Check In'
                                    })}
                                    className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-zinc-500 hover:text-white transition-colors"
                                >
                                    <MapPin className="h-3 w-3" />
                                    {record.checkInLocation.address ? 'View Map' : 'Map'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <span className="text-zinc-600 font-bold">--:--</span>
                    );
                },
            },
            {
                accessorKey: 'checkOutTime',
                header: 'Check Out',
                cell: ({ row }) => {
                    const record = row.original;
                    const shiftEnd = record.employee?.shift?.endTime;

                    let statusLabel = null;
                    if (record.checkOutTime && shiftEnd) {
                        const actual = new Date(record.checkOutTime);
                        const [h, m] = shiftEnd.split(':').map(Number);
                        const shiftDate = new Date(actual);
                        shiftDate.setHours(h, m, 0, 0);

                        const diff = Math.floor((actual.getTime() - shiftDate.getTime()) / 60000);
                        const absDiff = Math.abs(diff);
                        const formatDuration = (mins: number) => mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;

                        if (diff < 0) statusLabel = { text: `Early: ${formatDuration(absDiff)}`, color: 'text-amber-500' }; // Left Early
                        else if (diff > 0) statusLabel = { text: `OT: ${formatDuration(diff)}`, color: 'text-lime' }; // Overtime
                        else statusLabel = { text: 'On Time', color: 'text-zinc-500' };
                    }

                    return record.checkOutTime ? (
                        <div className="flex flex-col gap-1">
                            <span className="text-white font-bold">
                                {formatTime(record.checkOutTime)}
                            </span>
                            {statusLabel && (
                                <span className={`${statusLabel.color} text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1`}>
                                    {statusLabel.text}
                                </span>
                            )}
                            {record.checkOutLocation && (
                                <button
                                    onClick={() => setSelectedLocation({
                                        lat: record.checkOutLocation.lat,
                                        lng: record.checkOutLocation.lng,
                                        address: record.checkOutLocation.address,
                                        type: 'Check Out'
                                    })}
                                    className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-zinc-500 hover:text-white transition-colors"
                                >
                                    <MapPin className="h-3 w-3" />
                                    {record.checkOutLocation.address ? 'View Map' : 'Map'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <span className="text-zinc-600 font-bold">--:--</span>
                    );
                },
            },
            {
                accessorKey: 'totalWorkMinutes',
                header: 'Hours',
                cell: ({ row }) => {
                    const record = row.original;
                    const workMinutes = record.totalWorkMinutes;

                    if (!workMinutes) return <span className="font-bold text-zinc-600">--</span>;

                    const hours = Math.floor(workMinutes / 60);
                    const minutes = workMinutes % 60;

                    let remainingElement = null;

                    // Only calculate if checkout exists (shift completed)
                    if (record.checkOutTime && record.employee?.shift?.startTime && record.employee?.shift?.endTime) {
                        const [startH, startM] = record.employee.shift.startTime.split(':').map(Number);
                        const [endH, endM] = record.employee.shift.endTime.split(':').map(Number);

                        let shiftMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                        if (shiftMinutes < 0) shiftMinutes += 24 * 60; // Handle overnight shift

                        if (workMinutes < shiftMinutes) {
                            const diff = shiftMinutes - workMinutes;
                            const diffH = Math.floor(diff / 60);
                            const diffM = diff % 60;

                            // Only show if meaningful difference (> 1 min)
                            if (diff > 1) {
                                remainingElement = (
                                    <div className="text-[10px] text-red-500 font-extrabold mt-0.5 flex items-center gap-1">
                                        <TimerOff className="h-3 w-3" />
                                        {diffH > 0 && `${diffH}h `}{diffM}m remaining
                                    </div>
                                );
                            }
                        }
                    }

                    return (
                        <div className="flex flex-col">
                            <span className="font-bold text-zinc-300">
                                {hours}h {minutes}m
                            </span>
                            {remainingElement}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <span className={cn(
                        'inline-flex px-3 py-1.5 rounded-lg text-xs font-bold border',
                        row.original.status === 'PRESENT'
                            ? 'bg-lime text-black border-lime'
                            : row.original.status === 'ABSENT'
                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    )}>
                        {row.original.status.replace('_', ' ')}
                    </span>
                ),
            },
        );

        return cols;
    }, [isAdmin, selectedEmployeeForTable]);

    // Reset selected date when date range changes
    const handleDateRangeChange = (newRange: { from: Date; to: Date }) => {
        setDateRange(newRange);
        setSelectedDateForTable(null);
        setSelectedEmployeeForTable(null);
    };

    // Get status badges for a date card (returns array for multiple badges)
    const getDateStatusBadges = (stats: DateStats) => {
        const badges: { text: string; type: 'late' | 'absent' | 'halfday' | 'ontime' }[] = [];

        if (stats.late > 0) {
            badges.push({ text: `${stats.late} Late`, type: 'late' });
        }
        if (stats.absent > 0) {
            badges.push({ text: `${stats.absent} Absent`, type: 'absent' });
        }
        if (stats.halfday > 0) {
            badges.push({ text: `${stats.halfday} Halfday`, type: 'halfday' });
        }

        // If no issues, show "All On Time"
        if (badges.length === 0) {
            badges.push({ text: 'All On Time', type: 'ontime' });
        }

        return badges;
    };

    // Get badge styling based on type
    const getBadgeStyles = (type: 'late' | 'absent' | 'halfday' | 'ontime') => {
        switch (type) {
            case 'late':
                return { bg: 'bg-amber-400/15', text: 'text-amber-400', dot: 'bg-amber-400' };
            case 'absent':
                return { bg: 'bg-red-400/15', text: 'text-red-400', dot: 'bg-red-400' };
            case 'halfday':
                return { bg: 'bg-zinc-400/15', text: 'text-zinc-400', dot: 'bg-zinc-400' };
            case 'ontime':
            default:
                return { bg: 'bg-lime/15', text: 'text-lime', dot: 'bg-lime' };
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Attendance History</h1>
                    <p className="text-muted-foreground">View and track your attendance records</p>
                </div>
                <div className="flex items-center gap-3">
                    {!isAdmin && (
                        <button
                            onClick={() => setIsCorrectionOpen(true)}
                            className="px-5 py-2.5 bg-lime hover:bg-lime/90 text-black rounded-xl text-sm font-semibold transition-all shadow-[0_0_20px_-5px_rgba(212,244,69,0.4)] hover:shadow-[0_0_25px_-5px_rgba(212,244,69,0.6)] active:scale-95 flex items-center gap-2"
                        >
                            <AlertTriangle className="h-4 w-4 text-black stroke-[2.5px]" />
                            Request Correction
                        </button>
                    )}
                </div>
            </div >

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-[#111111] border border-white/5 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('history')}
                    className={cn(
                        "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                        activeTab === 'history' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-white"
                    )}
                >
                    History
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('employees')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            activeTab === 'employees' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-white"
                        )}
                    >
                        Employees
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('requests')}
                    className={cn(
                        "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                        activeTab === 'requests' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-white"
                    )}
                >
                    Requests
                    {regularizations && regularizations.filter((r: any) => r.status === 'PENDING').length > 0 && (
                        <span className="bg-lime text-black text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                            {regularizations.filter((r: any) => r.status === 'PENDING').length}
                        </span>
                    )}
                </button>
                {
                    (isAdmin || regularizations?.some((r: any) => r.status !== 'PENDING')) && (
                        <button
                            onClick={() => setActiveTab('archived')}
                            className={cn(
                                "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                                activeTab === 'archived' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-white"
                            )}
                        >
                            Archived
                        </button>
                    )
                }
            </div >

            {activeTab === 'history' ? (
                <>
                    {/* Date Range Filter */}
                    <div className="flex items-center justify-start bg-[#111111] border border-white/5 rounded-[1.5rem] p-2">
                        <ZohoDatePicker
                            dateRange={dateRange}
                            onChange={handleDateRangeChange}
                        />
                    </div>

                    {/* ADMIN VIEW: Date Cards + Table on click */}
                    {isAdmin ? (
                        <>
                            {/* Back button when viewing a specific date */}
                            {selectedDateForTable && (
                                <button
                                    onClick={() => setSelectedDateForTable(null)}
                                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to all dates
                                </button>
                            )}

                            {isLoading ? (
                                <div className="bg-[#111111] border border-white/5 rounded-[2rem] p-12 text-center text-zinc-500 animate-pulse">
                                    Loading records...
                                </div>
                            ) : selectedDateForTable ? (
                                /* Table view for selected date */
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 rounded-xl bg-lime/10 border border-lime/20">
                                            <CalendarDays className="h-5 w-5 text-lime" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white">
                                                {formatDate(selectedDateForTable, 'EEEE, MMMM d, yyyy')}
                                            </h2>
                                            <p className="text-sm text-zinc-500">
                                                {selectedDateRecords.length} employee records
                                            </p>
                                        </div>
                                    </div>
                                    <DataTable columns={columns} data={selectedDateRecords} />
                                </div>
                            ) : dateWiseStats.length === 0 ? (
                                /* No attendance data */
                                <div className="bg-[#111111] border border-white/5 rounded-[2rem] p-12 text-center">
                                    <CalendarDays className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-white mb-2">No Attendance Records</h3>
                                    <p className="text-zinc-500 text-sm">
                                        No attendance was marked during the selected period.
                                    </p>
                                </div>
                            ) : (
                                /* Date Cards Grid - Responsive layout */
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                                    {dateWiseStats.map((stats) => {
                                        const badges = getDateStatusBadges(stats);
                                        // Border color based on priority: absent > late > halfday > ontime
                                        const borderColor = stats.absent > 0 ? 'border-l-red-400' :
                                            stats.late > 0 ? 'border-l-amber-400' :
                                                stats.halfday > 0 ? 'border-l-zinc-400' : 'border-l-lime';
                                        return (
                                            <button
                                                key={stats.date}
                                                onClick={() => setSelectedDateForTable(stats.date)}
                                                className={cn(
                                                    "group bg-[#111111] border-l-[8px] border border-white/5 rounded-xl text-left transition-all hover:bg-[#151515]",
                                                    borderColor
                                                )}
                                            >
                                                <div className="p-4">
                                                    {/* Row 1: Date + Status Badges */}
                                                    <div className="flex items-center justify-between mb-5 gap-2">
                                                        <h3 className="text-sm font-bold text-white">
                                                            {format(stats.dateObj, 'EEE, MMM d, yyyy')}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                            {badges.slice(0, 2).map((badge, idx) => {
                                                                const styles = getBadgeStyles(badge.type);
                                                                return (
                                                                    <span
                                                                        key={idx}
                                                                        className={cn(
                                                                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                                                                            styles.bg, styles.text
                                                                        )}
                                                                    >
                                                                        <span className={cn('w-1.5 h-1.5 rounded-full', styles.dot)} />
                                                                        {badge.text}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Stats - Evenly distributed with flex */}
                                                    <div className="flex justify-between mb-5">
                                                        {/* Present */}
                                                        <div className="text-center flex-1">
                                                            <div className="flex items-center justify-center gap-1.5 mb-1.5">
                                                                <span className="w-2 h-2 rounded-full bg-lime" />
                                                                <p className="text-[11px] text-zinc-400 font-medium">Present</p>
                                                            </div>
                                                            <p className="text-xl font-bold text-white">{stats.present}</p>
                                                        </div>

                                                        {/* Absent */}
                                                        <div className="text-center flex-1">
                                                            <div className="flex items-center justify-center gap-1.5 mb-1.5">
                                                                <span className="w-2 h-2 rounded-full bg-red-400" />
                                                                <p className="text-[11px] text-zinc-400 font-medium">Absent</p>
                                                            </div>
                                                            <p className="text-xl font-bold text-white">{stats.absent}</p>
                                                        </div>

                                                        {/* Late */}
                                                        <div className="text-center flex-1">
                                                            <div className="flex items-center justify-center gap-1.5 mb-1.5">
                                                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                                                <p className="text-[11px] text-zinc-400 font-medium">Late</p>
                                                            </div>
                                                            <p className="text-xl font-bold text-white">{stats.late}</p>
                                                        </div>

                                                        {/* Halfday */}
                                                        <div className="text-center flex-1">
                                                            <div className="flex items-center justify-center gap-1.5 mb-1.5">
                                                                <span
                                                                    className="w-2 h-2 rounded-full"
                                                                    style={{ background: 'conic-gradient(#a3e635 0deg 180deg, #525252 180deg 360deg)' }}
                                                                />
                                                                <p className="text-[11px] text-zinc-400 font-medium">Halfday</p>
                                                            </div>
                                                            <p className="text-xl font-bold text-white">{stats.halfday}</p>
                                                        </div>
                                                    </div>

                                                    {/* Row 3: Total Employees */}
                                                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                                        <span className="text-xs text-zinc-500">Total Employees</span>
                                                        <span className="text-xs font-bold text-white">{stats.totalEmployees}</span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        /* EMPLOYEE VIEW: Original table view with summary stats */
                        <>
                            {/* Summary Stats for Employee */}


                            {/* Attendance Records Table for Employee */}
                            {isLoading ? (
                                <div className="bg-[#111111] border border-white/5 rounded-[2rem] p-12 text-center text-zinc-500 animate-pulse">
                                    Loading records...
                                </div>
                            ) : (
                                <DataTable columns={columns} data={filteredHistoryItems} />
                            )}
                        </>
                    )}
                </>
            ) : activeTab === 'employees' ? (
                <>
                    {/* Date Range Filter */}
                    <div className="flex items-center justify-start bg-[#111111] border border-white/5 rounded-[1.5rem] p-2">
                        <ZohoDatePicker
                            dateRange={dateRange}
                            onChange={handleDateRangeChange}
                        />
                    </div>

                    {selectedEmployeeForTable ? (
                        /* Detail View for Selected Employee */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => setSelectedEmployeeForTable(null)}
                                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to all employees
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-lime/10 border border-lime/20">
                                    <UserCheck className="h-5 w-5 text-lime" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">
                                        {employeeSummary?.items?.find((e: any) => e.id === selectedEmployeeForTable)?.firstName}
                                        {' '}
                                        {employeeSummary?.items?.find((e: any) => e.id === selectedEmployeeForTable)?.lastName}
                                    </h2>
                                    <p className="text-sm text-zinc-500">
                                        Attendance History ({formatDate(dateRange.from, 'MMM d')} - {formatDate(dateRange.to, 'MMM d')})
                                    </p>
                                </div>
                            </div>

                            {isLoadingEmployeeDetail ? (
                                <div className="bg-[#111111] border border-white/5 rounded-[2rem] p-12 text-center text-zinc-500 animate-pulse">
                                    Loading details...
                                </div>
                            ) : (
                                <DataTable columns={columns} data={employeeDetailHistory?.items || []} />
                            )}
                        </div>
                    ) : isEmployeeError ? (
                        <div className="col-span-full flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-zinc-900/50 rounded-xl border border-white/5">
                            <p className="text-red-400 mb-2">Error: {(employeeError as any)?.response?.data?.message || (employeeError as any)?.message || 'Unknown error'}</p>
                            <button onClick={() => refetchEmployees()} className="mt-4 text-sm text-primary hover:underline">Retry</button>
                        </div>
                    ) : isLoadingEmployees ? (
                        <div className="bg-[#111111] border border-white/5 rounded-[2rem] p-12 text-center text-zinc-500 animate-pulse">
                            Loading employee summary...
                        </div>
                    ) : (
                        /* Employee Cards Grid */
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                            {employeeSummary?.items?.map((emp: any) => {
                                const stats = emp.stats || { present: 0, absent: 0, late: 0, halfDay: 0 };
                                const badges: { text: string; type: 'late' | 'absent' | 'halfday' | 'ontime' }[] = [];

                                if (stats.late > 0) badges.push({ text: `${stats.late} Late`, type: 'late' });
                                if (stats.absent > 0) badges.push({ text: `${stats.absent} Absent`, type: 'absent' });
                                if (stats.halfDay > 0) badges.push({ text: `${stats.halfDay} Halfday`, type: 'halfday' });
                                if (badges.length === 0) badges.push({ text: 'All On Time', type: 'ontime' });

                                // Border color priority
                                const borderColor = stats.absent > 0 ? 'border-l-red-400' :
                                    stats.late > 0 ? 'border-l-amber-400' :
                                        stats.halfDay > 0 ? 'border-l-zinc-400' : 'border-l-lime';

                                return (
                                    <button
                                        key={emp.id}
                                        onClick={() => setSelectedEmployeeForTable(emp.id)}
                                        className={cn(
                                            "group bg-[#111111] border-l-[8px] border border-white/5 rounded-xl text-left transition-all hover:bg-[#151515]",
                                            borderColor
                                        )}
                                    >
                                        <div className="p-4">
                                            {/* Header */}
                                            <div className="flex items-center justify-between mb-5 gap-2">
                                                <div>
                                                    <h3 className="text-sm font-bold text-white">
                                                        {emp.firstName} {emp.lastName}
                                                    </h3>
                                                    <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                                                        {formatDate(dateRange.from, 'MMM d')} - {formatDate(dateRange.to, 'MMM d')}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                    {badges.slice(0, 2).map((badge, idx) => {
                                                        const styles = getBadgeStyles(badge.type);
                                                        return (
                                                            <span
                                                                key={idx}
                                                                className={cn(
                                                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                                                                    styles.bg, styles.text
                                                                )}
                                                            >
                                                                <span className={cn('w-1.5 h-1.5 rounded-full', styles.dot)} />
                                                                {badge.text}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Stats Grid */}
                                            <div className="flex justify-between mb-2">
                                                {/* Present */}
                                                <div className="text-center flex-1">
                                                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-lime" />
                                                        <p className="text-[11px] text-zinc-400 font-medium">Present</p>
                                                    </div>
                                                    <p className="text-xl font-bold text-white">{stats.present}</p>
                                                </div>

                                                {/* Absent */}
                                                <div className="text-center flex-1">
                                                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-red-400" />
                                                        <p className="text-[11px] text-zinc-400 font-medium">Absent</p>
                                                    </div>
                                                    <p className="text-xl font-bold text-white">{stats.absent}</p>
                                                </div>

                                                {/* Late */}
                                                <div className="text-center flex-1">
                                                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                                                        <p className="text-[11px] text-zinc-400 font-medium">Late</p>
                                                    </div>
                                                    <p className="text-xl font-bold text-white">{stats.late}</p>
                                                </div>

                                                {/* Halfday */}
                                                <div className="text-center flex-1">
                                                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                                                        <span
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ background: 'conic-gradient(#a3e635 0deg 180deg, #525252 180deg 360deg)' }}
                                                        />
                                                        <p className="text-[11px] text-zinc-400 font-medium">Halfday</p>
                                                    </div>
                                                    <p className="text-xl font-bold text-white">{stats.halfDay || 0}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : activeTab === 'requests' ? (
                <RegularizationList
                    requests={regularizations ? regularizations.filter((r: any) => r.status === 'PENDING') : []}
                    isAdmin={isAdmin}
                    onUpdate={refetchRequests}
                />
            ) : (
                <RegularizationList
                    requests={regularizations ? regularizations.filter((r: any) => r.status !== 'PENDING') : []}
                    isAdmin={isAdmin}
                    onUpdate={refetchRequests}
                />
            )
            }

            {/* Location Modal */}
            {
                selectedLocation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{selectedLocation.type} Location</h3>
                                    <p className="text-sm text-muted-foreground">Lat: {selectedLocation.lat?.toFixed(6)}, Lng: {selectedLocation.lng?.toFixed(6)}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedLocation(null)}
                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <X className="h-5 w-5 text-muted-foreground" />
                                </button>
                            </div>
                            <div className="aspect-video w-full bg-muted">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    allowFullScreen
                                    src={`https://maps.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}&z=15&output=embed`}
                                ></iframe>
                            </div>
                            {selectedLocation.address && (
                                <div className="p-4 bg-muted/20 border-t border-white/5">
                                    <p className="text-sm text-zinc-300 flex items-start gap-2">
                                        <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                        {selectedLocation.address}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            <CorrectionRequestModal
                isOpen={isCorrectionOpen}
                onClose={() => setIsCorrectionOpen(false)}
                onSuccess={refetchRequests}
            />
        </div >
    );
}
