"use client";

import { useEffect, useState } from "react";
import { buttonClasses } from "@/lib/ui";

type AuthMethod = "otp" | "password" | "reset";
type AuthMode = "signup" | "login";

const INPUT = "rounded-control border border-neutral-200 px-3 py-2.5 text-sm text-ink";
const LABEL = "text-sm text-ink-secondary";

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`flex-1 rounded-control border py-2 text-sm font-semibold ${
        active ? "border-primary bg-primary text-white" : "border-neutral-200 text-ink"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function SignupPage() {
  const [method, setMethod] = useState<AuthMethod>("otp");
  const [mode, setMode] = useState<AuthMode>("signup");

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const t = setInterval(() => setCooldownSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldownSeconds]);

  async function requestOtp() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request-otp", { method: "POST", body: JSON.stringify({ phone }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429 && data.secondsRemaining) {
          setCooldownSeconds(data.secondsRemaining);
        }
        throw new Error(data.error ?? "Could not send code");
      }
      setStep("otp");
      setCooldownSeconds(60);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function confirmOtp() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, code, firstName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Distinguish the specific failure modes the spec calls for.
        if (res.status === 410) throw new Error("This code has expired. Request a new one.");
        if (res.status === 429) throw new Error("Too many incorrect attempts. Request a new code.");
        if (res.status === 401) throw new Error("That code isn't right. Please try again.");
        throw new Error(data.error ?? "Could not verify code");
      }
      window.location.href = "/search";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submitPassword() {
    setLoading(true);
    setError(null);
    try {
      const action = mode === "signup" ? "signup" : "login";
      const res = await fetch("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ action, phone, password, firstName: mode === "signup" ? firstName : undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Something went wrong");
      }
      window.location.href = "/search";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submitReset() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ phone, code, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 410) throw new Error("This code has expired. Request a new one.");
        if (res.status === 429) throw new Error("Too many incorrect attempts. Request a new code.");
        if (res.status === 401) throw new Error("That code isn't right. Please try again.");
        throw new Error(data.error ?? "Could not reset password");
      }
      window.location.href = "/search";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function switchMethod(next: AuthMethod) {
    setMethod(next);
    setStep("phone");
    setError(null);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="font-display text-lg font-bold text-ink">Covoit TN</h1>

      <div className="flex flex-col gap-4 rounded-card bg-white p-5 shadow-card">
        <div className="flex gap-2">
          <TabButton active={method === "otp"} onClick={() => switchMethod("otp")}>
            Sign in with OTP
          </TabButton>
          <TabButton active={method === "password"} onClick={() => switchMethod("password")}>
            Sign in with password
          </TabButton>
        </div>

        {method === "otp" && step === "phone" && (
          <>
            <label className={LABEL}>Phone number</label>
            <input className={INPUT} placeholder="+216 XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button className={buttonClasses("primary")} disabled={!phone || loading || cooldownSeconds > 0} onClick={requestOtp}>
              {loading ? "Sending…" : cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : "Send code via WhatsApp"}
            </button>
          </>
        )}

        {method === "otp" && step === "otp" && (
          <>
            <p className="text-sm text-ink-secondary">We sent a code to {phone} on WhatsApp.</p>
            <label className={LABEL}>Enter the 6-digit code</label>
            <input className={`${INPUT} tracking-widest`} maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
            <label className={LABEL}>First name</label>
            <input className={INPUT} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <button className={buttonClasses("primary")} disabled={code.length !== 6 || !firstName || loading} onClick={confirmOtp}>
              {loading ? "Verifying…" : "Continue"}
            </button>
            <button
              type="button"
              className="text-center text-sm text-ink-secondary underline disabled:opacity-50 disabled:no-underline"
              disabled={cooldownSeconds > 0 || loading}
              onClick={requestOtp}
            >
              {cooldownSeconds > 0 ? `Resend code in ${cooldownSeconds}s` : "Resend code"}
            </button>
          </>
        )}

        {method === "password" && (
          <>
            <div className="flex gap-2 text-sm">
              <button
                className={`flex-1 py-1 ${mode === "signup" ? "font-semibold text-primary underline" : "text-ink-secondary"}`}
                onClick={() => setMode("signup")}
              >
                Create account
              </button>
              <button
                className={`flex-1 py-1 ${mode === "login" ? "font-semibold text-primary underline" : "text-ink-secondary"}`}
                onClick={() => setMode("login")}
              >
                Log in
              </button>
            </div>

            <label className={LABEL}>Phone number</label>
            <input className={INPUT} placeholder="+216 XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} />

            {mode === "signup" && (
              <>
                <label className={LABEL}>First name</label>
                <input className={INPUT} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </>
            )}

            <label className={LABEL}>Password</label>
            <input className={INPUT} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {mode === "signup" && <p className="text-xs text-ink-secondary">At least 8 characters.</p>}

            <button
              className={buttonClasses("primary")}
              disabled={!phone || !password || (mode === "signup" && !firstName) || loading}
              onClick={submitPassword}
            >
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
            </button>

            {mode === "login" && (
              <button type="button" className="text-center text-sm text-ink-secondary underline" onClick={() => switchMethod("reset")}>
                Forgot password?
              </button>
            )}
          </>
        )}

        {method === "reset" && step === "phone" && (
          <>
            <p className="text-sm text-ink-secondary">We'll send a code via WhatsApp to reset your password.</p>
            <label className={LABEL}>Phone number</label>
            <input className={INPUT} placeholder="+216 XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button className={buttonClasses("primary")} disabled={!phone || loading || cooldownSeconds > 0} onClick={requestOtp}>
              {loading ? "Sending…" : cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : "Send code via WhatsApp"}
            </button>
            <button type="button" className="text-center text-sm text-ink-secondary underline" onClick={() => switchMethod("password")}>
              Back to log in
            </button>
          </>
        )}

        {method === "reset" && step === "otp" && (
          <>
            <p className="text-sm text-ink-secondary">We sent a code to {phone} on WhatsApp.</p>
            <label className={LABEL}>Enter the 6-digit code</label>
            <input className={`${INPUT} tracking-widest`} maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
            <label className={LABEL}>New password</label>
            <input className={INPUT} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <p className="text-xs text-ink-secondary">At least 8 characters.</p>
            <button
              className={buttonClasses("primary")}
              disabled={code.length !== 6 || newPassword.length < 8 || loading}
              onClick={submitReset}
            >
              {loading ? "Resetting…" : "Reset password"}
            </button>
            <button
              type="button"
              className="text-center text-sm text-ink-secondary underline disabled:opacity-50 disabled:no-underline"
              disabled={cooldownSeconds > 0 || loading}
              onClick={requestOtp}
            >
              {cooldownSeconds > 0 ? `Resend code in ${cooldownSeconds}s` : "Resend code"}
            </button>
          </>
        )}

        {error && <p className="rounded-control bg-error/8 p-3 text-sm text-error-dark">{error}</p>}
      </div>
    </main>
  );
}
