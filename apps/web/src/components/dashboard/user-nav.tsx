'use client';

import * as React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import { User, Settings, LogOut } from 'lucide-react';

export default function UserNav() {
    const { user, logout } = useAuthStore();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push('/auth/login');
    };

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button className="h-10 w-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-white font-bold hover:border-lime-500/50 transition-colors overflow-hidden relative outline-none focus:ring-2 focus:ring-lime-500/50">
                    {user?.avatar ? (
                        <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                        <span>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                    )}
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content className="min-w-[200px] bg-zinc-900 border border-white/10 rounded-md p-1 shadow-xl z-50 text-zinc-200 animate-in fade-in-80 zoom-in-95" align="end" sideOffset={5}>
                    <div className="px-2 py-1.5 text-sm">
                        <div className="font-medium text-white">{user?.firstName} {user?.lastName}</div>
                        <div className="text-xs text-zinc-500 truncate">{user?.email}</div>
                    </div>

                    <DropdownMenu.Separator className="h-px bg-white/10 my-1" />

                    <DropdownMenu.Item className="group flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-pointer hover:bg-zinc-800 hover:text-white rounded-sm select-none transition-colors" onClick={() => router.push('/dashboard/settings')}>
                        <User className="h-4 w-4 text-zinc-500 group-hover:text-white transition-colors" />
                        <span>Profile</span>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item className="group flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-pointer hover:bg-zinc-800 hover:text-white rounded-sm select-none transition-colors" onClick={() => router.push('/dashboard/settings')}>
                        <Settings className="h-4 w-4 text-zinc-500 group-hover:text-white transition-colors" />
                        <span>Settings</span>
                    </DropdownMenu.Item>

                    <DropdownMenu.Separator className="h-px bg-white/10 my-1" />

                    <DropdownMenu.Item className="group flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-pointer hover:bg-red-500/10 hover:text-red-500 text-red-400 rounded-sm select-none transition-colors" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
