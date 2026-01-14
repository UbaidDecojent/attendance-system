'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api/notifications';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, Clock, Calendar, AlertCircle, Info, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NotificationsPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['notifications-all'],
        queryFn: () => notificationsApi.getMyNotifications(1, 50),
    });

    const readMutation = useMutation({
        mutationFn: (id: string) => notificationsApi.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-all'] });
        },
    });

    const readAllMutation = useMutation({
        mutationFn: notificationsApi.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-all'] });
            toast.success('All notifications marked as read');
        },
    });

    const notifications = data?.items || [];

    const getIcon = (type: string) => {
        switch (type) {
            case 'LEAVE_REQUEST':
                return <Calendar className="h-5 w-5 text-lime" />;
            case 'ATTENDANCE_LATE':
                return <Clock className="h-5 w-5 text-orange-400" />;
            case 'ATTENDANCE_ABSENT':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            case 'LEAVE_APPROVED':
                return <Check className="h-5 w-5 text-lime" />;
            case 'LEAVE_REJECTED':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Info className="h-5 w-5 text-zinc-400" />;
        }
    };

    const handleNotificationClick = (notification: any) => {
        if (!notification.isRead) {
            readMutation.mutate(notification.id);
        }

        if (['LEAVE_REQUEST', 'LEAVE_APPROVED', 'LEAVE_REJECTED'].includes(notification.type)) {
            router.push('/dashboard/leaves');
        } else if (['ATTENDANCE_LATE', 'ATTENDANCE_ABSENT'].includes(notification.type)) {
            router.push('/dashboard/attendance');
        }
    };

    return (
        <div className="w-full space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-4 transition-colors font-bold text-xs uppercase tracking-wider group"
                    >
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-white">Notifications</h1>
                </div>
                {notifications.length > 0 && (
                    <button
                        onClick={() => readAllMutation.mutate()}
                        disabled={readAllMutation.isPending}
                        className="bg-zinc-900 border border-white/10 hover:border-lime/50 text-white px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Check className="h-4 w-4 text-lime" />
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="bg-[#09090b] rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden">
                {isLoading ? (
                    <div className="p-20 text-center animate-pulse">
                        <div className="h-10 w-10 bg-zinc-800 rounded-full mx-auto mb-6" />
                        <div className="h-4 w-40 bg-zinc-800 rounded mx-auto" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-24 text-center text-zinc-500">
                        <div className="h-20 w-20 rounded-3xl bg-zinc-900 border border-white/5 mx-auto mb-6 flex items-center justify-center">
                            <Bell className="h-10 w-10 opacity-20" />
                        </div>
                        <p className="font-bold text-white text-xl">All caught up!</p>
                        <p className="text-sm mt-2 text-zinc-500 font-medium">No new notifications to check.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {notifications.map((notification: any) => (
                            <div
                                key={notification.id}
                                className={cn(
                                    "p-6 sm:p-8 hover:bg-white/[0.02] transition-all flex gap-6 cursor-pointer group relative overflow-hidden",
                                    !notification.isRead && "bg-lime/[0.02]"
                                )}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className={cn(
                                    "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-300",
                                    !notification.isRead
                                        ? "bg-zinc-900 border-lime/20 shadow-[0_0_15px_rgba(204,255,0,0.1)]"
                                        : "bg-zinc-900/50 border-white/5 group-hover:border-white/10"
                                )}>
                                    {getIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <div className="flex items-start justify-between gap-4">
                                        <p className={cn(
                                            "text-lg font-bold leading-tight truncate pr-4",
                                            !notification.isRead ? "text-white" : "text-zinc-400 group-hover:text-zinc-200 transition-colors"
                                        )}>
                                            {notification.title}
                                        </p>
                                        {!notification.isRead && (
                                            <span className="flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-lime opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-lime shadow-[0_0_10px_rgba(204,255,0,0.5)]"></span>
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-sm text-zinc-500 font-medium leading-relaxed mt-2 line-clamp-2 md:line-clamp-1 group-hover:text-zinc-400 transition-colors">
                                        {notification.message}
                                    </p>
                                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.05em] mt-3">
                                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                    </p>
                                </div>

                                {/* Hover indicator line */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-lime opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
