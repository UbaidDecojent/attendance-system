'use client';

import { format } from 'date-fns';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { attendanceApi } from '@/lib/api/attendance';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface RegularizationListProps {
    requests: any[];
    isAdmin: boolean;
    onUpdate: () => void; // Refresh list
}

export function RegularizationList({ requests, isAdmin, onUpdate }: RegularizationListProps) {
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            setProcessingId(id);
            await attendanceApi.updateRegularization(id, { status });
            toast.success(`Request ${status.toLowerCase()}`);
            onUpdate();
        } catch (error) {
            toast.error('Failed to update request');
        } finally {
            setProcessingId(null);
        }
    };

    if (!requests || requests.length === 0) {
        return (
            <div className="text-center p-8 border border-white/5 rounded-2xl bg-[#111111]">
                <Clock className="mx-auto h-8 w-8 text-zinc-700 mb-3" />
                <h3 className="text-sm font-bold text-white">No Requests</h3>
                <p className="text-xs text-zinc-500 mt-1">
                    {isAdmin ? 'No pending regularization requests.' : "You haven't made any regularization requests."}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {requests.map((request) => (
                <div
                    key={request.id}
                    className="bg-[#111111] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center"
                >
                    {/* Info */}
                    <div className="flex-1 w-full">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={cn(
                                "px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide border",
                                request.status === 'PENDING' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                    request.status === 'APPROVED' ? "bg-lime/10 text-lime border-lime/20" :
                                        "bg-red-500/10 text-red-500 border-red-500/20"
                            )}>
                                {request.status}
                            </div>
                            <span className="text-xs font-bold text-zinc-500">
                                {format(new Date(request.date), 'MMM d, yyyy')}
                            </span>
                            {isAdmin && request.employee && (
                                <span className="text-xs font-bold text-white border-l border-white/10 pl-3">
                                    {request.employee.firstName} {request.employee.lastName}
                                </span>
                            )}
                        </div>

                        <div className="flex items-start gap-4">
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase">Correction</p>
                                <p className="text-sm font-bold text-white mt-0.5">
                                    {request.checkInTime ? 'Check In' : 'Check Out'}
                                    <span className="text-zinc-500 mx-1">at</span>
                                    {request.checkInTime
                                        ? format(new Date(request.checkInTime), 'h:mm a')
                                        : request.checkOutTime
                                            ? format(new Date(request.checkOutTime), 'h:mm a')
                                            : 'N/A'}
                                </p>
                            </div>
                            <div className="border-l border-white/10 pl-4 flex-1">
                                <p className="text-xs font-bold text-zinc-500 uppercase">Reason</p>
                                <p className="text-sm text-zinc-300 mt-0.5 line-clamp-1">{request.reason}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    {isAdmin && request.status === 'PENDING' && (
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => handleAction(request.id, 'APPROVED')}
                                disabled={!!processingId}
                                className="p-2 bg-lime/10 text-lime hover:bg-lime hover:text-black rounded-xl transition-all disabled:opacity-50"
                                title="Approve"
                            >
                                {processingId === request.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                            </button>
                            <button
                                onClick={() => handleAction(request.id, 'REJECTED')}
                                disabled={!!processingId}
                                className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all disabled:opacity-50"
                                title="Reject"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
