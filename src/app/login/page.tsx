"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Kanban, KeyRound, Loader2 } from "lucide-react";

type AuthStep = "CREDENTIALS" | "VERIFY_CODE" | "NEW_PASSWORD";

const RESEND_COOLDOWN = 30;

function LoginForm() {
  const [step, setStep] = useState<AuthStep>("CREDENTIALS");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" | "" }>({
    text: "",
    type: "",
  });

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Detect return from password-reset link or social callback error
  useEffect(() => {
    if (searchParams.get("mode") === "reset-password") {
      setStep("NEW_PASSWORD");
    }
    if (searchParams.get("error") === "auth_callback_failed") {
      setMessage({ text: "Google sign-in didn't complete. Please try again.", type: "error" });
    }
  }, [searchParams]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) {
      setMessage({ text: error.message, type: "error" });
      setLoading(false);
    }
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) {
        setMessage({ text: signUpError.message, type: "error" });
        setLoading(false);
        return;
      }

      if (data.user && data.user.identities?.length === 0) {
        setMessage({
          text: "An account with this email already exists. Try signing in instead.",
          type: "error",
        });
        setLoading(false);
        return;
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });

      if (otpError) {
        setMessage({ text: otpError.message, type: "error" });
      } else {
        setMessage({ text: "Account created! Check your email for the 6-digit code.", type: "success" });
        setStep("VERIFY_CODE");
        setResendCooldown(RESEND_COOLDOWN);
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ text: "Invalid email or password. Please try again.", type: "error" });
      } else if (data.user) {
        router.push("/dashboard");
      }
    }
    setLoading(false);
  };

  const handleForgotPasswordTrigger = async () => {
    if (!email) {
      setMessage({ text: "Please enter your email address first.", type: "error" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setLoading(false);

    if (error) {
      setMessage({ text: error.message, type: "error" });
    } else {
      setMessage({
        text: "Password reset link sent! Check your email to set a new password.",
        type: "success",
      });
    }
  };

  const handleOtpChange = (index: number, raw: string) => {
    const val = raw.replace(/\D/g, "").slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
    if (val && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtpDigits(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setMessage({ text: "", type: "" });

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    setLoading(false);
    if (error) {
      setMessage({ text: error.message, type: "error" });
    } else {
      setOtpDigits(Array(6).fill(""));
      otpRefs.current[0]?.focus();
      setMessage({ text: "New code sent to your email.", type: "success" });
      setResendCooldown(RESEND_COOLDOWN);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otpDigits.join("");
    if (token.length !== 6) {
      setMessage({ text: "Please enter all 6 digits.", type: "error" });
      return;
    }
    setLoading(true);
    setMessage({ text: "", type: "" });

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    setLoading(false);

    if (error) {
      setMessage({ text: "Incorrect or expired code. Try resending.", type: "error" });
    } else if (data.user) {
      router.push("/dashboard");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ text: "Password must be at least 6 characters.", type: "error" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      setMessage({ text: error.message, type: "error" });
    } else {
      setMessage({ text: "Password updated! Redirecting…", type: "success" });
      setTimeout(() => router.push("/dashboard"), 1500);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-slate-900">
      {/* Left branding */}
      <div className="hidden lg:flex w-1/2 bg-indigo-600 items-center justify-center p-12 text-white">
        <div className="max-w-md space-y-6">
          <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
            <Kanban className="h-10 w-10" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight leading-tight">
            Manage teams<br />with ease.
          </h1>
          <p className="text-indigo-100 text-lg leading-relaxed">
            The all-in-one collaboration hub for modern product teams.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {["Kanban Boards", "Live Chat", "Team Members", "Real-time Sync"].map((f) => (
              <div key={f} className="bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-sm font-medium">{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50/50">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-7">

          {/* Header */}
          <div className="text-center space-y-1">
            <div className="lg:hidden flex justify-center mb-4">
              <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-md">
                <Kanban className="h-6 w-6" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              {step === "CREDENTIALS"
                ? isSignUp ? "Get Started" : "Welcome Back"
                : step === "VERIFY_CODE"
                ? "Check your email"
                : "Set new password"}
            </h2>
            <p className="text-slate-500 text-sm">
              {step === "CREDENTIALS"
                ? isSignUp
                  ? "Create your account to start collaborating"
                  : "Enter your details to access your workspace"
                : step === "VERIFY_CODE"
                ? `We sent a 6-digit code to ${email}`
                : "Choose a strong new password for your account"}
            </p>
          </div>

          {/* ── STEP 1: Credentials ── */}
          {step === "CREDENTIALS" && (
            <div className="space-y-5">
              <button
                onClick={handleGoogleLogin}
                type="button"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 py-3 rounded-xl hover:bg-slate-50 transition-all font-medium text-slate-700 shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Continue with Google
              </button>

              <div className="relative flex items-center">
                <div className="flex-grow border-t border-slate-200" />
                <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase tracking-widest font-semibold">or email</span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              <form onSubmit={handleInitialSubmit} className="space-y-4">
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

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700">Password</label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={handleForgotPasswordTrigger}
                        disabled={loading}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
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
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {isSignUp ? "Create Account" : "Sign In"}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  onClick={() => { setIsSignUp(!isSignUp); setMessage({ text: "", type: "" }); }}
                  className="font-bold text-indigo-600 hover:underline"
                >
                  {isSignUp ? "Log In" : "Sign up for free"}
                </button>
              </p>
            </div>
          )}

          {/* ── STEP 2: OTP Verification ── */}
          {step === "VERIFY_CODE" && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex justify-center mb-2">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center">
                  <KeyRound className="h-7 w-7 text-indigo-600" />
                </div>
              </div>

              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !digit && index > 0) otpRefs.current[index - 1]?.focus();
                      else if (e.key === "ArrowLeft" && index > 0) otpRefs.current[index - 1]?.focus();
                      else if (e.key === "ArrowRight" && index < 5) otpRefs.current[index + 1]?.focus();
                    }}
                    className="w-12 h-14 text-center font-bold text-xl rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
                  />
                ))}
              </div>

              {message.text && (
                <div className={`p-3 rounded-xl text-sm font-medium text-center border ${message.type === "error" ? "bg-red-50 text-red-600 border-red-100" : "bg-indigo-50 text-indigo-700 border-indigo-100"}`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otpDigits.join("").length !== 6}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 active:scale-[0.98] transition disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify Code
              </button>

              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || loading}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 disabled:text-slate-400"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
                <br />
                <button
                  type="button"
                  onClick={() => { setStep("CREDENTIALS"); setOtpDigits(Array(6).fill("")); setMessage({ text: "", type: "" }); }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  ← Back to sign in
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: Set new password ── */}
          {step === "NEW_PASSWORD" && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="flex justify-center mb-2">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center">
                  <Lock className="h-7 w-7 text-indigo-600" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Confirm Password</label>
                <input
                  type="password"
                  required
                  placeholder="Must match above"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                />
              </div>

              {message.text && (
                <div className={`p-3 rounded-xl text-sm font-medium border ${message.type === "error" ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Password
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

// Wrap the form cleanly in Suspense for Next.js build optimization
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}