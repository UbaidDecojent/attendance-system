'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Loader2, Calendar, Clock, FileText } from 'lucide-react';
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

export function CorrectionRequestModal({ isOpen, onClose, onSuccess, defaultDate }: CorrectionRequestModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    useEffect(() => {
        if (isOpen) {
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
                </div>
            </div>
        </div>
    );
}
