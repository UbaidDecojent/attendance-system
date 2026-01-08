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
                return <Calendar className="h-4 w-4 text-blue-500" />;
            case 'ATTENDANCE_LATE':
                return <Clock className="h-4 w-4 text-amber-500" />;
            case 'ATTENDANCE_ABSENT':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            case 'LEAVE_APPROVED':
                return <Check className="h-4 w-4 text-emerald-500" />;
            case 'LEAVE_REJECTED':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Info className="h-4 w-4 text-gray-500" />;
        }
    };

    const handleNotificationClick = (notification: any) => {
        if (!notification.isRead) {
            readMutation.mutate(notification.id);
        }

        // Redirect based on type
        if (['LEAVE_REQUEST', 'LEAVE_APPROVED', 'LEAVE_REJECTED'].includes(notification.type)) {
            router.push('/dashboard/leaves');
        } else if (['ATTENDANCE_LATE', 'ATTENDANCE_ABSENT'].includes(notification.type)) {
            // If attendance page exists, redirect. Default to dashboard for now?
            // Or attendance module if built.
            router.push('/dashboard/attendance');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-2xl font-bold">Notifications</h1>
                </div>
                {notifications.length > 0 && (
                    <button
                        onClick={() => readAllMutation.mutate()}
                        disabled={readAllMutation.isPending}
                        className="text-sm text-primary hover:underline disabled:opacity-50"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="bg-card rounded-xl border shadow-sm divide-y">
                {isLoading ? (
                    <div className="p-12 text-center text-muted-foreground">
                        Loading...
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                        <Bell className="h-10 w-10 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No notifications</p>
                        <p className="text-sm">You're all caught up!</p>
                    </div>
                ) : (
                    notifications.map((notification: any) => (
                        <div
                            key={notification.id}
                            className={cn(
                                "p-6 hover:bg-muted/50 transition-colors flex gap-4 cursor-pointer",
                                !notification.isRead && "bg-primary/5"
                            )}
                            onClick={() => handleNotificationClick(notification)}
                        >
                            <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                                "bg-background border shadow-sm"
                            )}>
                                {getIcon(notification.type)}
                            </div>
                            <div className="flex-1 space-y-1">
                                <p className={cn("text-base font-medium leading-none", !notification.isRead && "text-primary")}>
                                    {notification.title}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground pt-2">
                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                            {!notification.isRead && (
                                <div className="h-3 w-3 rounded-full bg-primary shrink-0 mt-1" title="Unread" />
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
