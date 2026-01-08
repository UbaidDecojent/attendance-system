'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, Zap, CreditCard, FileText, ExternalLink } from 'lucide-react';
import api from '@/lib/api/client';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function BillingPage() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const isAdmin = ['COMPANY_ADMIN', 'HR_MANAGER'].includes(user?.role || '');

    useEffect(() => {
        if (user && !isAdmin) {
            toast.error('Unauthorized access');
            router.push('/dashboard');
        }
    }, [user, isAdmin, router]);

    if (!isAdmin) return null;

    const { data: subscription, isLoading } = useQuery({
        queryKey: ['subscription'],
        queryFn: async () => {
            const res = await api.get('/subscription');
            return res.data.data;
        },
    });

    const { data: plans } = useQuery({
        queryKey: ['plans'],
        queryFn: async () => {
            const res = await api.get('/subscription/plans');
            return res.data.data;
        },
    });

    const { data: invoices } = useQuery({
        queryKey: ['invoices'],
        queryFn: async () => {
            const res = await api.get('/subscription/invoices');
            return res.data.data?.invoices || [];
        },
    });

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold">Billing & Subscription</h1>
                <p className="text-muted-foreground">Manage your subscription and payment methods</p>
            </div>

            {/* Current Plan */}
            <div className="glass-card rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Current Plan</p>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            {subscription?.plan?.name || 'Free Trial'}
                            {subscription?.isTrialing && (
                                <span className="text-sm font-medium px-3 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                    Trial
                                </span>
                            )}
                        </h2>
                        {subscription?.currentPeriodEnd && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {subscription?.isCanceling
                                    ? `Cancels on ${formatDate(subscription.currentPeriodEnd)}`
                                    : `Renews on ${formatDate(subscription.currentPeriodEnd)}`
                                }
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {subscription?.isCanceling ? (
                            <button className="px-5 py-2.5 rounded-xl border font-medium hover:bg-muted transition-colors">
                                Resume Subscription
                            </button>
                        ) : (
                            <button className="px-5 py-2.5 rounded-xl border font-medium hover:bg-muted transition-colors text-red-600">
                                Cancel Subscription
                            </button>
                        )}
                        <button className="btn-premium px-5 py-2.5">
                            Manage Billing
                        </button>
                    </div>
                </div>

                {/* Usage */}
                <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Employee Usage</span>
                        <span className="text-sm text-muted-foreground">
                            {subscription?.usage?.current || 0} / {subscription?.plan?.maxEmployees === -1 ? '∞' : subscription?.plan?.maxEmployees || 0}
                        </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full transition-all"
                            style={{
                                width: subscription?.plan?.maxEmployees === -1
                                    ? '10%'
                                    : `${Math.min(100, ((subscription?.usage?.current || 0) / (subscription?.plan?.maxEmployees || 1)) * 100)}%`
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Available Plans */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    {plans?.map((plan: any) => (
                        <div
                            key={plan.id}
                            className={cn(
                                'stats-card relative',
                                subscription?.plan?.id === plan.id && 'border-primary ring-2 ring-primary/20'
                            )}
                        >
                            {subscription?.plan?.id === plan.id && (
                                <div className="absolute -top-3 left-4 px-3 py-1 bg-primary text-white text-xs font-medium rounded-full">
                                    Current Plan
                                </div>
                            )}
                            <h3 className="text-lg font-semibold">{plan.name}</h3>
                            <div className="mt-2 mb-4">
                                <span className="text-3xl font-bold">{formatCurrency(plan.priceMonthly)}</span>
                                <span className="text-muted-foreground">/month</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                            <ul className="space-y-2 mb-6">
                                <li className="flex items-center gap-2 text-sm">
                                    <Check className="h-4 w-4 text-primary" />
                                    {plan.maxEmployees === -1 ? 'Unlimited' : `Up to ${plan.maxEmployees}`} employees
                                </li>
                                {plan.hasGpsTracking && (
                                    <li className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-primary" />
                                        GPS Tracking
                                    </li>
                                )}
                                {plan.hasAdvancedReports && (
                                    <li className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-primary" />
                                        Advanced Reports
                                    </li>
                                )}
                                {plan.hasApiAccess && (
                                    <li className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-primary" />
                                        API Access
                                    </li>
                                )}
                                {plan.hasPrioritySupport && (
                                    <li className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-primary" />
                                        Priority Support
                                    </li>
                                )}
                            </ul>
                            {subscription?.plan?.id !== plan.id && (
                                <button className="w-full py-2.5 rounded-xl border font-medium hover:bg-muted transition-colors">
                                    Upgrade
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Invoices */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-6 border-b flex items-center justify-between">
                    <h2 className="font-semibold">Invoice History</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="text-left py-4 px-6 font-medium">Invoice</th>
                                <th className="text-left py-4 px-6 font-medium">Date</th>
                                <th className="text-left py-4 px-6 font-medium">Amount</th>
                                <th className="text-left py-4 px-6 font-medium">Status</th>
                                <th className="text-left py-4 px-6 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                        No invoices yet
                                    </td>
                                </tr>
                            ) : (
                                invoices?.map((invoice: any) => (
                                    <tr key={invoice.id} className="border-b table-row-hover">
                                        <td className="py-4 px-6 font-medium">{invoice.number}</td>
                                        <td className="py-4 px-6">{formatDate(invoice.date)}</td>
                                        <td className="py-4 px-6">{formatCurrency(invoice.amount)}</td>
                                        <td className="py-4 px-6">
                                            <span className={cn(
                                                'inline-flex px-3 py-1 rounded-full text-xs font-medium',
                                                invoice.status === 'paid'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-amber-100 text-amber-700'
                                            )}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            {invoice.pdfUrl && (
                                                <a
                                                    href={invoice.pdfUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                    Download
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
