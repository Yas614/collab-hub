"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Mail, ArrowRight, Loader2, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    setLoading(false);

    if (error) {
      setMessage({ text: error.message, type: "error" });
    } else {
      setMessage({
        text: "Check your inbox! We've sent a password reset link.",
        type: "success",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 p-6 font-sans">
      <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl border border-slate-100 space-y-7">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <KeyRound className="h-7 w-7 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Reset your password</h2>
          <p className="text-slate-500 text-sm">
            Enter your email and we'll send you a secure link to create a new password.
          </p>
        </div>

        <form onSubmit={handleRequestReset} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
              />
            </div>
          </div>

          {message.text && (
            <div className={`p-3 rounded-xl text-sm font-medium border ${message.type === "error" ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Send Reset Link
          </button>
        </form>

        <div className="text-center">
          <Link href="/login" className="text-xs font-semibold text-slate-400 hover:text-slate-600">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}