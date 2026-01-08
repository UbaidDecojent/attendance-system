'use client';

import { Bell, Search, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/lib/stores/auth-store';

import NotificationPopover from './notifications-popover';

export default function Header() {
    const { theme, setTheme } = useTheme();
    const user = useAuthStore((state) => state.user);

    return (
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center justify-between px-6">
                {/* Search */}
                <div className="flex-1 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search employees, reports..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-4">
                    {/* Theme toggle */}
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                        {theme === 'dark' ? (
                            <Sun className="h-5 w-5" />
                        ) : (
                            <Moon className="h-5 w-5" />
                        )}
                    </button>

                    {/* Notifications */}
                    <NotificationPopover />

                    {/* Company name */}
                    <div className="hidden sm:block text-right">
                        <p className="text-sm font-medium">{user?.companyName}</p>
                        <p className="text-xs text-muted-foreground">{user?.role.replace('_', ' ')}</p>
                    </div>

                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-medium">
                        {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </div>
                </div>
            </div>
        </header>
    );
}
