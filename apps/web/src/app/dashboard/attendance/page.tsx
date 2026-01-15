'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
    Clock,
    Calendar,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    XCircle,
    MapPin,
    X
} from 'lucide-react';
import { attendanceApi } from '@/lib/api/attendance';
import { formatDate, formatTime, cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, differenceInCalendarDays } from 'date-fns';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';

export default function AttendancePage() {
    const user = useAuthStore((state) => state.user);
    const isAdmin = ['COMPANY_ADMIN', 'HR_MANAGER'].includes(user?.role || '');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    const { data: history, isLoading } = useQuery({
        queryKey: ['attendanceHistory', startDate, endDate, isAdmin],
        queryFn: () => isAdmin
            ? attendanceApi.getHistory({ startDate, endDate, limit: 100 })
            : attendanceApi.getMyHistory({ startDate, endDate, limit: 100 }),
    });

    const filteredHistoryItems = useMemo(() => {
        if (!history?.items) return [];
        return history.items
            .filter((item: any) => differenceInCalendarDays(new Date(item.date), new Date()) <= 0)
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [history]);

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

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

        if (isAdmin) {
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
                    return record.checkInTime ? (
                        <div className="flex flex-col gap-1">
                            <span className="text-lime font-bold">
                                {formatTime(record.checkInTime)}
                            </span>
                            {record.lateMinutes > 0 && (
                                <span className="text-red-500 text-[10px] font-extrabold uppercase tracking-wide">
                                    Late: {record.lateMinutes}m
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
                    return record.checkOutTime ? (
                        <div className="flex flex-col gap-1">
                            <span className="text-white font-bold">
                                {formatTime(record.checkOutTime)}
                            </span>
                            {record.earlyLeavingMinutes > 0 && (
                                <span className="text-orange-500 text-[10px] font-extrabold uppercase tracking-wide">
                                    Early: {record.earlyLeavingMinutes}m
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
                cell: ({ row }) => (
                    <span className="font-bold text-zinc-300">
                        {Math.floor(row.original.totalWorkMinutes / 60)}h {row.original.totalWorkMinutes % 60}m
                    </span>
                ),
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
    }, [isAdmin]);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Attendance History</h1>
                    <p className="text-muted-foreground">View and track your attendance records</p>
                </div>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between bg-[#111111] border border-white/5 rounded-[1.5rem] p-4">
                <button
                    onClick={prevMonth}
                    className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-lg font-bold text-white">
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid sm:grid-cols-4 gap-4">
                {[
                    { label: 'Present Days', value: history?.summary?.present || 0, icon: CheckCircle },
                    { label: 'Absent Days', value: history?.summary?.absent || 0, icon: XCircle },
                    { label: 'Late Days', value: history?.summary?.late || 0, icon: Clock },
                    { label: 'Leave Days', value: history?.summary?.onLeave || 0, icon: Calendar },
                ].map((stat, i) => (
                    <div key={i} className="bg-[#111111] border border-white/5 rounded-[1.5rem] p-6 flex flex-col justify-between">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-full bg-zinc-900 border border-white/5 text-lime">
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <span className="text-4xl font-extrabold text-white tracking-tighter">{stat.value}</span>
                        </div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Attendance Records Table */}
            {isLoading ? (
                <div className="bg-[#111111] border border-white/5 rounded-[2rem] p-12 text-center text-zinc-500 animate-pulse">
                    Loading records...
                </div>
            ) : (
                <DataTable columns={columns} data={filteredHistoryItems} />
            )}

            {/* Location Modal */}
            {selectedLocation && (
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
            )}
        </div>
    );
}
