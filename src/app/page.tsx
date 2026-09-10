import Link from "next/link";
import { Kanban, MessageSquare, Shield, Zap, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen font-sans selection:bg-blue-500/20">
      {/* Header / Navbar */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-sm shadow-blue-500/20">
            <Kanban className="h-5 w-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">
            CollabHub
          </span>
        </div>
        <Link
          href="/login"
          className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
        >
          Sign In
        </Link>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto text-center px-6 pt-24 pb-16">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 leading-tight">
          Where real-time teams <br />
          get deep work done.
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
          The ultimate workspace pairing live, interactive Kanban task boards with sub-second team chat. Built for fast-moving workflows.
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            href="/login"
            className="group bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Quick Feature Grid */}
      <section className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8 border-t border-slate-200">
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit mb-4 border border-blue-100">
            <Kanban className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-lg mb-2 text-slate-900">Visual Boards</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Organize tasks, assign ownership, and manage production lanes visually with our ultra-clean agile setup.
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl w-fit mb-4 border border-sky-100">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-lg mb-2 text-slate-900">Live Team Chat</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Ditch messy notification sub-menus. Keep task context directly next to persistent, lightning-fast workspace rooms.
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit mb-4 border border-indigo-100">
            <Zap className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-lg mb-2 text-slate-900">Real-Time Sync</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Powered by Supabase broadcast infrastructure. Every task shift and typed message synchronizes instantly across open browsers.
          </p>
        </div>
      </section>
    </div>
  );
}