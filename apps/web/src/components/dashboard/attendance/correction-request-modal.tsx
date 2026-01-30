'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Loader2, Calendar, Clock, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { attendanceApi } from '@/lib/api/attendance';
import { format } from 'date-fns';

const schema = z.object({
    date: z.string().min(1, 'Date is required'), // YYYY-MM-DD
    type: z.enum(['CHECK_IN', 'CHECK_OUT']),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'), // HH:mm
    reason: z.string().min(5, 'Reason must be at least 5 characters'),
});

type FormValues = z.infer<typeof schema>;

interface CorrectionRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultDate?: Date;
}

interface LimitInfo {
    used: number;
    remaining: number;
    limit: number;
    resetsOn: string;
    resetsOnFormatted: string;
}

export function CorrectionRequestModal({ isOpen, onClose, onSuccess, defaultDate }: CorrectionRequestModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null);
    const [loadingLimit, setLoadingLimit] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            type: 'CHECK_IN',
            date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            time: '09:00', // Default
        },
    });

    // Fetch limit info when modal opens
    useEffect(() => {
        if (isOpen) {
            setLoadingLimit(true);
            attendanceApi.getRegularizationLimit()
                .then((data) => setLimitInfo(data))
                .catch(() => setLimitInfo(null))
                .finally(() => setLoadingLimit(false));

            reset({
                type: 'CHECK_IN',
                date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                time: '09:00',
                reason: ''
            });
        }
    }, [isOpen, defaultDate, reset]);

    const onSubmit = async (data: FormValues) => {
        try {
            setIsSubmitting(true);

            // Combine date and time
            // The backend expects ISO Dates for checkInTime/checkOutTime
            // We need to create a Date object from "YYYY-MM-DD" + "HH:mm"
            const dateTimeStr = `${data.date}T${data.time}:00`;
            const dateTime = new Date(dateTimeStr); // Local time

            const payload = {
                date: data.date,
                reason: data.reason,
                checkInTime: data.type === 'CHECK_IN' ? dateTime.toISOString() : undefined,
                checkOutTime: data.type === 'CHECK_OUT' ? dateTime.toISOString() : undefined,
            };

            await attendanceApi.createRegularization(payload);
            toast.success('Request submitted successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to submit request');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <h3 className="text-lg font-bold text-white">Request Correction</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Limit Status Banner */}
                    {loadingLimit ? (
                        <div className="mb-4 p-3 bg-zinc-900 rounded-xl flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                            <span className="text-sm text-zinc-400">Loading...</span>
                        </div>
                    ) : limitInfo && (
                        <div className={`mb-4 p-3 rounded-xl border ${limitInfo.remaining === 0
                            ? 'bg-red-500/10 border-red-500/30'
                            : limitInfo.remaining === 1
                                ? 'bg-amber-500/10 border-amber-500/30'
                                : 'bg-zinc-900 border-white/10'
                            }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {limitInfo.remaining === 0 ? (
                                        <AlertCircle className="h-4 w-4 text-red-400" />
                                    ) : (
                                        <FileText className="h-4 w-4 text-zinc-400" />
                                    )}
                                    <span className="text-sm font-medium text-white">
                                        Monthly Requests
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {Array.from({ length: limitInfo.limit }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-2 w-2 rounded-full ${i < limitInfo.used
                                                ? 'bg-lime'
                                                : 'bg-zinc-700'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <p className={`text-xs mt-1.5 ${limitInfo.remaining === 0 ? 'text-red-400' : 'text-zinc-500'
                                }`}>
                                {limitInfo.remaining === 0
                                    ? `No requests remaining. Resets on ${limitInfo.resetsOnFormatted}`
                                    : `${limitInfo.used} of ${limitInfo.limit} used • ${limitInfo.remaining} remaining`
                                }
                            </p>
                        </div>
                    )}

                    {/* Show form only if requests remaining */}
                    {limitInfo && limitInfo.remaining === 0 ? (
                        <div className="text-center py-6">
                            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3 opacity-50" />
                            <p className="text-zinc-400 text-sm">
                                You have used all {limitInfo.limit} correction requests this month.
                            </p>
                            <p className="text-zinc-500 text-xs mt-1">
                                Your limit will reset on {limitInfo.resetsOnFormatted}
                            </p>
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-4 px-4 py-2 rounded-xl text-sm font-bold bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                            {/* Date */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Date
                                </label>
                                <input
                                    type="date"
                                    {...register('date')}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-lime/50 transition-colors"
                                />
                                {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
                            </div>

                            {/* Type */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                                        Correction For
                                    </label>
                                    <select
                                        {...register('type')}
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-lime/50 transition-colors"
                                    >
                                        <option value="CHECK_IN">Check In</option>
                                        <option value="CHECK_OUT">Check Out</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        Correct Time
                                    </label>
                                    <input
                                        type="time"
                                        {...register('time')}
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-lime/50 transition-colors"
                                    />
                                    {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time.message}</p>}
                                </div>
                            </div>

                            {/* Reason */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" />
                                    Reason
                                </label>
                                <textarea
                                    {...register('reason')}
                                    rows={3}
                                    placeholder="Why do you need this correction?"
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-lime/50 transition-colors resize-none"
                                />
                                {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
                            </div>

                            {/* Actions */}
                            <div className="pt-2 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 rounded-xl text-sm font-bold bg-lime text-black hover:bg-lime/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Submit Request
                                </button>
                            </div>

                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
