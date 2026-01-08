'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
    Plus,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Filter
} from 'lucide-react';
import { leavesApi } from '@/lib/api/leaves';
import { useAuthStore } from '@/lib/stores/auth-store';
import { cn, formatDate, getStatusColor } from '@/lib/utils';
import { toast } from 'sonner';
import NewLeaveModal from './NewLeaveModal';

export default function LeavesPage() {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [showNewLeaveModal, setShowNewLeaveModal] = useState(false);

    const isManager = user?.role !== 'EMPLOYEE';

    const { data: leaves, isLoading } = useQuery({
        queryKey: ['leaves', statusFilter, page],
        queryFn: () => leavesApi.getAll({ status: statusFilter || undefined, page, limit: 10 }),
    });

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

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Leave Management</h1>
                    <p className="text-muted-foreground">
                        {isManager ? 'Manage team leave requests' : 'Request and track your leaves'}
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

            {/* Pending Approvals for Managers */}
            {isManager && pendingLeaves?.length > 0 && (
                <div className="glass-card rounded-2xl p-6">
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        Pending Approvals ({pendingLeaves.length})
                    </h2>
                    <div className="space-y-4">
                        {pendingLeaves.slice(0, 5).map((leave: any) => (
                            <div key={leave.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-medium">
                                        {leave.employee?.firstName?.charAt(0)}{leave.employee?.lastName?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium">{leave.employee?.firstName} {leave.employee?.lastName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {leave.leaveType?.name} • {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => rejectMutation.mutate(leave.id)}
                                        className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                                    >
                                        <XCircle className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => approveMutation.mutate(leave.id)}
                                        className="p-2 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors"
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
                    className="px-4 py-2.5 rounded-xl border bg-background input-focus-ring min-w-[150px]"
                >
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
            </div>

            {/* Leave Requests Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                {isManager && <th className="text-left py-4 px-6 font-medium">Employee</th>}
                                <th className="text-left py-4 px-6 font-medium">Leave Type</th>
                                <th className="text-left py-4 px-6 font-medium">Duration</th>
                                <th className="text-left py-4 px-6 font-medium">Days</th>
                                <th className="text-left py-4 px-6 font-medium">Reason</th>
                                <th className="text-left py-4 px-6 font-medium">Status</th>
                                {isManager && <th className="text-left py-4 px-6 font-medium">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={isManager ? 7 : 5} className="py-8 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : leaves?.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={isManager ? 7 : 5} className="py-8 text-center text-muted-foreground">
                                        No leave requests found
                                    </td>
                                </tr>
                            ) : (
                                leaves?.data?.map((leave: any) => (
                                    <tr key={leave.id} className="border-b table-row-hover">
                                        {isManager && (
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                                                        {leave.employee?.firstName?.charAt(0)}{leave.employee?.lastName?.charAt(0)}
                                                    </div>
                                                    <span className="font-medium">{leave.employee?.firstName} {leave.employee?.lastName}</span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="py-4 px-6">
                                            <span
                                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                                                style={{ backgroundColor: `${leave.leaveType?.color}20`, color: leave.leaveType?.color }}
                                            >
                                                {leave.leaveType?.name}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-sm">
                                                <p className="font-medium">{formatDate(leave.startDate, 'MMM d')}</p>
                                                <p className="text-muted-foreground">to {formatDate(leave.endDate, 'MMM d')}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="font-medium">{leave.totalDays}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-sm max-w-[200px] truncate">{leave.reason}</p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={cn(
                                                'inline-flex px-3 py-1 rounded-full text-xs font-medium',
                                                getStatusColor(leave.status)
                                            )}>
                                                {leave.status}
                                            </span>
                                        </td>
                                        {isManager && (
                                            <td className="py-4 px-6">
                                                {leave.status === 'PENDING' && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => approveMutation.mutate(leave.id)}
                                                            className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors"
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => rejectMutation.mutate(leave.id)}
                                                            className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {leaves?.meta && (
                <div className="flex items-center justify-between glass-card rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">
                        Page {page} of {leaves.meta.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 hover:bg-muted rounded-lg disabled:opacity-50"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(leaves.meta.totalPages, p + 1))}
                            disabled={page === leaves.meta.totalPages}
                            className="p-2 hover:bg-muted rounded-lg disabled:opacity-50"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}

            <NewLeaveModal
                isOpen={showNewLeaveModal}
                onClose={() => setShowNewLeaveModal(false)}
            />
        </div>
    );
}
