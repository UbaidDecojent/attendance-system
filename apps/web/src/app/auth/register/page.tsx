'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/auth';

const registerSchema = z.object({
    companyName: z.string().min(2, 'Company name must be at least 2 characters'),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain an uppercase letter')
        .regex(/[a-z]/, 'Password must contain a lowercase letter')
        .regex(/[0-9]/, 'Password must contain a number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1);

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    });

    const password = watch('password', '');

    const passwordStrength = () => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        return strength;
    };

    const onSubmit = async (data: RegisterForm) => {
        setIsLoading(true);
        try {
            await authApi.register({
                companyName: data.companyName,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                password: data.password,
            });

            toast.success('Registration successful! Please check your email to verify your account.');
            router.push('/auth/login?registered=true');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Registration failed');
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

                    <h1 className="text-3xl font-bold mb-2">Start your free trial</h1>
                    <p className="text-muted-foreground mb-8">
                        14 days free. No credit card required.
                    </p>

                    {/* Progress Steps */}
                    <div className="flex items-center gap-4 mb-8">
                        {[1, 2].map((s) => (
                            <div key={s} className="flex items-center gap-2">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step >= s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                    {s}
                                </div>
                                <span className={`text-sm ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {s === 1 ? 'Company' : 'Account'}
                                </span>
                                {s < 2 && <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />}
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {step === 1 ? (
                            <>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Company Name</label>
                                    <input
                                        type="text"
                                        {...register('companyName')}
                                        className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring"
                                        placeholder="Acme Corporation"
                                    />
                                    {errors.companyName && (
                                        <p className="text-destructive text-sm mt-1">{errors.companyName.message}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">First Name</label>
                                        <input
                                            type="text"
                                            {...register('firstName')}
                                            className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring"
                                            placeholder="John"
                                        />
                                        {errors.firstName && (
                                            <p className="text-destructive text-sm mt-1">{errors.firstName.message}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Last Name</label>
                                        <input
                                            type="text"
                                            {...register('lastName')}
                                            className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring"
                                            placeholder="Doe"
                                        />
                                        {errors.lastName && (
                                            <p className="text-destructive text-sm mt-1">{errors.lastName.message}</p>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="btn-premium w-full py-3.5 flex items-center justify-center"
                                >
                                    Continue
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </button>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Work Email</label>
                                    <input
                                        type="email"
                                        {...register('email')}
                                        className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring"
                                        placeholder="john@company.com"
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
                                    {/* Password strength indicator */}
                                    <div className="flex gap-1 mt-2">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1 flex-1 rounded-full transition-colors ${i <= passwordStrength()
                                                        ? passwordStrength() <= 2
                                                            ? 'bg-red-500'
                                                            : passwordStrength() <= 3
                                                                ? 'bg-yellow-500'
                                                                : 'bg-green-500'
                                                        : 'bg-muted'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    {errors.password && (
                                        <p className="text-destructive text-sm mt-1">{errors.password.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">Confirm Password</label>
                                    <input
                                        type="password"
                                        {...register('confirmPassword')}
                                        className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring"
                                        placeholder="••••••••"
                                    />
                                    {errors.confirmPassword && (
                                        <p className="text-destructive text-sm mt-1">{errors.confirmPassword.message}</p>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex-1 py-3.5 rounded-xl border text-center font-medium hover:bg-muted transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-1 btn-premium py-3.5 flex items-center justify-center"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            'Create Account'
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </form>

                    <p className="text-center text-xs text-muted-foreground mt-8">
                        By creating an account, you agree to our{' '}
                        <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
                        {' '}and{' '}
                        <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                    </p>

                    <p className="text-center text-sm text-muted-foreground mt-4">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-primary font-medium hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right side - Gradient */}
            <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary via-purple-600 to-pink-500 items-center justify-center p-12">
                <div className="max-w-lg text-white">
                    <h2 className="text-4xl font-bold mb-6">
                        Your 14-day free trial includes
                    </h2>
                    <ul className="space-y-4 text-lg">
                        {[
                            'Unlimited employees',
                            'All premium features',
                            'GPS & IP tracking',
                            'Advanced reports & analytics',
                            'Priority email support',
                            'Data export (CSV, Excel, PDF)',
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-3">
                                <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                                    ✓
                                </div>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
