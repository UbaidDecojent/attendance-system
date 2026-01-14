'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, Eye, EyeOff, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
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
        <div className="h-screen w-full flex bg-[#050505] p-4 lg:p-6 gap-6 overflow-hidden">
            {/* Left side - Form Section */}
            <div className="flex-1 flex flex-col relative bg-transparent rounded-3xl">
                {/* Logo - Fixed to Top Left */}
                <div className="absolute top-4 left-4 lg:top-8 lg:left-8">
                    <Link href="/" className="flex items-center gap-3 w-fit group">
                        <div className="h-11 w-11 rounded-xl bg-lime flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-[0_4px_20px_rgba(204,255,0,0.2)]">
                            <Clock className="h-6 w-6 text-black" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-white tracking-tight leading-none">ATTENDIFY<span className="text-lime">.</span></span>
                            <span className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] uppercase">Management</span>
                        </div>
                    </Link>
                </div>

                {/* Main Form Content - Perfectly Centered */}
                <div className="flex-1 flex flex-col justify-center items-center w-full px-4 sm:px-12 lg:px-20">
                    <div className="w-full max-w-[480px] space-y-8">
                        {/* Header Text - Left Aligned */}
                        <div className="space-y-3">
                            <h1 className="text-4xl font-bold text-white tracking-tight">Start Your Free Trial</h1>
                            <p className="text-zinc-400 text-lg">
                                14 days free. No credit card required.
                            </p>
                        </div>

                        {/* Progress Steps */}
                        <div className="flex items-center gap-6">
                            {[1, 2].map((s) => (
                                <div key={s} className="flex items-center gap-3">
                                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition-all
                                        ${step >= s
                                            ? 'bg-lime text-black shadow-[0_4px_15px_rgba(204,255,0,0.3)]'
                                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                                        {s}
                                    </div>
                                    <span className={`text-sm font-medium ${step >= s ? 'text-white' : 'text-zinc-500'}`}>
                                        {s === 1 ? 'Company' : 'Account'}
                                    </span>
                                    {s < 2 && <ArrowRight className="h-4 w-4 text-zinc-600 mx-2" />}
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            {step === 1 ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-zinc-300 ml-1">Company Name</label>
                                        <input
                                            type="text"
                                            {...register('companyName')}
                                            className="w-full px-5 py-4 rounded-xl bg-zinc-900/50 border border-zinc-800 focus:border-lime focus:ring-1 focus:ring-lime transition-all outline-none text-white placeholder:text-zinc-600 focus:bg-zinc-900"
                                            placeholder="Acme Corporation"
                                        />
                                        {errors.companyName && (
                                            <p className="text-red-500 text-sm font-medium ml-1 mt-1">{errors.companyName.message}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-zinc-300 ml-1">First Name</label>
                                            <input
                                                type="text"
                                                {...register('firstName')}
                                                className="w-full px-5 py-4 rounded-xl bg-zinc-900/50 border border-zinc-800 focus:border-lime focus:ring-1 focus:ring-lime transition-all outline-none text-white placeholder:text-zinc-600 focus:bg-zinc-900"
                                                placeholder="John"
                                            />
                                            {errors.firstName && (
                                                <p className="text-red-500 text-sm font-medium ml-1 mt-1">{errors.firstName.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-zinc-300 ml-1">Last Name</label>
                                            <input
                                                type="text"
                                                {...register('lastName')}
                                                className="w-full px-5 py-4 rounded-xl bg-zinc-900/50 border border-zinc-800 focus:border-lime focus:ring-1 focus:ring-lime transition-all outline-none text-white placeholder:text-zinc-600 focus:bg-zinc-900"
                                                placeholder="Doe"
                                            />
                                            {errors.lastName && (
                                                <p className="text-red-500 text-sm font-medium ml-1 mt-1">{errors.lastName.message}</p>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="w-full py-4 rounded-xl bg-lime hover:bg-lime-400 text-black font-bold text-lg shadow-[0_4px_20px_rgba(204,255,0,0.25)] hover:shadow-[0_4px_25px_rgba(204,255,0,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 tracking-wide"
                                    >
                                        Continue
                                        <ArrowRight className="h-5 w-5" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-zinc-300 ml-1">Work Email</label>
                                        <input
                                            type="email"
                                            {...register('email')}
                                            className="w-full px-5 py-4 rounded-xl bg-zinc-900/50 border border-zinc-800 focus:border-lime focus:ring-1 focus:ring-lime transition-all outline-none text-white placeholder:text-zinc-600 focus:bg-zinc-900"
                                            placeholder="john@company.com"
                                        />
                                        {errors.email && (
                                            <p className="text-red-500 text-sm font-medium ml-1 mt-1">{errors.email.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-zinc-300 ml-1">Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                {...register('password')}
                                                className="w-full px-5 py-4 rounded-xl bg-zinc-900/50 border border-zinc-800 focus:border-lime focus:ring-1 focus:ring-lime transition-all outline-none text-white placeholder:text-zinc-600 focus:bg-zinc-900 pr-12"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                        {/* Password strength indicator */}
                                        <div className="flex gap-1 mt-2">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1.5 flex-1 rounded-full transition-colors ${i <= passwordStrength()
                                                        ? passwordStrength() <= 2
                                                            ? 'bg-red-500'
                                                            : passwordStrength() <= 3
                                                                ? 'bg-yellow-500'
                                                                : 'bg-lime'
                                                        : 'bg-zinc-800'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        {errors.password && (
                                            <p className="text-red-500 text-sm font-medium ml-1 mt-1">{errors.password.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-zinc-300 ml-1">Confirm Password</label>
                                        <input
                                            type="password"
                                            {...register('confirmPassword')}
                                            className="w-full px-5 py-4 rounded-xl bg-zinc-900/50 border border-zinc-800 focus:border-lime focus:ring-1 focus:ring-lime transition-all outline-none text-white placeholder:text-zinc-600 focus:bg-zinc-900"
                                            placeholder="••••••••"
                                        />
                                        {errors.confirmPassword && (
                                            <p className="text-red-500 text-sm font-medium ml-1 mt-1">{errors.confirmPassword.message}</p>
                                        )}
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="flex-1 py-4 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                                        >
                                            <ArrowLeft className="h-5 w-5" />
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="flex-1 py-4 rounded-xl bg-lime hover:bg-lime-400 text-black font-bold text-lg shadow-[0_4px_20px_rgba(204,255,0,0.25)] hover:shadow-[0_4px_25px_rgba(204,255,0,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                            ) : (
                                                'Create Account'
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </form>

                        <div className="pt-4">
                            <p className="text-center text-zinc-500 font-medium">
                                Already have an account?{' '}
                                <Link href="/auth/login" className="text-lime hover:underline font-bold hover:text-lime-400 transition-colors">
                                    Sign In
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer - Fixed to Bottom */}
                <div className="absolute bottom-4 left-0 w-full px-8 text-center sm:text-left sm:flex sm:justify-between sm:items-center text-xs text-zinc-500">
                    <p>Copyright © 2026 Attendify Inc.</p>
                    <div className="hidden sm:flex gap-6">
                        <Link href="/privacy" className="text-white hover:text-lime transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="text-white hover:text-lime transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>

            {/* Right side - Features */}
            <div className="hidden lg:flex flex-1 bg-[#0F0F0F] rounded-[2.5rem] relative overflow-hidden flex-col justify-center p-20 border border-white/[0.02]">
                {/* Background Gradients */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-lime/10 rounded-full blur-[140px] -mr-32 -mt-32 pointer-events-none opacity-60" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-lime/5 rounded-full blur-[120px] -ml-20 -mb-20 pointer-events-none opacity-40" />

                <div className="z-20 max-w-2xl">
                    <h2 className="text-[3.5rem] font-bold text-white mb-10 leading-[1.05] tracking-tight">
                        Powerful <span className="text-lime">features</span> for modern teams.
                    </h2>
                    <ul className="space-y-6 text-lg">
                        {[
                            'Real-time attendance tracking',
                            'GPS & IP-based verification',
                            'Leave management system',
                            'Department & employee management',
                            'Detailed reports & analytics',
                            'Multi-location support',
                            'Role-based access control',
                            'Automated notifications',
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-4 text-zinc-300 font-medium">
                                <div className="h-7 w-7 rounded-full bg-lime/20 flex items-center justify-center text-lime font-bold text-sm shrink-0">
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
