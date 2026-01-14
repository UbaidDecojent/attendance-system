'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import {
    BarChart3,
    Download,
    Calendar,
    Users,
    Clock,
    TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
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
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface DepartmentReportItem {
    department: {
        name: string;
    };
    employeeCount: number;
    totalAttendance: number;
    avgWorkMinutes: number;
    avgLateMinutes: number;
}

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

    const handleExport = () => {
        try {
            const dataToExport = isAdmin ? departmentReport?.departments : analytics?.attendanceTrend;

            if (!dataToExport || dataToExport.length === 0) {
                toast.error('No data available to export');
                return;
            }

            let headers = '';
            let csvContent = '';

            if (isAdmin) {
                headers = 'Department,Employees,Total Records,Avg Work Hours,Avg Late Minutes\n';
                csvContent = dataToExport.map((row: any) =>
                    `"${row.department?.name || 'Unknown'}",${row.employeeCount},${row.totalAttendance},${(row.avgWorkMinutes / 60).toFixed(1)},${row.avgLateMinutes}`
                ).join('\n');
            } else {
                headers = 'Date,Attendance Count,Work Hours\n';
                csvContent = dataToExport.map((row: any) =>
                    `"${row.day}",${row.count},${row.hours}`
                ).join('\n');
            }

            const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `report_${isAdmin ? 'departments' : 'attendance'}_${month}_${year}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success('Report downloaded successfully');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export report');
        }
    };

    const departmentColumns: ColumnDef<DepartmentReportItem>[] = useMemo(() => [
        {
            accessorKey: 'department.name',
            header: 'Department',
            cell: ({ row }) => <span className="font-bold text-white">{row.original.department?.name || 'Unknown'}</span>
        },
        {
            accessorKey: 'employeeCount',
            header: 'Employees',
            cell: ({ row }) => <span className="text-zinc-300">{row.original.employeeCount}</span>
        },
        {
            accessorKey: 'totalAttendance',
            header: 'Records',
            cell: ({ row }) => <span className="text-zinc-300">{row.original.totalAttendance}</span>
        },
        {
            accessorKey: 'avgWorkMinutes',
            header: 'Avg Hours',
            cell: ({ row }) => <span className="font-bold text-lime">{Math.round(row.original.avgWorkMinutes / 60)}h</span>
        },
        {
            accessorKey: 'avgLateMinutes',
            header: 'Avg Late',
            cell: ({ row }) => <span className="text-zinc-400">{row.original.avgLateMinutes}m</span>
        }
    ], []);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Reports & Analytics</h1>
                    <p className="text-muted-foreground">Insights and reports for your organization</p>
                </div>
                <button
                    onClick={handleExport}
                    className="btn-premium inline-flex items-center gap-2 px-5 py-2.5 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                >
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
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
                            reportType === tab.id
                                ? 'bg-lime text-black'
                                : 'bg-zinc-900 text-zinc-500 border border-white/5 hover:text-white'
                        )}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="appearance-none bg-zinc-900 border border-white/5 rounded-full pl-6 pr-10 py-3 text-sm font-bold text-white focus:outline-none focus:border-lime cursor-pointer min-w-[140px]"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {new Date(0, i).toLocaleString('default', { month: 'long' })}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>

                <div className="relative">
                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="appearance-none bg-zinc-900 border border-white/5 rounded-full pl-6 pr-10 py-3 text-sm font-bold text-white focus:outline-none focus:border-lime cursor-pointer min-w-[100px]"
                    >
                        {[2024, 2025, 2026].map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Attendance Trend */}
                <div className={cn("bg-[#111111] border border-white/5 rounded-[1.5rem] p-6", !isAdmin && "lg:col-span-2")}>
                    <h3 className="font-bold text-white mb-6">Weekly Attendance Trend</h3>
                    <div className="h-72">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center text-zinc-500 animate-pulse">Loading...</div>
                        ) : !hasAttendanceData ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-500 p-4 text-center">
                                <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
                                <p>No attendance data available</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics?.attendanceTrend || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="day" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#000',
                                            borderColor: '#333',
                                            borderRadius: '12px',
                                            color: '#fff'
                                        }}
                                        cursor={{ fill: '#ffffff10' }}
                                    />
                                    <Bar dataKey="count" fill="#CCFF00" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Department Distribution */}
                {isAdmin && (
                    <div className="bg-[#111111] border border-white/5 rounded-[1.5rem] p-6">
                        <h3 className="font-bold text-white mb-6">Department Attendance</h3>
                        <div className="h-72">
                            {(!departmentReport?.departments?.length) ? (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-500 p-4 text-center">
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
                                            innerRadius={60}
                                            outerRadius={100}
                                            stroke="#111"
                                            strokeWidth={2}
                                            paddingAngle={5}
                                            label={({ name }) => name}
                                        >
                                            {(departmentReport?.departments || []).map((_: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#000',
                                                borderColor: '#333',
                                                borderRadius: '12px',
                                                color: '#fff'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                )}

                {/* Monthly Overtime Trend */}
                <div className="bg-[#111111] border border-white/5 rounded-[1.5rem] p-6 lg:col-span-2">
                    <h3 className="font-bold text-white mb-6">Work Hours Overview</h3>
                    <div className="h-72">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center text-zinc-500 animate-pulse">Loading...</div>
                        ) : !hasWorkHoursData ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-500 p-4 text-center">
                                <Clock className="h-8 w-8 mb-2 opacity-50" />
                                <p>No work hours recorded</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analytics?.attendanceTrend || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="day" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#000',
                                            borderColor: '#333',
                                            borderRadius: '12px',
                                            color: '#fff'
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="hours"
                                        stroke="#CCFF00"
                                        strokeWidth={3}
                                        dot={{ fill: '#000', stroke: '#CCFF00', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, fill: '#CCFF00' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Department Stats Table */}
            {isAdmin && departmentReport?.departments && (
                <div className="space-y-4">
                    <h3 className="font-bold text-white px-2">Department Summary</h3>
                    <DataTable
                        columns={departmentColumns}
                        data={departmentReport.departments}
                    />
                </div>
            )}
        </div>
    );
}
