'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { employeesApi } from '@/lib/api/employees';
import { leavesApi } from '@/lib/api/leaves';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const schema = z.object({
    leaveTypeId: z.string().min(1, 'Select a leave type'),
    adjustment: z.number({ invalid_type_error: 'Must be a number' }).refine(val => val !== 0, 'Adjustment cannot be zero'),
    reason: z.string().min(3, 'Reason is required'),
});

type FormData = z.infer<typeof schema>;

interface ManageLeaveBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string;
    employeeName: string;
}

export default function ManageLeaveBalanceModal({
    isOpen,
    onClose,
    employeeId,
    employeeName,
}: ManageLeaveBalanceModalProps) {
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            adjustment: 0,
        },
    });

    const selectedTypeId = watch('leaveTypeId');

    // Fetch leave types (for dropdown) and employee balances (for display)
    const { data: leaveTypes, isLoading: isLoadingTypes } = useQuery({
        queryKey: ['leaveTypes', employeeId],
        queryFn: () => leavesApi.getLeaveTypes(), // EmployeeId not strictly needed for list, but useful if we want balances from response
    });

    // Actually, asking backend for types provides balances now if we pass user context, 
    // BUT we are viewing AS ADMIN. admin's getLeaveTypes returns admin's balance.
    // We need the EMPLOYEE'S balance.
    // So we should fetch employee details or use the separate getLeaveBalances endpoint.

    const { data: balances, isLoading: isLoadingBalances } = useQuery({
        queryKey: ['employeeBalances', employeeId],
        queryFn: () => employeesApi.getLeaveBalances(employeeId),
        enabled: isOpen,
    });

    const mutation = useMutation({
        mutationFn: (data: FormData) => employeesApi.updateLeaveBalance(employeeId, data),
        onSuccess: () => {
            toast.success('Leave balance updated successfully');
            queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
            queryClient.invalidateQueries({ queryKey: ['employeeBalances', employeeId] });
            onClose();
            reset();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update balance');
        },
    });

    const onSubmit = (data: FormData) => {
        mutation.mutate(data);
    };

    if (!isOpen) return null;

    const currentBalance = balances && selectedTypeId ? (balances[selectedTypeId] ?? 0) : null;
    const selectedType = leaveTypes?.find((t: any) => t.id === selectedTypeId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-xl font-semibold">Manage Leave Balance</h2>
                        <p className="text-sm text-muted-foreground">Adjust balance for {employeeName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    {/* Leave Type */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">Leave Type</label>
                        <select
                            {...register('leaveTypeId')}
                            className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                        >
                            <option value="">Select leave type</option>
                            {leaveTypes?.map((type: any) => (
                                <option key={type.id} value={type.id}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                        {errors.leaveTypeId && (
                            <p className="text-destructive text-sm mt-1">{errors.leaveTypeId.message}</p>
                        )}
                    </div>

                    {/* Current Balance Display */}
                    {selectedTypeId && (
                        <div className="bg-muted/50 p-4 rounded-xl flex items-center justify-between">
                            <span className="text-sm font-medium">Current Balance:</span>
                            <span className="font-bold text-lg">
                                {isLoadingBalances ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    currentBalance ?? selectedType?.defaultDays ?? 'N/A'
                                )}
                            </span>
                        </div>
                    )}

                    {/* Adjustment */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">Adjustment Amount</label>
                        <p className="text-xs text-muted-foreground mb-2">
                            Positive to add days, negative to deduct days.
                        </p>
                        <input
                            type="number"
                            step="0.5"
                            {...register('adjustment', { valueAsNumber: true })}
                            className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            placeholder="e.g. 5 or -2.5"
                        />
                        {errors.adjustment && (
                            <p className="text-destructive text-sm mt-1">{errors.adjustment.message}</p>
                        )}

                        {watch('adjustment') !== 0 && selectedTypeId && typeof currentBalance === 'number' && (
                            <p className="text-sm text-muted-foreground mt-2 text-right">
                                New Balance: <span className="font-medium text-foreground">
                                    {Number(currentBalance) + Number(watch('adjustment'))}
                                </span>
                            </p>
                        )}
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">Reason</label>
                        <textarea
                            {...register('reason')}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                            placeholder="Why is this adjustment being made?"
                        />
                        {errors.reason && (
                            <p className="text-destructive text-sm mt-1">{errors.reason.message}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl border font-medium hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                        >
                            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Update Balance
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
