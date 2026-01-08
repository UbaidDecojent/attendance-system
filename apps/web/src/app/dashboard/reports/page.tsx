'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
    BarChart3,
    Download,
    Calendar,
    Users,
    Clock,
    TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line
} from 'recharts';
import api from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function ReportsPage() {
    const user = useAuthStore((state) => state.user);
    const isAdmin = ['COMPANY_ADMIN', 'HR_MANAGER'].includes(user?.role || '');
    const [reportType, setReportType] = useState('attendance');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const { data: analytics, isLoading } = useQuery({
        queryKey: ['analytics'],
        queryFn: async () => {
            const res = await api.get('/reports/analytics');
            return res.data.data;
        },
    });

    const hasAttendanceData = analytics?.attendanceTrend?.some((d: any) => d.count > 0);
    const hasWorkHoursData = analytics?.attendanceTrend?.some((d: any) => d.hours > 0);

    const { data: departmentReport } = useQuery({
        queryKey: ['departmentReport', month, year],
        queryFn: async () => {
            const res = await api.get('/reports/department', { params: { month, year } });
            return res.data.data;
        },
        enabled: isAdmin,
    });

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Reports & Analytics</h1>
                    <p className="text-muted-foreground">Insights and reports for your organization</p>
                </div>
                <button className="btn-premium inline-flex items-center gap-2 px-5 py-2.5">
                    <Download className="h-5 w-5" />
                    Export Report
                </button>
            </div>

            {/* Report Type Tabs */}
            <div className="flex gap-2 flex-wrap">
                {[
                    { id: 'attendance', label: 'Attendance', icon: Clock },
                    { id: 'department', label: 'Department', icon: Users },
                    { id: 'trends', label: 'Trends', icon: TrendingUp },
                ].filter(tab => isAdmin || tab.id !== 'department').map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setReportType(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${reportType === tab.id
                            ? 'bg-primary text-white'
                            : 'bg-muted hover:bg-muted/80'
                            }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-4">
                <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="px-4 py-2.5 rounded-xl border bg-background input-focus-ring"
                >
                    {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                            {new Date(2026, i).toLocaleString('default', { month: 'long' })}
                        </option>
                    ))}
                </select>
                <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="px-4 py-2.5 rounded-xl border bg-background input-focus-ring"
                >
                    {[2024, 2025, 2026].map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            {/* Charts Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Attendance Trend */}
                <div className={cn("stats-card", !isAdmin && "lg:col-span-2")}>
                    <h3 className="font-semibold mb-4">Weekly Attendance Trend</h3>
                    <div className="h-72">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground">Loading...</div>
                        ) : !hasAttendanceData ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                                <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
                                <p>No attendance data available</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics?.attendanceTrend || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis dataKey="day" stroke="#6B7280" />
                                    <YAxis stroke="#6B7280" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Department Distribution */}
                {isAdmin && (
                    <div className="stats-card">
                        <h3 className="font-semibold mb-4">Department Attendance</h3>
                        <div className="h-72">
                            {(!departmentReport?.departments?.length) ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                                    <Users className="h-8 w-8 mb-2 opacity-50" />
                                    <p>No department data</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={departmentReport?.departments?.slice(0, 5) || []}
                                            dataKey="totalAttendance"
                                            nameKey="department.name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            label={({ name }) => name}
                                        >
                                            {(departmentReport?.departments || []).map((_: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                )}

                {/* Monthly Overtime Trend */}
                <div className="stats-card lg:col-span-2">
                    <h3 className="font-semibold mb-4">Work Hours Overview</h3>
                    <div className="h-72">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground">Loading...</div>
                        ) : !hasWorkHoursData ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                                <Clock className="h-8 w-8 mb-2 opacity-50" />
                                <p>No work hours recorded</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analytics?.attendanceTrend || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis dataKey="day" stroke="#6B7280" />
                                    <YAxis stroke="#6B7280" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="hours"
                                        stroke="#4F46E5"
                                        strokeWidth={2}
                                        dot={{ fill: '#4F46E5', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Department Stats Table */}
            {isAdmin && (
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-6 border-b">
                        <h3 className="font-semibold">Department Summary</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="text-left py-4 px-6 font-medium">Department</th>
                                    <th className="text-left py-4 px-6 font-medium">Employees</th>
                                    <th className="text-left py-4 px-6 font-medium">Attendance Records</th>
                                    <th className="text-left py-4 px-6 font-medium">Avg Work Hours</th>
                                    <th className="text-left py-4 px-6 font-medium">Avg Late Minutes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {departmentReport?.departments?.map((dept: any, i: number) => (
                                    <tr key={i} className="border-b table-row-hover">
                                        <td className="py-4 px-6 font-medium">{dept.department?.name || 'Unknown'}</td>
                                        <td className="py-4 px-6">{dept.employeeCount}</td>
                                        <td className="py-4 px-6">{dept.totalAttendance}</td>
                                        <td className="py-4 px-6">{Math.round(dept.avgWorkMinutes / 60)}h</td>
                                        <td className="py-4 px-6">{dept.avgLateMinutes}m</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
