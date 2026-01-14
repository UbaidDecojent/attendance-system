'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import Sidebar from '@/components/dashboard/sidebar';
import Header from '@/components/dashboard/header';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { isAuthenticated, isHydrated } = useAuthStore();
    const [isChecking, setIsChecking] = useState(true);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (!isHydrated) return;
        if (!isAuthenticated) {
            router.push('/auth/login');
        } else {
            setIsChecking(false);
        }
    }, [isAuthenticated, isHydrated, router]);

    if (!isHydrated || isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin h-10 w-10 border-4 border-lime border-t-transparent rounded-full"></div>
                    <p className="text-zinc-500">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden bg-black text-white flex">
            {/* Sidebar Wrapper */}
            <div
                className={cn(
                    "relative hidden lg:block transition-all duration-300 ease-in-out border-r border-white/5",
                    isSidebarCollapsed ? "w-20" : "w-72"
                )}
            >
                <Sidebar collapsed={isSidebarCollapsed} />

                {/* Collapse Toggle Button */}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute -right-3 top-8 h-6 w-6 bg-zinc-900 border border-white/10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors z-50 shadow-xl"
                >
                    {isSidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <Header />
                <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
