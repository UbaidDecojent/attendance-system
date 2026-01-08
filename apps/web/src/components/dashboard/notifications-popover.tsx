'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Clock, Calendar, AlertCircle, Info } from 'lucide-react';
import { notificationsApi } from '@/lib/api/notifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPopover() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch notifications
    const { data, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => notificationsApi.getMyNotifications(1, 10),
        refetchInterval: 30000,
    });

    // Mark as read mutation
    const readMutation = useMutation({
        mutationFn: (id: string) => notificationsApi.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Mark all as read mutation
    const readAllMutation = useMutation({
        mutationFn: notificationsApi.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const notifications = data?.items || [];
    const unreadCount = data?.meta?.unreadCount || 0;

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
        setIsOpen(false);
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
        <div className="relative" ref={popoverRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors outline-none cursor-pointer"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-background animate-pulse" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-background border rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between p-4 border-b">
                        <h4 className="font-semibold">Notifications</h4>
                        {unreadCount > 0 && (
                            <button
                                className="text-xs text-primary hover:underline disabled:opacity-50"
                                onClick={() => readAllMutation.mutate()}
                                disabled={readAllMutation.isPending}
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {isLoading ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                Loading...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No notifications</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {notifications.map((notification: any) => (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "p-4 hover:bg-muted/50 transition-colors flex gap-3 cursor-pointer",
                                            !notification.isRead && "bg-primary/5"
                                        )}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                            "bg-background border shadow-sm"
                                        )}>
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {notification.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-muted-foreground pt-1">
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        {!notification.isRead && (
                                            <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t text-center bg-muted/30 rounded-b-xl">
                        <button
                            className="text-xs font-medium text-primary hover:underline w-full"
                            onClick={() => {
                                setIsOpen(false);
                                router.push('/dashboard/notifications');
                            }}
                        >
                            View All Notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
