import Link from "next/link";
import { Kanban, MessageSquare, Shield, Zap, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans selection:bg-indigo-500/30">
      
      {/* Header / Navbar */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Kanban className="h-5 w-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">CollabHub</span>
        </div>
        <Link 
          href="/login" 
          className="text-sm font-semibold text-slate-300 hover:text-white transition"
        >
          Sign In
        </Link>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto text-center px-6 pt-20 pb-16">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 leading-tight">
          Where real-time teams <br />
          get deep work done.
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
          The ultimate workspace pairing live, interactive Kanban task boards with sub-second team chat. Built for fast-moving workflows.
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            href="/login"
            className="group bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3.5 rounded-xl font-semibold shadow-xl shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Quick Feature Grid */}
      <section className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8 border-t border-slate-800/40">
        <div className="bg-slate-800/40 border border-slate-800 p-6 rounded-2xl">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit mb-4">
            <Kanban className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-lg mb-2 text-slate-100">Visual Boards</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Organize tasks, assign ownership, and manage production lanes visually with our ultra-clean agile setup.
          </p>
        </div>

        <div className="bg-slate-800/40 border border-slate-800 p-6 rounded-2xl">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl w-fit mb-4">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-lg mb-2 text-slate-100">Live Team Chat</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Ditch messy notification sub-menus. Keep task context directly next to persistent, lightning-fast workspace rooms.
          </p>
        </div>

        <div className="bg-slate-800/40 border border-slate-800 p-6 rounded-2xl">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit mb-4">
            <Zap className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-lg mb-2 text-slate-100">Real-Time Sync</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Powered by Supabase broadcast infrastructure. Every task shift and typed message synchronizes instantly across open browsers.
          </p>
        </div>
      </section>
    </div>
  );
}