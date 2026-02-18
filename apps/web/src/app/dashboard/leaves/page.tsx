'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import {
    Plus,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Filter,
    Check,
    X
} from 'lucide-react';
import { leavesApi } from '@/lib/api/leaves';
import { useAuthStore } from '@/lib/stores/auth-store';
import { cn, formatDate, getStatusColor } from '@/lib/utils';
import { toast } from 'sonner';
import NewLeaveModal from './NewLeaveModal';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { employeesApi } from '@/lib/api/employees';
import ManageLeaveBalanceModal from '@/components/employees/ManageLeaveBalanceModal';

export default function LeavesPage() {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const [activeTab, setActiveTab] = useState<'requests' | 'balances'>('requests');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [balancesPage, setBalancesPage] = useState(1);
    const [showNewLeaveModal, setShowNewLeaveModal] = useState(false);
    const [selectedEmployeeForLeave, setSelectedEmployeeForLeave] = useState<{ id: string; name: string } | null>(null);

    const isManager = user?.role !== 'EMPLOYEE';

    // Leaves Query
    const { data: leaves, isLoading: isLoadingLeaves } = useQuery({
        queryKey: ['leaves', statusFilter, page],
        queryFn: () => leavesApi.getAll({ status: statusFilter || undefined, page, limit: 10 }),
        enabled: activeTab === 'requests',
    });

    // Employees Balances Query (for Manage Tab)
    const { data: employeesWithBalances, isLoading: isLoadingBalances, error: balancesError, isError } = useQuery({
        queryKey: ['employees-balances', balancesPage],
        queryFn: async () => {
            try {
                const res = await employeesApi.getAll({
                    page: balancesPage,
                    limit: 10,
                    includeLeaveBalances: true,
                });
                return res;
            } catch (err) {
                console.error('API Error in QueryFn:', err);
                throw err;
            }
        },
        enabled: activeTab === 'balances' && isManager,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
    });

    // Normalize the data structure (same as EmployeesPage)
    // Handles various response formats from API/Interceptor
    const { items: balanceItems, meta: balanceMeta } = useMemo(() => {
        if (!employeesWithBalances) {
            return { items: [], meta: null };
        }

        let items = [];
        let meta = { totalPages: 1, totalItems: 0 };

        // Check for standard response { data: [...], meta: ... }
        if (Array.isArray(employeesWithBalances.data)) {
            items = employeesWithBalances.data;
            meta = employeesWithBalances.meta;
        }
        // Check for direct array
        else if (Array.isArray(employeesWithBalances)) {
            items = employeesWithBalances;
        }
        // Check for service return { items: [...], meta: ... }
        else if (employeesWithBalances.items) {
            items = employeesWithBalances.items;
            meta = employeesWithBalances.meta;
        }
        // Handle nested data.data case (Axios + Interceptor double wrap)
        else if (employeesWithBalances.data?.items) {
            items = employeesWithBalances.data.items;
            meta = employeesWithBalances.data.meta;
        }

        return { items, meta };
    }, [employeesWithBalances]);


    if (isError) {
        console.error('Balances Query Hook Error:', balancesError);
    }

    const { data: pendingLeaves } = useQuery({
        queryKey: ['pendingLeaves'],
        queryFn: leavesApi.getPending,
        enabled: isManager,
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => leavesApi.approve(id),
        onSuccess: () => {
            toast.success('Leave approved');
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            queryClient.invalidateQueries({ queryKey: ['pendingLeaves'] });
        },
        onError: () => toast.error('Failed to approve leave'),
    });

    const rejectMutation = useMutation({
        mutationFn: (id: string) => leavesApi.reject(id, 'Request denied'),
        onSuccess: () => {
            toast.success('Leave rejected');
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            queryClient.invalidateQueries({ queryKey: ['pendingLeaves'] });
        },
        onError: () => toast.error('Failed to reject leave'),
    });

    // Columns for Leave REQUESTS
    const requestColumns: ColumnDef<any>[] = useMemo(() => {
        const cols: ColumnDef<any>[] = [];

        if (isManager) {
            cols.push({
                accessorKey: 'employee',
                header: 'Employee',
                cell: ({ row }) => (
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-white text-xs font-bold">
                            {row.original.employee?.firstName?.charAt(0)}{row.original.employee?.lastName?.charAt(0)}
                        </div>
                        <span className="font-bold text-white">{row.original.employee?.firstName} {row.original.employee?.lastName}</span>
                    </div>
                ),
            });
        }

        cols.push(
            {
                accessorKey: 'leaveType',
                header: 'Leave Type',
                cell: ({ row }) => (
                    <span
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border"
                        style={{
                            backgroundColor: `${row.original.leaveType?.color}10`,
                            color: row.original.leaveType?.color,
                            borderColor: `${row.original.leaveType?.color}20`
                        }}
                    >
                        {row.original.leaveType?.name}
                    </span>
                ),
            },
            {
                accessorKey: 'duration',
                header: 'Duration',
                cell: ({ row }) => (
                    <div className="text-sm">
                        <p className="font-bold text-white">{formatDate(row.original.startDate, 'MMM d')}</p>
                        <p className="text-xs text-zinc-500">to {formatDate(row.original.endDate, 'MMM d')}</p>
                    </div>
                ),
            },
            {
                accessorKey: 'totalDays',
                header: 'Days',
                cell: ({ row }) => (
                    <span className="font-bold text-zinc-300">{row.original.totalDays}</span>
                ),
            },
            {
                accessorKey: 'reason',
                header: 'Reason',
                cell: ({ row }) => (
                    <p className="text-sm text-zinc-400 max-w-[200px] truncate">{row.original.reason}</p>
                ),
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <span className={cn(
                        'inline-flex px-3 py-1.5 rounded-lg text-xs font-bold border',
                        row.original.status === 'APPROVED'
                            ? 'bg-lime text-black border-lime'
                            : row.original.status === 'REJECTED'
                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    )}>
                        {row.original.status}
                    </span>
                ),
            }
        );

        if (isManager) {
            cols.push({
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => {
                    const leave = row.original;
                    if (leave.status !== 'PENDING') return null;
                    return (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => approveMutation.mutate(leave.id)}
                                className="p-1.5 rounded-lg hover:bg-lime/20 text-lime transition-colors"
                                title="Approve"
                            >
                                <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => rejectMutation.mutate(leave.id)}
                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500 transition-colors"
                                title="Reject"
                            >
                                <XCircle className="h-4 w-4" />
                            </button>
                        </div>
                    );
                },
            });
        }

        return cols;
    }, [isManager]); // eslint-disable-line react-hooks/exhaustive-deps

    // Columns for MANAGE LEAVES
    const manageColumns: ColumnDef<any>[] = useMemo(() => [
        {
            accessorKey: 'employee',
            header: 'Employee',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-white text-xs font-bold">
                        {row.original.firstName?.charAt(0)}{row.original.lastName?.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-white">{row.original.firstName} {row.original.lastName}</p>
                        <p className="text-xs text-zinc-500">{row.original.designation?.name || 'No role'}</p>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'leavesTaken',
            header: 'Leaves Taken',
            cell: ({ row }) => (
                <span className="font-bold text-zinc-300">
                    {row.original.leaveSummary?.totalUsed ?? 0}
                </span>
            ),
        },
        {
            accessorKey: 'leaveBalance',
            header: 'Leave Balance (Remaining)',
            cell: ({ row }) => (
                <span className="font-bold text-zinc-300">
                    {row.original.leaveSummary?.totalRemaining ?? 0}
                </span>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <button
                    onClick={() => setSelectedEmployeeForLeave({
                        id: row.original.id,
                        name: `${row.original.firstName} ${row.original.lastName}`
                    })}
                    className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs font-medium transition-colors hover:text-white text-zinc-400"
                >
                    Edit Balance
                </button>
            ),
        },
    ], []);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Leave Management</h1>
                    <p className="text-muted-foreground">
                        {isManager ? 'Manage team leave requests and balances' : 'Request and track your leaves'}
                    </p>
                </div>
                {!isManager && (
                    <button
                        onClick={() => setShowNewLeaveModal(true)}
                        className="btn-premium inline-flex items-center gap-2 px-5 py-2.5"
                    >
                        <Plus className="h-5 w-5" />
                        Request Leave
                    </button>
                )}
            </div>

            {/* Manager Tabs */}
            {isManager && (
                <div className="flex items-center gap-2 border-b border-white/10 mb-6">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={cn(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'requests'
                                ? "border-lime text-lime"
                                : "border-transparent text-zinc-400 hover:text-white"
                        )}
                    >
                        Leave Requests
                    </button>
                    <button
                        onClick={() => setActiveTab('balances')}
                        className={cn(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'balances'
                                ? "border-lime text-lime"
                                : "border-transparent text-zinc-400 hover:text-white"
                        )}
                    >
                        Manage Leaves
                    </button>
                </div>
            )}

            {/* REQUESTS TAB CONTENT */}
            {activeTab === 'requests' && (
                <>
                    {/* Pending Approvals Widget */}
                    {isManager && pendingLeaves?.length > 0 && (
                        <div className="bg-[#111111] border border-white/5 rounded-[1.5rem] p-6">
                            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-lime" />
                                Pending Approvals ({pendingLeaves.length})
                            </h2>
                            <div className="space-y-3">
                                {pendingLeaves.slice(0, 5).map((leave: any) => (
                                    <div key={leave.id} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-white font-bold">
                                                {leave.employee?.firstName?.charAt(0)}{leave.employee?.lastName?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white">{leave.employee?.firstName} {leave.employee?.lastName}</p>
                                                <p className="text-xs text-zinc-500 font-medium">
                                                    {leave.leaveType?.name} • {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => rejectMutation.mutate(leave.id)}
                                                className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors border border-transparent hover:border-red-500/20"
                                            >
                                                <XCircle className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => approveMutation.mutate(leave.id)}
                                                className="p-2 rounded-lg hover:bg-lime/10 text-lime transition-colors border border-transparent hover:border-lime/20"
                                            >
                                                <CheckCircle className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex items-center gap-4">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 rounded-xl border border-white/10 bg-zinc-900 text-white focus:ring-2 focus:ring-lime focus:border-transparent outline-none min-w-[150px]"
                        >
                            <option value="">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>

                    {/* Leave Requests Table */}
                    {isLoadingLeaves ? (
                        <div className="bg-[#111111] border border-white/5 rounded-[2rem] p-12 text-center text-zinc-500 animate-pulse">
                            Loading requests...
                        </div>
                    ) : (
                        <DataTable
                            columns={requestColumns}
                            data={leaves?.data || []}
                            showPagination={false}
                            showSearch={false}
                        />
                    )}

                    {/* Pagination */}
                    {leaves?.meta && (
                        <div className="flex items-center justify-between bg-[#111111] border border-white/5 rounded-[1.5rem] p-4">
                            <p className="text-sm font-medium text-zinc-500">
                                Page <span className="text-white">{page}</span> of {leaves.meta.totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(leaves.meta.totalPages, p + 1))}
                                    disabled={page === leaves.meta.totalPages}
                                    className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* BALANCES TAB CONTENT */}
            {activeTab === 'balances' && isManager && (
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl px-2 font-semibold">Manage Leaves</h2>
                    </div>
                    <DataTable
                        columns={manageColumns}
                        data={balanceItems?.length > 0 ? balanceItems : []}
                        pageCount={balanceMeta?.totalPages || 1}
                        onPageChange={setBalancesPage}
                        pagination={{
                            pageSize: 10,
                            pageIndex: balancesPage,
                            total: balanceMeta?.totalItems || 0,
                        }}
                        isLoading={isLoadingBalances}
                    />
                </div>
            )}

            <NewLeaveModal
                isOpen={showNewLeaveModal}
                onClose={() => setShowNewLeaveModal(false)}
            />

            {
                selectedEmployeeForLeave && (
                    <ManageLeaveBalanceModal
                        isOpen={!!selectedEmployeeForLeave}
                        onClose={() => {
                            setSelectedEmployeeForLeave(null);
                            queryClient.invalidateQueries({ queryKey: ['employees-balances'] });
                        }}
                        employeeId={selectedEmployeeForLeave.id}
                        employeeName={selectedEmployeeForLeave.name}
                    />
                )
            }
        </div >
    );
}
