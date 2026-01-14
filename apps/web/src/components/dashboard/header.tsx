'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import NotificationPopover from './notifications-popover';
import GlobalSearch from './global-search';

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

                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-white font-bold hover:border-lime-500/50 transition-colors overflow-hidden relative">
                        {user?.avatar ? (
                            <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                            <span>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
