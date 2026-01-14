'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
    ArrowRight, Check, Clock, BarChart3, Shield,
    Globe, Sparkles, Smartphone, Star,
    Github, Twitter, Linkedin,
    Menu, X, CheckCircle, Zap
} from 'lucide-react';
import { useState } from 'react';

export default function HomePage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-[#CCFF00]/30 font-sans overflow-x-hidden">
            {/* Header */}
            <header className="fixed top-0 z-50 w-full bg-[#050505]/80 backdrop-blur-md border-b border-white/5 transition-all">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[#CCFF00] shadow-[0_0_15px_rgba(204,255,0,0.3)] flex items-center justify-center hover:scale-105 transition-transform">
                            <Clock className="h-5 w-5 text-black transform -rotate-12 stroke-2" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xl font-bold text-white tracking-tight leading-none">
                                ATTENDIFY<span className="text-[#CCFF00]">.</span>
                            </span>
                            <span className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] uppercase">
                                MANAGEMENT
                            </span>
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center gap-8">
                        {['Features', 'How it works', 'Pricing', 'Resources'].map((item) => (
                            <Link key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm font-medium text-zinc-400 hover:text-[#CCFF00] transition-colors">
                                {item}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:block">
                            <Link href="/auth/login" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors mr-4">
                                Log in
                            </Link>
                            <Link href="/auth/register" className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-bold hover:bg-[#CCFF00] transition-colors shadow-lg shadow-white/5">
                                Get Started
                            </Link>
                        </div>
                        <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-black pt-24 px-6 md:hidden">
                    <nav className="flex flex-col gap-6 text-2xl font-bold">
                        {['Features', 'How it works', 'Pricing', 'Contact'].map((item) => (
                            <Link key={item} href="#" className="text-zinc-400 hover:text-[#CCFF00]" onClick={() => setMobileMenuOpen(false)}>
                                {item}
                            </Link>
                        ))}
                        <div className="h-px bg-white/10 my-4" />
                        <Link href="/auth/login" className="text-white">Log in</Link>
                        <Link href="/auth/register" className="text-[#CCFF00]">Get Started</Link>
                    </nav>
                </div>
            )}

            {/* Hero Section */}
            <section className="pt-32 pb-16 relative px-4 text-center overflow-hidden">
                {/* Background Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[#CCFF00]/5 rounded-full blur-[120px] pointer-events-none -z-10" />

                <div className="container mx-auto max-w-4xl relative z-10 mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-[#CCFF00] mb-8 animate-fade-in">
                        <Sparkles className="w-3 h-3" />
                        <span>Intelligent Workforce OS v2.0</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.15]">
                        Manage Workforce with <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#CCFF00] to-green-500">Clarity</span>, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#CCFF00] to-green-500">Control</span>, and <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#CCFF00] to-green-500">Confidence</span>
                    </h1>

                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                        The intelligent OS for modern teams. Track time, manage leave, and automate payroll with a beautiful, data-driven interface.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth/register" className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-black font-bold hover:bg-[#CCFF00] transition-colors shadow-[0_0_20px_rgba(255,255,255,0.15)] text-base">
                            Start 14-Day Free Trial
                        </Link>
                        <Link href="#demo" className="w-full sm:w-auto px-8 py-3.5 rounded-full border border-white/20 hover:border-[#CCFF00] hover:text-[#CCFF00] font-medium text-base transition-all flex items-center justify-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">▶</span> Watch Demo
                        </Link>
                    </div>
                </div>

                {/* Dashboard Preview Image */}
                <div className="container mx-auto max-w-6xl relative perspective-[2000px]">
                    <div className="absolute inset-x-0 -top-20 h-[300px] bg-gradient-to-b from-[#CCFF00]/10 to-transparent blur-3xl opacity-40 -z-10 rounded-[100%]" />
                    <div className="relative rounded-2xl border border-white/10 bg-[#0E0E0E] p-1.5 md:p-3 shadow-2xl overflow-hidden group">
                        <div className="relative rounded-xl overflow-hidden aspect-[16/10] bg-zinc-900 w-full">
                            <Image
                                src="/dashboard-preview.png"
                                alt="AttendancePro Dashboard"
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-[1.01]"
                                priority
                                unoptimized
                            />
                            {/* Overlay Gradient for Depth */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-20 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Client Logos */}
            <div className="w-full py-12 border-y border-white/5 bg-black/40">
                <div className="container mx-auto px-4">
                    <p className="text-sm font-medium text-center text-zinc-500 mb-8 uppercase tracking-widest">Trusted by innovative teams worldwide</p>
                    <div className="flex flex-wrap justify-center gap-12 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                        {['Acme Corp', 'Nebula', 'Vertex', 'Horizon', 'Pinnacle'].map((logo) => (
                            <div key={logo} className="text-xl font-bold flex items-center gap-2 text-white">
                                <div className="w-6 h-6 rounded bg-white/20" /> {logo}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Features (Bento Grid) */}
            <section id="features" className="py-24 relative bg-[#080808]">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="container mx-auto px-4 text-center mb-16 px-4">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">Everything you need to <span className="text-[#CCFF00]">scale</span></h2>
                    <p className="text-zinc-400 max-w-2xl mx-auto">Powerful features wrapped in a stunning interface. Managed complexity for the modern enterprise.</p>
                </div>

                <div className="container mx-auto px-4 grid md:grid-cols-3 gap-6 max-w-6xl">
                    {/* Large Card */}
                    <div className="md:col-span-2 rounded-[2rem] p-8 bg-zinc-900/30 border border-white/10 hover:border-[#CCFF00]/50 transition-colors group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#CCFF00]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                            <div className="h-12 w-12 rounded-2xl bg-[#CCFF00]/10 flex items-center justify-center mb-6">
                                <BarChart3 className="h-6 w-6 text-[#CCFF00]" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-white">Advanced Analytics</h3>
                            <p className="text-zinc-400 mb-8 max-w-md">Gain deep insights into your workforce. Track trends, predict shortages, and optimize schedules.</p>

                            {/* Abstract Chart Visual */}
                            <div className="flex gap-2 items-end h-24 w-64 opacity-50 group-hover:opacity-100 transition-opacity">
                                {[40, 70, 45, 90, 60, 75, 50].map((h, i) => (
                                    <div key={i} className="flex-1 bg-[#CCFF00]" style={{ height: `${h}%`, borderRadius: '4px 4px 0 0', opacity: 0.2 + (i * 0.1) }} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tall Card */}
                    <div className="md:row-span-2 rounded-[2rem] p-8 bg-zinc-900/30 border border-white/10 hover:border-[#CCFF00]/50 transition-colors group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-[#CCFF00]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="h-12 w-12 rounded-2xl bg-[#CCFF00]/10 flex items-center justify-center mb-6">
                                <Smartphone className="h-6 w-6 text-[#CCFF00]" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-white">Mobile First</h3>
                            <p className="text-zinc-400 mb-8">Empower your team with a native-grade mobile experience. Geofencing and selfie verification.</p>

                            <div className="mt-auto relative mx-auto w-48 h-64 border-4 border-zinc-800 rounded-[2rem] bg-black overflow-hidden shadow-2xl">
                                <div className="absolute top-0 w-full h-6 bg-zinc-800 flex justify-center"><div className="w-16 h-3 bg-black rounded-b-lg" /></div>
                                <div className="p-4 pt-10 grid gap-2">
                                    <div className="w-full h-8 bg-zinc-800 rounded-lg animate-pulse" />
                                    <div className="w-full h-24 bg-zinc-800/50 rounded-lg" />
                                    <div className="w-full h-8 bg-[#CCFF00]/20 rounded-lg" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Small Card 1 */}
                    <div className="rounded-[2rem] p-8 bg-zinc-900/30 border border-white/10 hover:border-[#CCFF00]/50 transition-colors group">
                        <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
                            <Globe className="h-6 w-6 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-white">Global Payroll</h3>
                        <p className="text-zinc-400 text-sm">Automated compliance for 50+ countries. Pay your team in crypto or fiat.</p>
                    </div>

                    {/* Small Card 2 */}
                    <div className="rounded-[2rem] p-8 bg-zinc-900/30 border border-white/10 hover:border-[#CCFF00]/50 transition-colors group">
                        <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6">
                            <Shield className="h-6 w-6 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-white">Enterprise Security</h3>
                        <p className="text-zinc-400 text-sm">SOC2 Type II certified. End-to-end encryption and custom access.</p>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-24 relative bg-[#050505]">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent <span className="text-[#CCFF00]">pricing</span></h2>
                        <p className="text-zinc-400">Start free, upgrade as you grow.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {/* Starter */}
                        <div className="p-8 rounded-3xl bg-zinc-900/20 border border-white/10 flex flex-col hover:bg-zinc-900/40 transition-colors">
                            <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
                            <div className="text-4xl font-bold text-white mb-6">$0<span className="text-lg text-zinc-500 font-normal">/mo</span></div>
                            <p className="text-zinc-400 mb-8">Perfect for small teams getting started.</p>
                            <ul className="space-y-4 mb-8 flex-1">
                                {['Up to 5 employees', 'Basic time tracking', 'Mobile access'].map(f => (
                                    <li key={f} className="flex items-center gap-3 text-sm text-zinc-300"><Check className="w-4 h-4 text-zinc-500" /> {f}</li>
                                ))}
                            </ul>
                            <button className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-medium">Get Started</button>
                        </div>

                        {/* Growth - Highlighted */}
                        <div className="p-8 rounded-3xl bg-zinc-900/60 border border-[#CCFF00]/50 flex flex-col relative shadow-[0_0_30px_-10px_rgba(204,255,0,0.15)] transform md:-translate-y-2">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#CCFF00] text-black text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>
                            <h3 className="text-xl font-bold text-white mb-2">Growth</h3>
                            <div className="text-4xl font-bold text-white mb-6">$29<span className="text-lg text-zinc-500 font-normal">/mo</span></div>
                            <p className="text-zinc-400 mb-8">For growing companies that need power.</p>
                            <ul className="space-y-4 mb-8 flex-1">
                                {['Up to 50 employees', 'Advanced analytics', 'Payroll export', 'Slack integration'].map(f => (
                                    <li key={f} className="flex items-center gap-3 text-sm text-white"><Check className="w-4 h-4 text-[#CCFF00]" /> {f}</li>
                                ))}
                            </ul>
                            <button className="w-full py-3 rounded-xl bg-[#CCFF00] hover:bg-[#b3e600] text-black transition-colors font-bold shadow-lg shadow-[#CCFF00]/20">Start Free Trial</button>
                        </div>

                        {/* Enterprise */}
                        <div className="p-8 rounded-3xl bg-zinc-900/20 border border-white/10 flex flex-col hover:bg-zinc-900/40 transition-colors">
                            <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
                            <div className="text-4xl font-bold text-white mb-6">Custom</div>
                            <p className="text-zinc-400 mb-8">Custom solutions for large organizations.</p>
                            <ul className="space-y-4 mb-8 flex-1">
                                {['Unlimited employees', 'Custom Integrations', 'Dedicated Support', 'SLA'].map(f => (
                                    <li key={f} className="flex items-center gap-3 text-sm text-zinc-300"><Check className="w-4 h-4 text-zinc-500" /> {f}</li>
                                ))}
                            </ul>
                            <button className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-medium">Contact Sales</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-24 border-t border-white/5 bg-[#080808]">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-16">Loved by <span className="text-[#CCFF00]">Industry Leaders</span></h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { q: "AttendancePro transformed how we manage our remote workforce. The geofencing features are a game changer.", a: "Sarah Johnson", r: "VP of HR, TechFlow" },
                            { q: "The most beautiful enterprise software I've ever used. It's actually a joy to log in every morning.", a: "Michael Chen", r: "Director of Ops, Nebulon" },
                            { q: "Payroll used to take 3 days. Now it takes 30 minutes. The ROI was immediate and substantial.", a: "Elena Rodriguez", r: "CFO, BuildScale" }
                        ].map((t, i) => (
                            <div key={i} className="bg-zinc-900/30 border border-white/5 p-8 rounded-2xl relative">
                                <div className="flex gap-1 mb-4">
                                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-[#CCFF00] text-[#CCFF00]" />)}
                                </div>
                                <p className="text-zinc-300 mb-6 leading-relaxed">"{t.q}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">{t.a.charAt(0)}</div>
                                    <div>
                                        <div className="font-bold text-white text-sm">{t.a}</div>
                                        <div className="text-xs text-zinc-500">{t.r}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/10 bg-black text-zinc-500 text-sm">
                <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 text-white">
                        <div className="w-6 h-6 rounded-lg bg-[#CCFF00] flex items-center justify-center">
                            <Clock className="w-3 h-3 text-black transform -rotate-12 stroke-2" />
                        </div>
                        <span className="font-bold text-lg">ATTENDIFY.</span>
                    </div>
                    <div className="flex gap-8">
                        <Link href="#" className="hover:text-white">Privacy</Link>
                        <Link href="#" className="hover:text-white">Terms</Link>
                        <Link href="#" className="hover:text-white">Twitter</Link>
                    </div>
                    <div>© 2026 Attendify Inc.</div>
                </div>
            </footer>
        </div>
    );
}
