import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from 'sonner';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

export const metadata: Metadata = {
    title: 'Attendance SaaS - Enterprise Attendance Management',
    description: 'Modern, enterprise-grade attendance management system for corporate companies. Track attendance, manage leaves, and generate payroll-ready reports.',
    keywords: ['attendance', 'hr', 'management', 'enterprise', 'saas', 'employee', 'time tracking'],
    authors: [{ name: 'Attendance SaaS' }],
    openGraph: {
        title: 'Attendance SaaS - Enterprise Attendance Management',
        description: 'Modern, enterprise-grade attendance management system',
        type: 'website',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.variable} font-sans`}>
                <Providers>
                    {children}
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            style: {
                                background: 'hsl(var(--card))',
                                color: 'hsl(var(--card-foreground))',
                                border: '1px solid hsl(var(--border))',
                            },
                        }}
                    />
                </Providers>
            </body>
        </html>
    );
}
