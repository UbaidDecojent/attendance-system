import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, formatStr = 'MMM d, yyyy') {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, formatStr);
}

export function formatTime(date: string | Date) {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'h:mm a');
}

export function formatDateTime(date: string | Date) {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'MMM d, yyyy h:mm a');
}

export function formatRelative(date: string | Date) {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatMinutesToHours(minutes: number): string {
    const hours = minutes / 60;
    return hours.toFixed(1);
}

export function getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getStatusColor(status: string): string {
    switch (status.toUpperCase()) {
        case 'PRESENT':
        case 'ACTIVE':
        case 'APPROVED':
        case 'SUCCEEDED':
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        case 'ABSENT':
        case 'INACTIVE':
        case 'REJECTED':
        case 'FAILED':
        case 'CANCELED':
            return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        case 'HALF_DAY':
        case 'PENDING':
        case 'TRIALING':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        case 'ON_LEAVE':
        case 'HOLIDAY':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
}

export function formatCurrency(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
}
