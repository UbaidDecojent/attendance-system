'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import Sidebar from '@/components/dashboard/sidebar';
import Header from '@/components/dashboard/header';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { isAuthenticated, isHydrated } = useAuthStore();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Wait for store to hydrate before checking auth
        if (!isHydrated) {
            return;
        }

        if (!isAuthenticated) {
            router.push('/auth/login');
        } else {
            setIsChecking(false);
        }
    }, [isAuthenticated, isHydrated, router]);

    // Show loading while checking auth or waiting for hydration
    if (!isHydrated || isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30">
            <Sidebar />
            <div className="lg:pl-72">
                <Header />
                <main className="p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
