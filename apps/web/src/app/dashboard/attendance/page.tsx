'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
    Clock,
    Calendar,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    XCircle,
    Coffee,
    MapPin
} from 'lucide-react';
import { attendanceApi } from '@/lib/api/attendance';
import { formatDate, formatTime, cn, getStatusColor } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

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

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

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
            <div className="flex items-center justify-between glass-card rounded-xl p-4">
                <button
                    onClick={prevMonth}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-lg font-semibold">
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid sm:grid-cols-4 gap-4">
                {[
                    { label: 'Present Days', value: history?.summary?.present || 0, icon: CheckCircle, color: 'text-emerald-600' },
                    { label: 'Absent Days', value: history?.summary?.absent || 0, icon: XCircle, color: 'text-red-600' },
                    { label: 'Late Days', value: history?.summary?.late || 0, icon: Clock, color: 'text-amber-600' },
                    { label: 'Leave Days', value: history?.summary?.onLeave || 0, icon: Calendar, color: 'text-blue-600' },
                ].map((stat, i) => (
                    <div key={i} className="stats-card">
                        <stat.icon className={cn('h-8 w-8 mb-3', stat.color)} />
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Attendance Records Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="text-left py-4 px-6 font-medium">Date</th>
                                {isAdmin && <th className="text-left py-4 px-6 font-medium">Employee</th>}
                                <th className="text-left py-4 px-6 font-medium">Check In</th>
                                <th className="text-left py-4 px-6 font-medium">Check Out</th>
                                <th className="text-left py-4 px-6 font-medium">Work Hours</th>
                                <th className="text-left py-4 px-6 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : history?.items?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                        No attendance records for this month
                                    </td>
                                </tr>
                            ) : (
                                history?.items?.map((record: any) => (
                                    <tr key={record.id} className="border-b table-row-hover">
                                        <td className="py-4 px-6">
                                            <div className="font-medium">{formatDate(record.date, 'EEE, MMM d')}</div>
                                        </td>
                                        {isAdmin && (
                                            <td className="py-4 px-6">
                                                <div className="font-medium">{record.employee?.firstName} {record.employee?.lastName}</div>
                                                <div className="text-xs text-muted-foreground">{record.employee?.employeeCode}</div>
                                            </td>
                                        )}
                                        <td className="py-4 px-6">
                                            {record.checkInTime ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-emerald-600 font-medium">
                                                        {formatTime(record.checkInTime)}
                                                    </span>
                                                    {record.checkInLocation && (
                                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            {record.checkOutTime ? (
                                                <span className="text-blue-600 font-medium">
                                                    {formatTime(record.checkOutTime)}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="font-medium">
                                                {Math.floor(record.totalWorkMinutes / 60)}h {record.totalWorkMinutes % 60}m
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={cn(
                                                'inline-flex px-3 py-1 rounded-full text-xs font-medium',
                                                getStatusColor(record.status)
                                            )}>
                                                {record.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
