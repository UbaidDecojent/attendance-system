'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/stores/auth-store';
import { authApi } from '@/lib/api/auth';

const loginSchema = z.object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [requires2FA, setRequires2FA] = useState(false);
    const [tempToken, setTempToken] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const setAuth = useAuthStore((state) => state.setAuth);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        setIsLoading(true);
        try {
            const response = await authApi.login(data.email, data.password);

            if (response.requires2FA) {
                setRequires2FA(true);
                setTempToken(response.tempToken || '');
                toast.info('Please enter your 2FA code');
            } else {
                setAuth(response.user, response.accessToken);
                toast.success('Welcome back!');
                router.push('/dashboard');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handle2FASubmit = async () => {
        if (twoFactorCode.length !== 6) {
            toast.error('Please enter a 6-digit code');
            return;
        }

        setIsLoading(true);
        try {
            const response = await authApi.verify2FA(tempToken, twoFactorCode);
            setAuth(response.user, response.accessToken);
            toast.success('Welcome back!');
            router.push('/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Invalid 2FA code');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left side - Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <Link href="/" className="flex items-center gap-2 mb-8">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                            <Clock className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold">AttendancePro</span>
                    </Link>

                    <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
                    <p className="text-muted-foreground mb-8">
                        Enter your credentials to access your account
                    </p>

                    {!requires2FA ? (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Email</label>
                                <input
                                    type="email"
                                    {...register('email')}
                                    className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring"
                                    placeholder="you@company.com"
                                />
                                {errors.email && (
                                    <p className="text-destructive text-sm mt-1">{errors.email.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        {...register('password')}
                                        className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring pr-12"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-destructive text-sm mt-1">{errors.password.message}</p>
                                )}
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" className="rounded border-border" />
                                    Remember me
                                </label>
                                <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                                    Forgot password?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-premium w-full py-3.5 flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-5">
                            <div>
                                <label className="text-sm font-medium mb-2 block">2FA Code</label>
                                <input
                                    type="text"
                                    value={twoFactorCode}
                                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring text-center text-2xl tracking-widest"
                                    placeholder="000000"
                                    maxLength={6}
                                />
                            </div>
                            <button
                                onClick={handle2FASubmit}
                                disabled={isLoading}
                                className="btn-premium w-full py-3.5 flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    'Verify'
                                )}
                            </button>
                            <button
                                onClick={() => setRequires2FA(false)}
                                className="w-full text-sm text-muted-foreground hover:text-foreground"
                            >
                                Back to login
                            </button>
                        </div>
                    )}

                    <p className="text-center text-sm text-muted-foreground mt-8">
                        Don't have an account?{' '}
                        <Link href="/auth/register" className="text-primary font-medium hover:underline">
                            Start free trial
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right side - Gradient */}
            <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary via-purple-600 to-pink-500 items-center justify-center p-12">
                <div className="max-w-lg text-white">
                    <h2 className="text-4xl font-bold mb-6">
                        Manage attendance like never before
                    </h2>
                    <p className="text-lg opacity-90 mb-8">
                        Join 500+ companies using AttendancePro to streamline their workforce management
                        and boost productivity.
                    </p>
                    <div className="grid grid-cols-2 gap-6">
                        {[
                            { value: '99.9%', label: 'Uptime SLA' },
                            { value: '50K+', label: 'Daily Check-ins' },
                            { value: '500+', label: 'Companies' },
                            { value: '4.9/5', label: 'Rating' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-4">
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <div className="text-sm opacity-80">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
