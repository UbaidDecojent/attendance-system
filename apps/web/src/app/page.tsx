import Link from 'next/link';
import { ArrowRight, Check, Clock, Users, Calendar, BarChart3, Shield, Zap, Globe } from 'lucide-react';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold">AttendancePro</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8">
                        <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Features
                        </Link>
                        <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Pricing
                        </Link>
                        <Link href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Testimonials
                        </Link>
                    </nav>

                    <div className="flex items-center gap-4">
                        <Link href="/auth/login" className="text-sm font-medium hover:text-primary transition-colors">
                            Sign In
                        </Link>
                        <Link href="/auth/register" className="btn-premium text-sm px-5 py-2.5">
                            Start Free Trial
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-mesh-gradient" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />

                <div className="container relative mx-auto px-4 py-24 lg:py-32">
                    <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
                            <Zap className="h-4 w-4" />
                            Trusted by 500+ companies worldwide
                        </div>

                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                            Modern Attendance
                            <span className="block gradient-text">Management System</span>
                        </h1>

                        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl text-balance">
                            Streamline your workforce management with real-time attendance tracking,
                            leave management, and payroll-ready reports. Built for the modern enterprise.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 mt-10">
                            <Link href="/auth/register" className="btn-premium px-8 py-4 text-base">
                                Start 14-Day Free Trial
                                <ArrowRight className="ml-2 h-5 w-5 inline" />
                            </Link>
                            <Link
                                href="#demo"
                                className="px-8 py-4 rounded-xl border border-border text-base font-medium hover:bg-muted transition-colors"
                            >
                                Watch Demo
                            </Link>
                        </div>

                        <div className="flex items-center gap-8 mt-12 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-primary" />
                                No credit card required
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-primary" />
                                14-day free trial
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-primary" />
                                Cancel anytime
                            </div>
                        </div>
                    </div>

                    {/* Dashboard Preview */}
                    <div className="mt-20 relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
                        <div className="glass-card rounded-2xl p-2 shadow-2xl">
                            <div className="rounded-xl overflow-hidden bg-muted aspect-[16/9] flex items-center justify-center">
                                <div className="text-muted-foreground">Dashboard Preview</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold">
                            Everything you need to manage attendance
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Powerful features designed for modern enterprises
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Clock,
                                title: 'Real-time Tracking',
                                description: 'Track check-ins, check-outs, and breaks in real-time with GPS and IP verification.',
                            },
                            {
                                icon: Calendar,
                                title: 'Leave Management',
                                description: 'Streamlined leave requests, approvals, and balance tracking with calendar view.',
                            },
                            {
                                icon: Users,
                                title: 'Team Management',
                                description: 'Manage departments, designations, and shifts with role-based access control.',
                            },
                            {
                                icon: BarChart3,
                                title: 'Advanced Reports',
                                description: 'Generate attendance, leave, and payroll reports with export to CSV, Excel, and PDF.',
                            },
                            {
                                icon: Shield,
                                title: 'Enterprise Security',
                                description: 'Bank-grade encryption, 2FA, and SOC 2 compliant infrastructure.',
                            },
                            {
                                icon: Globe,
                                title: 'Multi-timezone Support',
                                description: 'Perfect for distributed teams with automatic timezone handling.',
                            },
                        ].map((feature, index) => (
                            <div
                                key={index}
                                className="stats-card group hover:border-primary/20"
                            >
                                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <feature.icon className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                <p className="text-muted-foreground">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold">
                            Simple, transparent pricing
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Choose the plan that's right for your team
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {/* Starter */}
                        <div className="stats-card">
                            <h3 className="text-lg font-semibold">Starter</h3>
                            <div className="mt-4 mb-6">
                                <span className="text-4xl font-bold">$29</span>
                                <span className="text-muted-foreground">/month</span>
                            </div>
                            <p className="text-muted-foreground mb-6">Perfect for small teams getting started</p>
                            <ul className="space-y-3 mb-8">
                                {['Up to 25 employees', 'Basic attendance tracking', 'Leave management', 'Email support', 'Basic reports'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-primary" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/auth/register" className="block w-full py-3 text-center rounded-xl border border-border font-medium hover:bg-muted transition-colors">
                                Start Free Trial
                            </Link>
                        </div>

                        {/* Professional - Popular */}
                        <div className="stats-card relative border-primary/50 scale-105 shadow-glow">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                                Most Popular
                            </div>
                            <h3 className="text-lg font-semibold">Professional</h3>
                            <div className="mt-4 mb-6">
                                <span className="text-4xl font-bold">$79</span>
                                <span className="text-muted-foreground">/month</span>
                            </div>
                            <p className="text-muted-foreground mb-6">For growing companies</p>
                            <ul className="space-y-3 mb-8">
                                {['Up to 100 employees', 'GPS tracking', 'Shift management', 'Advanced reports', 'API access', 'Priority support'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-primary" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/auth/register" className="btn-premium block w-full py-3 text-center">
                                Start Free Trial
                            </Link>
                        </div>

                        {/* Enterprise */}
                        <div className="stats-card">
                            <h3 className="text-lg font-semibold">Enterprise</h3>
                            <div className="mt-4 mb-6">
                                <span className="text-4xl font-bold">$199</span>
                                <span className="text-muted-foreground">/month</span>
                            </div>
                            <p className="text-muted-foreground mb-6">For large organizations</p>
                            <ul className="space-y-3 mb-8">
                                {['Unlimited employees', 'Everything in Pro', 'White-label option', 'Custom integrations', 'Dedicated support', 'SLA guarantee'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-primary" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/auth/register" className="block w-full py-3 text-center rounded-xl border border-border font-medium hover:bg-muted transition-colors">
                                Contact Sales
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center glass-card rounded-3xl p-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Ready to transform your attendance management?
                        </h2>
                        <p className="text-lg text-muted-foreground mb-8">
                            Join hundreds of companies already using AttendancePro to streamline their HR operations.
                        </p>
                        <Link href="/auth/register" className="btn-premium inline-flex items-center px-8 py-4 text-base">
                            Start Your Free Trial
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t py-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold">AttendancePro</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            © 2026 AttendancePro. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
