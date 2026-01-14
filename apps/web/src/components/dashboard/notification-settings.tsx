'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Mail, Clock, Users, FileText, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NotificationPreference {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    enabled: boolean;
    emailEnabled: boolean;
}

const defaultPreferences: NotificationPreference[] = [
    {
        id: 'attendance_reminders',
        label: 'Attendance reminders',
        description: 'Get reminded to check in and out',
        icon: <Clock className="h-5 w-5" />,
        enabled: true,
        emailEnabled: false,
    },
    {
        id: 'leave_updates',
        label: 'Leave request updates',
        description: 'When your leave is approved or rejected',
        icon: <FileText className="h-5 w-5" />,
        enabled: true,
        emailEnabled: true,
    },
    {
        id: 'team_notifications',
        label: 'Team notifications',
        description: 'Updates about your team members',
        icon: <Users className="h-5 w-5" />,
        enabled: true,
        emailEnabled: false,
    },
    {
        id: 'weekly_summary',
        label: 'Weekly summary',
        description: 'Weekly attendance summary email',
        icon: <Mail className="h-5 w-5" />,
        enabled: true,
        emailEnabled: true,
    },
];

const STORAGE_KEY = 'notification_preferences';

export default function NotificationSettings() {
    const [preferences, setPreferences] = useState<NotificationPreference[]>(defaultPreferences);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Load preferences from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Merge with default preferences in case new ones are added
                const merged = defaultPreferences.map(pref => {
                    const storedPref = parsed.find((p: NotificationPreference) => p.id === pref.id);
                    return storedPref ? { ...pref, enabled: storedPref.enabled, emailEnabled: storedPref.emailEnabled } : pref;
                });
                setPreferences(merged);
            } catch (e) {
                console.error('Failed to parse notification preferences');
            }
        }

        const lastSavedStr = localStorage.getItem(`${STORAGE_KEY}_lastSaved`);
        if (lastSavedStr) {
            setLastSaved(new Date(lastSavedStr));
        }
    }, []);

    const togglePreference = (id: string, field: 'enabled' | 'emailEnabled') => {
        setPreferences(prev => prev.map(pref => {
            if (pref.id === id) {
                return { ...pref, [field]: !pref[field] };
            }
            return pref;
        }));
        setHasChanges(true);
    };

    const savePreferences = async () => {
        setIsSaving(true);

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            // Save to localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
            localStorage.setItem(`${STORAGE_KEY}_lastSaved`, new Date().toISOString());
            setLastSaved(new Date());
            setHasChanges(false);
            toast.success('Notification preferences saved!');
        } catch (e) {
            toast.error('Failed to save preferences');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Notification Preferences</h2>
                {lastSaved && (
                    <p className="text-xs text-zinc-500">
                        Last saved: {lastSaved.toLocaleString()}
                    </p>
                )}
            </div>

            <div className="space-y-4">
                {preferences.map((pref) => (
                    <div
                        key={pref.id}
                        className="flex items-center justify-between p-6 bg-zinc-900/50 rounded-xl border border-white/5 group hover:border-white/10 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-400 group-hover:text-lime group-hover:border-lime/20 transition-colors">
                                {pref.icon}
                            </div>
                            <div>
                                <p className="font-bold text-white mb-1 group-hover:text-lime transition-colors">
                                    {pref.label}
                                </p>
                                <p className="text-sm text-zinc-500 font-medium">{pref.description}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            {/* Email toggle - only show for some notifications */}
                            {['leave_updates', 'weekly_summary'].includes(pref.id) && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-500 font-medium">Email</span>
                                    <button
                                        onClick={() => togglePreference(pref.id, 'emailEnabled')}
                                        className={cn(
                                            "w-10 h-6 rounded-full transition-colors relative",
                                            pref.emailEnabled ? "bg-lime" : "bg-zinc-800"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "absolute top-[2px] h-5 w-5 rounded-full transition-all border",
                                                pref.emailEnabled
                                                    ? "left-[18px] bg-black border-transparent"
                                                    : "left-[2px] bg-black border-zinc-600"
                                            )}
                                        />
                                    </button>
                                </div>
                            )}
                            {/* Main toggle */}
                            <button
                                onClick={() => togglePreference(pref.id, 'enabled')}
                                className={cn(
                                    "w-11 h-6 rounded-full transition-colors relative",
                                    pref.enabled ? "bg-lime" : "bg-zinc-800"
                                )}
                            >
                                <div
                                    className={cn(
                                        "absolute top-[2px] h-5 w-5 rounded-full transition-all border",
                                        pref.enabled
                                            ? "left-[22px] bg-black border-transparent"
                                            : "left-[2px] bg-black border-zinc-600"
                                    )}
                                />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Push Notification Permission */}
            <div className="p-6 bg-zinc-900/30 rounded-xl border border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center">
                            <Bell className="h-5 w-5 text-lime" />
                        </div>
                        <div>
                            <p className="font-bold text-white mb-1">Browser Notifications</p>
                            <p className="text-sm text-zinc-500 font-medium">
                                Receive real-time push notifications in your browser
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            if ('Notification' in window) {
                                const permission = await Notification.requestPermission();
                                if (permission === 'granted') {
                                    toast.success('Browser notifications enabled!');
                                    // Show a test notification
                                    new Notification('Attendify', {
                                        body: 'You will now receive real-time notifications',
                                        icon: '/favicon.ico'
                                    });
                                } else if (permission === 'denied') {
                                    toast.error('Notification permission denied. Please enable in browser settings.');
                                }
                            } else {
                                toast.error('Your browser does not support notifications');
                            }
                        }}
                        className="px-6 py-2 rounded-full bg-lime/10 border border-lime/30 text-lime font-bold text-sm hover:bg-lime/20 transition-colors"
                    >
                        {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
                            ? 'Enabled'
                            : 'Enable'
                        }
                    </button>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4 pt-4">
                <button
                    onClick={savePreferences}
                    disabled={isSaving || !hasChanges}
                    className={cn(
                        "bg-lime hover:bg-lime-400 text-black px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2",
                        (isSaving || !hasChanges) ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
                    )}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Saving...
                        </>
                    ) : hasChanges ? (
                        'Save Preferences'
                    ) : (
                        <>
                            <Check className="h-5 w-5" />
                            Saved
                        </>
                    )}
                </button>
                {hasChanges && (
                    <p className="text-sm text-zinc-500">You have unsaved changes</p>
                )}
            </div>
        </div>
    );
}
