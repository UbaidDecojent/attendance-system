'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { timeLogsApi, TimeLogStatus } from '@/lib/api/timelogs';
import { BillingType } from '@/lib/api/tasks';
import { projectsApi } from '@/lib/api/projects';
import { employeesApi } from '@/lib/api/employees';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Plus, Filter, Download, FileText, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import TimeLogTable from '@/components/timelogs/timelog-table';
import CreateTimeLogSheet from '@/components/timelogs/create-timelog-sheet';
import ZohoDatePicker from '@/components/ui/zoho-date-picker';
import TimeLogFilterSidebar from '@/components/timelogs/timelog-filter-sidebar';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function TimeLogsPage() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [logToEdit, setLogToEdit] = useState<any>(null);

    // Initial Date Range: Current Month
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });

    // Filters State - Expanded for Sidebar
    const [filters, setFilters] = useState({
        projectIds: [] as string[],
        userIds: [] as string[],
        status: '' as TimeLogStatus | '',
        billingType: '' as BillingType | '',
        clientNames: [] as string[],
        approvedBy: ''
    });

    // Helper to format minutes for DISPLAY (HH:MM)
    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60).toString().padStart(2, '0');
        const m = (minutes % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
    };

    // Helper for DECIMAL hours (Export)
    const formatDecimalHours = (minutes: number) => {
        return (minutes / 60).toFixed(2);
    };

    // Fetch Options
    const { data: projectsResponse } = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.getAll() });
    const projects = Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse as any)?.data || [];

    const { data: employeesResponse } = useQuery({ queryKey: ['employees'], queryFn: () => employeesApi.getAll({ limit: 1000 }) });

    // Robust extraction strategy
    const employees = (() => {
        const res = employeesResponse as any;
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (res.data && Array.isArray(res.data)) return res.data;
        if (res.data?.items && Array.isArray(res.data.items)) return res.data.items;
        if (res.data?.data?.items && Array.isArray(res.data.data.items)) return res.data.data.items; // Potential double wrap
        if (res.items && Array.isArray(res.items)) return res.items; // Direct
        return [];
    })();

    // Fetch Logs
    const { data: logs = [], isLoading } = useQuery({
        queryKey: ['time-logs', filters, dateRange],
        queryFn: () => timeLogsApi.getAll({
            projectIds: filters.projectIds,
            userIds: filters.userIds,
            status: filters.status || undefined,
            billingType: filters.billingType || undefined,
            clientNames: filters.clientNames,
            startDate: format(dateRange.from, 'yyyy-MM-dd'),
            endDate: format(dateRange.to, 'yyyy-MM-dd')
        })
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' | 'PENDING' }) =>
            timeLogsApi.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['time-logs'] });
            toast.success('Time log status updated');
        },
        onError: () => toast.error('Failed to update status')
    });

    const handleStatusUpdate = (id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
        statusMutation.mutate({ id, status });
    };

    const handleEdit = (log: any) => {
        setLogToEdit(log);
        setIsCreateOpen(true);
    };

    const handleCreateOpen = () => {
        setLogToEdit(null);
        setIsCreateOpen(true);
    };

    // Export Logic
    const handleExport = () => {
        if (!logs.length) {
            toast.error("No logs to export");
            return;
        }

        const dataToExport = logs.map((log: any) => ({
            "Date": format(new Date(log.date), 'dd/MM/yyyy'),
            "Employee": `${log.employee?.firstName} ${log.employee?.lastName}`,
            "Project": log.project?.title || 'N/A',
            "Task": log.task?.name || 'N/A',
            "Duration (Hours)": Number(formatDecimalHours(log.durationMinutes)),
            "Billing Status": log.billingType === 'BILLABLE' ? 'Billable' : 'Non-Billable',
            "Approval Status": log.status
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wscols = [
            { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
        ];
        ws['!cols'] = wscols;
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Time Logs");
        const rangeText = format(dateRange.from, 'dd-MM-yyyy') + "_to_" + format(dateRange.to, 'dd-MM-yyyy');
        XLSX.writeFile(wb, `TimeLogs_${rangeText}.xlsx`);
        toast.success("Time logs exported successfully");
    };

    const handleExportPDF = () => {
        if (!logs.length) {
            toast.error("No logs to export");
            return;
        }

        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text("Time Logs Report", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Period: ${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`, 14, 30);
        doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 35);

        // Table
        const tableData = logs.map((log: any) => [
            format(new Date(log.date), 'dd/MM/yyyy'),
            `${log.employee?.firstName} ${log.employee?.lastName}`,
            log.project?.title || '-',
            log.task?.name || '-',
            formatDecimalHours(log.durationMinutes),
            log.billingType === 'BILLABLE' ? 'Billable' : 'Non-Billable',
            log.status
        ]);

        autoTable(doc, {
            head: [['Date', 'Employee', 'Project', 'Task', 'Hrs', 'Billing', 'Status']],
            body: tableData,
            startY: 40,
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
                0: { cellWidth: 20 },
                4: { cellWidth: 15, halign: 'right' },
                6: { cellWidth: 20 }
            }
        });

        const rangeText = format(dateRange.from, 'dd-MM-yyyy') + "_to_" + format(dateRange.to, 'dd-MM-yyyy');
        doc.save(`TimeLogs_${rangeText}.pdf`);
        toast.success("PDF exported successfully");
    };

    const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER'].includes(user?.role || '');
    const currentEmployeeId = (user as any)?.employee?.id || (user as any)?.employeeId;

    // Calc Totals
    const totalMinutes = logs.reduce((acc: number, log: any) => acc + log.durationMinutes, 0);
    const billableMinutes = logs.filter((l: any) => l.billingType === 'BILLABLE').reduce((acc: number, l: any) => acc + l.durationMinutes, 0);
    const nonBillableMinutes = totalMinutes - billableMinutes;

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Time Logs</h1>
                        <p className="text-zinc-400">Track and manage time sheets</p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-zinc-900/50 p-2 rounded-xl border border-white/5">

                    {/* Left: Date Picker */}
                    <div className="w-full lg:w-auto">
                        <ZohoDatePicker
                            dateRange={dateRange}
                            onChange={setDateRange}
                        />
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">

                        {/* Filter Button */}
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className={`p-2 border rounded-lg transition-all ${isFilterOpen ? 'bg-lime text-black border-lime' : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'}`}
                            title="Filter Logs"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                        </button>

                        <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block"></div>

                        <button
                            onClick={handleExportPDF}
                            className="p-2 bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white rounded-lg transition-all hidden sm:block"
                            title="Export to PDF"
                        >
                            <FileText className="h-4 w-4" />
                        </button>

                        <button
                            onClick={handleExport}
                            className="p-2 bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white rounded-lg transition-all hidden sm:block"
                            title="Export to Excel"
                        >
                            <Download className="h-4 w-4" />
                        </button>
                        <button
                            onClick={handleCreateOpen}
                            className="flex items-center gap-2 px-4 py-1.5 bg-lime text-black rounded-lg font-bold hover:bg-lime/90 transition-all text-sm shadow-[0_0_15px_rgba(204,255,0,0.15)] hover:shadow-[0_0_20px_rgba(204,255,0,0.25)]"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Add Log</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
                <div className="flex-1 overflow-auto bg-zinc-950/30 p-4 custom-scrollbar">
                    <TimeLogTable
                        logs={logs}
                        isAdmin={isAdmin}
                        currentEmployeeId={currentEmployeeId}
                        onStatusUpdate={handleStatusUpdate}
                        onEdit={handleEdit}
                    />
                    {logs.length === 0 && !isLoading && (
                        <div className="text-center text-zinc-500 py-20">No time logs found.</div>
                    )}
                </div>

                {/* Footer Stats */}
                <div className="bg-zinc-900/90 backdrop-blur-sm border-t border-white/10 p-4 flex justify-between items-center text-sm shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.2)] z-10">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3 bg-zinc-950/50 px-3 py-1.5 rounded-lg border border-white/5">
                            <span className="text-lime font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-lime"></span>
                                Billable:
                            </span>
                            <span className="text-white font-mono font-bold text-base">{formatDuration(billableMinutes)} h</span>
                        </div>
                        <div className="flex items-center gap-3 bg-zinc-950/50 px-3 py-1.5 rounded-lg border border-white/5">
                            <span className="text-orange-400 font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                Non-Billable:
                            </span>
                            <span className="text-white font-mono font-bold text-base">{formatDuration(nonBillableMinutes)} h</span>
                        </div>
                        <div className="h-8 w-px bg-white/10 mx-2"></div>
                        <div className="flex items-center gap-3">
                            <span className="text-zinc-400 font-medium">Total Hours:</span>
                            <span className="text-white font-mono font-bold text-lg tracking-tight">{formatDuration(totalMinutes)} h</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 text-zinc-500 bg-zinc-950/30 px-3 py-1.5 rounded-lg border border-white/5">
                        <span className="text-xs uppercase tracking-wider font-semibold">Total Logs</span>
                        <span className="text-white font-mono font-bold">{logs.length}</span>
                    </div>
                </div>
            </div>

            <CreateTimeLogSheet
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                logToEdit={logToEdit}
            />

            <TimeLogFilterSidebar
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                onApply={setFilters}
                initialFilters={filters}
                projects={projects}
                employees={employees}
                isAdmin={isAdmin}
            />
        </div>
    );
}
