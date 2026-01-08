'use client';

import { useQuery } from '@tanstack/react-query';
import {
    Users,
    Clock,
    Calendar,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle,
    XCircle,
    AlertCircle,
    PlayCircle,
    PauseCircle
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { attendanceApi } from '@/lib/api/attendance';
import { formatTime, cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);
    const [checkingIn, setCheckingIn] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);

    const { data: todayStatus, refetch } = useQuery({
        queryKey: ['todayStatus'],
        queryFn: () => attendanceApi.getTodayStatus(),
        enabled: user?.role === 'EMPLOYEE',
    });

    const { data: dashboardStats } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: () => attendanceApi.getDashboard(),
        enabled: user?.role !== 'EMPLOYEE',
    });

    const handleCheckIn = async () => {
        setCheckingIn(true);
        try {
            await attendanceApi.checkIn({ type: 'OFFICE' });
            toast.success('Checked in successfully!');
            refetch();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Check-in failed');
        } finally {
            setCheckingIn(false);
        }
    };

    const handleCheckOut = async () => {
        setCheckingOut(true);
        try {
            await attendanceApi.checkOut({});
            toast.success('Checked out successfully!');
            refetch();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Check-out failed');
        } finally {
            setCheckingOut(false);
        }
    };

    const isEmployee = user?.role === 'EMPLOYEE';

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold">
                    Welcome back, {user?.firstName}! 👋
                </h1>
                <p className="text-muted-foreground mt-1">
                    Here's what's happening with your {isEmployee ? 'attendance' : 'team'} today.
                </p>
            </div>

            {/* Employee View - Quick Actions */}
            {isEmployee && (
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold">Today's Attendance</h2>
                            <p className="text-sm text-muted-foreground">
                                {new Date().toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            {todayStatus?.attendance?.checkInTime && (
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Check In</p>
                                    <p className="text-lg font-semibold text-emerald-600">
                                        {formatTime(todayStatus.attendance.checkInTime)}
                                    </p>
                                </div>
                            )}

                            {todayStatus?.attendance?.checkOutTime && (
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Check Out</p>
                                    <p className="text-lg font-semibold text-blue-600">
                                        {formatTime(todayStatus.attendance.checkOutTime)}
                                    </p>
                                </div>
                            )}

                            {!todayStatus?.attendance?.checkInTime ? (
                                <button
                                    onClick={handleCheckIn}
                                    disabled={checkingIn}
                                    className="btn-premium flex items-center gap-2 px-6 py-3"
                                >
                                    <PlayCircle className="h-5 w-5" />
                                    {checkingIn ? 'Checking In...' : 'Check In'}
                                </button>
                            ) : !todayStatus?.attendance?.checkOutTime ? (
                                <button
                                    onClick={handleCheckOut}
                                    disabled={checkingOut}
                                    className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium px-6 py-3 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity"
                                >
                                    <PauseCircle className="h-5 w-5" />
                                    {checkingOut ? 'Checking Out...' : 'Check Out'}
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 rounded-xl">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="font-medium">Day Complete</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {todayStatus?.attendance && (
                        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                            <div>
                                <p className="text-sm text-muted-foreground">Work Hours</p>
                                <p className="text-xl font-semibold">
                                    {Math.floor((todayStatus.attendance.totalWorkMinutes || 0) / 60)}h{' '}
                                    {(todayStatus.attendance.totalWorkMinutes || 0) % 60}m
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Late By</p>
                                <p className={cn(
                                    'text-xl font-semibold',
                                    todayStatus.attendance.lateMinutes > 0 ? 'text-amber-600' : 'text-emerald-600'
                                )}>
                                    {todayStatus.attendance.lateMinutes || 0}m
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <span className={cn(
                                    'inline-block px-3 py-1 rounded-full text-sm font-medium mt-1',
                                    todayStatus.attendance.status === 'PRESENT'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                )}>
                                    {todayStatus.attendance.status?.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Manager/Admin View - Stats Cards */}
            {!isEmployee && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="stats-card">
                        <div className="flex items-center justify-between">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Users className="h-6 w-6 text-primary" />
                            </div>
                            <span className="flex items-center gap-1 text-sm text-emerald-600">
                                <ArrowUpRight className="h-4 w-4" />
                                12%
                            </span>
                        </div>
                        <div className="mt-4">
                            <p className="text-2xl font-bold">{dashboardStats?.today?.totalEmployees || 0}</p>
                            <p className="text-sm text-muted-foreground">Total Employees</p>
                        </div>
                    </div>

                    <div className="stats-card">
                        <div className="flex items-center justify-between">
                            <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-emerald-600" />
                            </div>
                            <span className="text-sm text-muted-foreground">Today</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-2xl font-bold">{dashboardStats?.today?.present || 0}</p>
                            <p className="text-sm text-muted-foreground">Present</p>
                        </div>
                    </div>

                    <div className="stats-card">
                        <div className="flex items-center justify-between">
                            <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <XCircle className="h-6 w-6 text-red-600" />
                            </div>
                            <span className="text-sm text-muted-foreground">Today</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-2xl font-bold">{dashboardStats?.today?.absent || 0}</p>
                            <p className="text-sm text-muted-foreground">Absent</p>
                        </div>
                    </div>

                    <div className="stats-card">
                        <div className="flex items-center justify-between">
                            <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 text-amber-600" />
                            </div>
                            <span className="text-sm text-muted-foreground">Today</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-2xl font-bold">{dashboardStats?.today?.late || 0}</p>
                            <p className="text-sm text-muted-foreground">Late Arrivals</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Additional Stats */}
            {!isEmployee && (
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Attendance Rate */}
                    <div className="stats-card">
                        <h3 className="font-semibold mb-4">Monthly Attendance Rate</h3>
                        <div className="flex items-end gap-4">
                            <div className="text-4xl font-bold gradient-text">
                                {dashboardStats?.monthly?.attendanceRate || 0}%
                            </div>
                            <div className="flex items-center gap-1 text-sm text-emerald-600 mb-2">
                                <TrendingUp className="h-4 w-4" />
                                +2.5% from last month
                            </div>
                        </div>
                        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full transition-all"
                                style={{ width: `${dashboardStats?.monthly?.attendanceRate || 0}%` }}
                            />
                        </div>
                    </div>

                    {/* On Leave Today */}
                    <div className="stats-card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">On Leave Today</h3>
                            <span className="text-sm text-muted-foreground">
                                {dashboardStats?.today?.onLeave || 0} employees
                            </span>
                        </div>
                        <div className="space-y-3">
                            {/* Placeholder for leave list */}
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No employees on leave today
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="glass-card rounded-2xl p-6">
                <h3 className="font-semibold mb-4">Quick Actions</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'View Attendance', href: '/dashboard/attendance', icon: Clock },
                        { label: 'Request Leave', href: '/dashboard/leaves', icon: Calendar },
                        { label: 'View Reports', href: '/dashboard/reports', icon: TrendingUp },
                        { label: 'Team Directory', href: '/dashboard/employees', icon: Users },
                    ].map((action, i) => (
                        <a
                            key={i}
                            href={action.href}
                            className="flex items-center gap-3 p-4 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                        >
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <action.icon className="h-5 w-5 text-primary" />
                            </div>
                            <span className="font-medium">{action.label}</span>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
