'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, Zap, CreditCard, FileText, ExternalLink } from 'lucide-react';
import api from '@/lib/api/client';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';

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
            <div className="bg-[#111111] border border-white/5 rounded-[2rem] p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1">Current Plan</p>
                        <h2 className="text-3xl font-extrabold flex items-center gap-3 text-white">
                            {subscription?.plan?.name || 'Free Trial'}
                            {subscription?.isTrialing && (
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-lime/20 text-lime border border-lime/20 uppercase tracking-wider">
                                    Trial
                                </span>
                            )}
                        </h2>
                        {subscription?.currentPeriodEnd && (
                            <p className="text-sm text-zinc-500 mt-2 font-medium">
                                {subscription?.isCanceling
                                    ? `Cancels on ${formatDate(subscription.currentPeriodEnd)}`
                                    : `Renews on ${formatDate(subscription.currentPeriodEnd)}`
                                }
                            </p>
                        )}
                    </div>
                    <div className="flex gap-4">
                        {subscription?.isCanceling ? (
                            <button className="px-6 py-3 rounded-full border border-white/10 text-white font-bold hover:bg-zinc-900 transition-colors">
                                Resume Subscription
                            </button>
                        ) : (
                            <button className="px-6 py-3 rounded-full border border-white/10 text-white font-bold hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-colors">
                                Cancel Subscription
                            </button>
                        )}
                        <button className="bg-lime hover:bg-lime-400 text-black px-6 py-3 rounded-full font-bold transition-all hover:scale-105">
                            Manage Billing
                        </button>
                    </div>
                </div>

                {/* Usage */}
                <div className="mt-8 pt-8 border-t border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-zinc-400">Employee Usage</span>
                        <span className="text-sm font-bold text-white">
                            {subscription?.usage?.current || 0} / {subscription?.plan?.maxEmployees === -1 ? '∞' : subscription?.plan?.maxEmployees || 0}
                        </span>
                    </div>
                    <div className="h-3 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                        <div
                            className="h-full bg-lime shadow-[0_0_10px_rgba(204,255,0,0.5)] rounded-full transition-all duration-500"
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
                <h2 className="text-xl font-bold text-white mb-6">Available Plans</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    {plans?.map((plan: any) => (
                        <div
                            key={plan.id}
                            className={cn(
                                'bg-[#111111] border rounded-[2rem] p-8 relative transition-all duration-300',
                                subscription?.plan?.id === plan.id
                                    ? 'border-lime ring-1 ring-lime/50 shadow-[0_0_30px_rgba(204,255,0,0.1)]'
                                    : 'border-white/5 hover:border-lime/30'
                            )}
                        >
                            {subscription?.plan?.id === plan.id && (
                                <div className="absolute -top-3 left-8 px-4 py-1 bg-lime text-black text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">
                                    Current Plan
                                </div>
                            )}
                            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                            <div className="mt-4 mb-6">
                                <span className="text-4xl font-extrabold text-white tracking-tight">{formatCurrency(plan.priceMonthly)}</span>
                                <span className="text-zinc-500 font-medium">/month</span>
                            </div>
                            <p className="text-sm text-zinc-500 font-medium mb-8 leading-relaxed">{plan.description}</p>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-sm font-medium text-zinc-300">
                                    <div className="h-6 w-6 rounded-full bg-lime/10 flex items-center justify-center">
                                        <Check className="h-3 w-3 text-lime" />
                                    </div>
                                    {plan.maxEmployees === -1 ? 'Unlimited' : `Up to ${plan.maxEmployees}`} employees
                                </li>
                                {plan.hasGpsTracking && (
                                    <li className="flex items-center gap-3 text-sm font-medium text-zinc-300">
                                        <div className="h-6 w-6 rounded-full bg-lime/10 flex items-center justify-center">
                                            <Check className="h-3 w-3 text-lime" />
                                        </div>
                                        GPS Tracking
                                    </li>
                                )}
                                {plan.hasAdvancedReports && (
                                    <li className="flex items-center gap-3 text-sm font-medium text-zinc-300">
                                        <div className="h-6 w-6 rounded-full bg-lime/10 flex items-center justify-center">
                                            <Check className="h-3 w-3 text-lime" />
                                        </div>
                                        Advanced Reports
                                    </li>
                                )}
                                {plan.hasApiAccess && (
                                    <li className="flex items-center gap-3 text-sm font-medium text-zinc-300">
                                        <div className="h-6 w-6 rounded-full bg-lime/10 flex items-center justify-center">
                                            <Check className="h-3 w-3 text-lime" />
                                        </div>
                                        API Access
                                    </li>
                                )}
                                {plan.hasPrioritySupport && (
                                    <li className="flex items-center gap-3 text-sm font-medium text-zinc-300">
                                        <div className="h-6 w-6 rounded-full bg-lime/10 flex items-center justify-center">
                                            <Check className="h-3 w-3 text-lime" />
                                        </div>
                                        Priority Support
                                    </li>
                                )}
                            </ul>
                            {subscription?.plan?.id !== plan.id && (
                                <button className="w-full py-3 rounded-xl border border-white/10 font-bold text-white hover:bg-white hover:text-black transition-all">
                                    Upgrade Plan
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Invoices */}
            <div className="space-y-4">
                <h2 className="font-bold text-white text-lg">Invoice History</h2>
                <DataTable
                    columns={[
                        {
                            accessorKey: 'number',
                            header: 'Invoice',
                            cell: ({ row }) => <span className="font-bold text-white">{row.original.number}</span>
                        },
                        {
                            accessorKey: 'date',
                            header: 'Date',
                            cell: ({ row }) => <span className="text-zinc-400 font-medium">{formatDate(row.original.date)}</span>
                        },
                        {
                            accessorKey: 'amount',
                            header: 'Amount',
                            cell: ({ row }) => <span className="text-white font-bold">{formatCurrency(row.original.amount)}</span>
                        },
                        {
                            accessorKey: 'status',
                            header: 'Status',
                            cell: ({ row }) => (
                                <span className={cn(
                                    'inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                                    row.original.status === 'paid'
                                        ? 'bg-lime/10 text-lime border border-lime/20'
                                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                )}>
                                    {row.original.status}
                                </span>
                            )
                        },
                        {
                            id: 'actions',
                            header: 'Actions',
                            cell: ({ row }) => row.original.pdfUrl ? (
                                <a
                                    href={row.original.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-bold"
                                >
                                    <FileText className="h-4 w-4" />
                                    Download
                                </a>
                            ) : null
                        }
                    ] as ColumnDef<any>[]}
                    data={invoices || []}
                />
            </div>
        </div>
    );
}
