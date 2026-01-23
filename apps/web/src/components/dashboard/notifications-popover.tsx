'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Clock, Calendar, AlertCircle, Info, Volume2, VolumeX } from 'lucide-react';
import { notificationsApi, type Notification as NotificationItem } from '@/lib/api/notifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const STORAGE_KEY = 'notification_preferences';

export default function NotificationsPopover() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio element
    useEffect(() => {
        // Create audio element for notification sound
        // audioRef.current = new Audio('/notification.mp3');
        // audioRef.current.volume = 0.5;

        // Load sound preference from localStorage
        const prefs = localStorage.getItem(STORAGE_KEY);
        if (prefs) {
            try {
                const parsed = JSON.parse(prefs);
                const soundPref = parsed.find((p: any) => p.id === 'notification_sound');
                if (soundPref) {
                    setSoundEnabled(soundPref.enabled);
                }
            } catch (e) { }
        }
    }, []);

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

    // Fetch notifications with polling
    const { data, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => notificationsApi.getMyNotifications(1, 10),
        refetchInterval: 15000, // Poll every 15 seconds for real-time feel
        refetchIntervalInBackground: true,
    });

    // Check for new notifications and trigger alerts
    const checkForNewNotifications = useCallback((notifications: NotificationItem[]) => {
        if (!notifications?.length) return;

        const latestNotification = notifications[0];

        // If we have a new notification that we haven't seen
        if (latestNotification && latestNotification.id !== lastNotificationId && !latestNotification.isRead) {
            setLastNotificationId(latestNotification.id);

            // Only trigger alerts if this isn't the first load
            if (lastNotificationId !== null) {
                // Play sound if enabled
                if (soundEnabled && audioRef.current) {
                    audioRef.current.play().catch(() => { });
                }

                // Show browser notification if permitted
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                    new window.Notification(latestNotification.title, {
                        body: latestNotification.message,
                        icon: '/favicon.ico',
                        tag: latestNotification.id, // Prevent duplicates
                    });
                }
            }
        }
    }, [lastNotificationId, soundEnabled]);

    // Monitor for new notifications
    useEffect(() => {
        if (data?.items) {
            checkForNewNotifications(data.items);
        }
    }, [data?.items, checkForNewNotifications]);

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
                return <Calendar className="h-4 w-4 text-lime" />;
            case 'ATTENDANCE_LATE':
                return <Clock className="h-4 w-4 text-orange-400" />;
            case 'ATTENDANCE_ABSENT':
                return <AlertCircle className="h-4 w-4 text-red-400" />;
            case 'LEAVE_APPROVED':
                return <Check className="h-4 w-4 text-lime" />;
            case 'LEAVE_REJECTED':
                return <AlertCircle className="h-4 w-4 text-red-400" />;
            default:
                return <Info className="h-4 w-4 text-zinc-400" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'LEAVE_REQUEST':
                return 'Leave Request';
            case 'ATTENDANCE_LATE':
                return 'Late Arrival';
            case 'ATTENDANCE_ABSENT':
                return 'Absent';
            case 'LEAVE_APPROVED':
                return 'Leave Approved';
            case 'LEAVE_REJECTED':
                return 'Leave Rejected';
            default:
                return 'Notification';
        }
    };

    const handleNotificationClick = (notification: NotificationItem) => {
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
                className={cn(
                    "relative h-10 w-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center hover:border-lime-500/50 hover:bg-zinc-700 transition-all outline-none cursor-pointer",
                    unreadCount > 0 && "animate-pulse"
                )}
            >
                <Bell className={cn("h-5 w-5", unreadCount > 0 ? "text-lime" : "text-zinc-300")} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-lime text-black text-[10px] font-bold flex items-center justify-center rounded-full border-[3px] border-[#09090b] animate-bounce">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-4 w-96 bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between p-5 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <h4 className="font-bold text-white">Notifications</h4>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-lime/20 text-lime rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Sound Toggle */}
                            <button
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    soundEnabled ? "text-lime hover:bg-lime/10" : "text-zinc-500 hover:bg-zinc-800"
                                )}
                                title={soundEnabled ? "Sound on" : "Sound off"}
                            >
                                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                            </button>
                            {unreadCount > 0 && (
                                <button
                                    className="text-xs text-lime hover:text-lime-400 hover:underline disabled:opacity-50 font-medium transition-colors"
                                    onClick={() => readAllMutation.mutate()}
                                    disabled={readAllMutation.isPending}
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                        {isLoading ? (
                            <div className="p-8 text-center text-sm text-zinc-500">
                                <div className="animate-spin h-6 w-6 border-2 border-lime border-t-transparent rounded-full mx-auto mb-2" />
                                Loading...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-12 text-center text-zinc-500">
                                <Bell className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p className="text-sm font-medium">No notifications</p>
                                <p className="text-xs text-zinc-600 mt-1">You're all caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map((notification: NotificationItem) => (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "p-4 hover:bg-white/5 transition-all flex gap-4 cursor-pointer group",
                                            !notification.isRead && "bg-lime/5"
                                        )}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className={cn(
                                            "h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                            "bg-zinc-900 border border-white/10 group-hover:border-white/20"
                                        )}>
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                                                    notification.type === 'LEAVE_APPROVED' && "bg-lime/20 text-lime",
                                                    notification.type === 'LEAVE_REJECTED' && "bg-red-500/20 text-red-400",
                                                    notification.type === 'LEAVE_REQUEST' && "bg-blue-500/20 text-blue-400",
                                                    notification.type === 'ATTENDANCE_LATE' && "bg-orange-500/20 text-orange-400",
                                                    notification.type === 'ATTENDANCE_ABSENT' && "bg-red-500/20 text-red-400",
                                                    !['LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_REQUEST', 'ATTENDANCE_LATE', 'ATTENDANCE_ABSENT'].includes(notification.type) && "bg-zinc-800 text-zinc-400"
                                                )}>
                                                    {getTypeLabel(notification.type)}
                                                </span>
                                            </div>
                                            <p className={cn(
                                                "text-sm font-medium leading-tight",
                                                !notification.isRead ? "text-white" : "text-zinc-300"
                                            )}>
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider pt-1">
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        {!notification.isRead && (
                                            <div className="h-2 w-2 rounded-full bg-lime shrink-0 mt-2 shadow-[0_0_8px_rgba(204,255,0,0.5)]" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-white/5 text-center bg-white/[0.02] rounded-b-2xl">
                        <button
                            className="text-xs font-bold text-white hover:text-lime transition-colors w-full py-2 uppercase tracking-wider"
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
