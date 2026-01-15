'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import NotificationPopover from './notifications-popover';
import GlobalSearch from './global-search';
import UserNav from './user-nav';

export default function Header() {
    const user = useAuthStore((state) => state.user);

    return (
        <header className="sticky top-0 z-30 px-6 py-4 bg-black/80 backdrop-blur-md border-b border-white/5">
            <div className="flex items-center justify-between gap-6">

                {/* Global Search */}
                <GlobalSearch />

                {/* Right side */}
                <div className="flex items-center gap-2">
                    {/* Notifications */}
                    <NotificationPopover />

                    {/* User Menu */}
                    <UserNav />
                </div>
            </div>
        </header>
    );
}
