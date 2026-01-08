'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { leavesApi } from '@/lib/api/leaves';
import { cn } from '@/lib/utils';

const leaveSchema = z.object({
    leaveTypeId: z.string().min(1, 'Please select a leave type'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().min(5, 'Reason must be at least 5 characters'),
    isHalfDay: z.boolean().optional(),
    halfDayType: z.string().optional(),
}).refine((data) => {
    if (data.isHalfDay && !data.halfDayType) {
        return false;
    }
    return true;
}, {
    message: "Please select half day type",
    path: ["halfDayType"],
}).refine((data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end >= start;
}, {
    message: "End date must be after start date",
    path: ["endDate"],
});

type LeaveForm = z.infer<typeof leaveSchema>;

interface NewLeaveModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NewLeaveModal({ isOpen, onClose }: NewLeaveModalProps) {
    const queryClient = useQueryClient();

    // Fetch leave types
    const { data: leaveTypes, isLoading: isLoadingTypes } = useQuery({
        queryKey: ['leaveTypes'],
        queryFn: leavesApi.getLeaveTypes,
    });

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<LeaveForm>({
        resolver: zodResolver(leaveSchema),
        defaultValues: {
            isHalfDay: false,
        },
    });

    const isHalfDay = watch('isHalfDay');

    const createMutation = useMutation({
        mutationFn: (data: LeaveForm) => leavesApi.create(data),
        onSuccess: () => {
            toast.success('Leave request submitted successfully');
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            reset();
            onClose();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to submit leave request');
        },
    });

    const onSubmit = (data: LeaveForm) => {
        createMutation.mutate(data);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background rounded-2xl w-full max-w-lg shadow-xl border animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-xl font-bold">Request Leave</h2>
                        <p className="text-muted-foreground text-sm">Submit a new leave request</p>
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
                        {isLoadingTypes ? (
                            <div className="h-10 w-full bg-muted animate-pulse rounded-xl" />
                        ) : (
                            <div className="relative">
                                <select
                                    {...register('leaveTypeId')}
                                    className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                                >
                                    <option value="">Select leave type</option>
                                    {Array.isArray(leaveTypes) && leaveTypes.map((type: any) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name} (Balance: {type.balance ?? 'N/A'})
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                                    <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        )}
                        {errors.leaveTypeId && (
                            <p className="text-destructive text-sm mt-1">{errors.leaveTypeId.message}</p>
                        )}
                        {!isLoadingTypes && (!leaveTypes || leaveTypes.length === 0) && (
                            <p className="text-amber-500 text-sm mt-2 flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" />
                                No leave types found. Please contact admin.
                            </p>
                        )}
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Start Date</label>
                            <input
                                type="date"
                                {...register('startDate')}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                            {errors.startDate && (
                                <p className="text-destructive text-sm mt-1">{errors.startDate.message}</p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">End Date</label>
                            <input
                                type="date"
                                {...register('endDate')}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                            {errors.endDate && (
                                <p className="text-destructive text-sm mt-1">{errors.endDate.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Half Day Option */}
                    <div className="space-y-4 pt-2 border-t">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                {...register('isHalfDay')}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary transition-all"
                            />
                            <span className="text-sm font-medium group-hover:text-primary transition-colors">Apply for Half Day Leave</span>
                        </label>

                        {isHalfDay && (
                            <div className="grid grid-cols-2 gap-4 pl-8 animate-in slide-in-from-top-2 duration-200">
                                <label className={cn(
                                    "p-3 text-sm border rounded-xl cursor-pointer text-center hover:bg-muted/50 transition-all",
                                    watch('halfDayType') === 'FIRST_HALF'
                                        ? "border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary/20"
                                        : "bg-card text-muted-foreground"
                                )}>
                                    <input
                                        type="radio"
                                        value="FIRST_HALF"
                                        {...register('halfDayType')}
                                        className="sr-only"
                                    />
                                    First Half
                                </label>
                                <label className={cn(
                                    "p-3 text-sm border rounded-xl cursor-pointer text-center hover:bg-muted/50 transition-all",
                                    watch('halfDayType') === 'SECOND_HALF'
                                        ? "border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary/20"
                                        : "bg-card text-muted-foreground"
                                )}>
                                    <input
                                        type="radio"
                                        value="SECOND_HALF"
                                        {...register('halfDayType')}
                                        className="sr-only"
                                    />
                                    Second Half
                                </label>
                            </div>
                        )}
                        {errors.halfDayType && (
                            <p className="text-destructive text-sm mt-1 pl-8">{errors.halfDayType.message}</p>
                        )}
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">Reason</label>
                        <textarea
                            {...register('reason')}
                            rows={3}
                            placeholder="Please provide a reason for your leave..."
                            className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                        />
                        {errors.reason && (
                            <p className="text-destructive text-sm mt-1">{errors.reason.message}</p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl border hover:bg-muted transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="px-6 py-2.5 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-medium hover:from-primary/90 hover:to-purple-600/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center gap-2"
                        >
                            {createMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Request'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
