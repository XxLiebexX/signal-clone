'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { setupRecaptcha, sendFirebaseOtp, verifyFirebaseOtp, isFirebaseConfigured } from '@/lib/firebase';
import { ConfirmationResult } from 'firebase/auth';
import { Shield, Smartphone, ArrowRight, UserCheck, Key, Sparkles, Flame, CheckCircle2 } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { loginWithPhone, switchUser, allDemoUsers, loading } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [useFirebase, setUseFirebase] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Clean up recaptcha container
    return () => {
      if (typeof window !== 'undefined' && (window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {}
      }
    };
  }, []);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Please enter a phone number in E.164 format (e.g. +15550192834)');
      return;
    }
    setError(null);

    if (useFirebase) {
      setSubmitting(true);
      try {
        if (!isFirebaseConfigured()) {
          setError('🔥 Firebase Setup Notice: Fill in your Firebase API key in frontend/.env.local to send live SMS. Proceeding with SMS OTP code 123456!');
          setStep('otp');
          setCode('123456');
          return;
        }

        const verifier = setupRecaptcha('recaptcha-container');
        if (!verifier) throw new Error('Recaptcha initialization failed');

        const result = await sendFirebaseOtp(phone.trim(), verifier);
        setConfirmationResult(result);
        setStep('otp');
      } catch (err: any) {
        console.warn('Firebase SMS OTP fallback:', err);
        setError(err.message || 'Firebase SMS trigger notice: Proceeding with verification code 123456');
        setStep('otp');
        setCode('123456');
      } finally {
        setSubmitting(false);
      }
    } else {
      setStep('otp');
      setCode('123456');
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (useFirebase && confirmationResult) {
        const { idToken } = await verifyFirebaseOtp(confirmationResult, code);
        // Authenticate with FastAPI backend
        const res = await fetch('http://127.0.0.1:8000/api/auth/firebase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phone.trim(),
            firebase_id_token: idToken,
          }),
        });

        if (!res.ok) throw new Error('Backend session creation failed');
        const data = await res.json();

        localStorage.setItem('signal_token', data.access_token);
        window.location.reload();
      } else {
        await loginWithPhone(phone.trim(), code || '123456');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check OTP code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-md bg-[#1E1E1E] border border-[#2C2C2E] rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 relative">
        
        {/* Invisible Recaptcha Container */}
        <div id="recaptcha-container" />

        {/* Signal Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#2C6BED] flex items-center justify-center shadow-lg shadow-[#2C6BED]/30 mb-3">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Signal Messenger</h2>
          <p className="text-xs text-[#8E8E93] mt-1">Real-time Encrypted Messaging with Firebase Auth</p>
        </div>

        {/* Auth Mode Selector */}
        <div className="flex items-center justify-center gap-2 mb-6 bg-[#1C1C1E] p-1 rounded-xl border border-[#2C2C2E]">
          <button
            type="button"
            onClick={() => setUseFirebase(true)}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              useFirebase ? 'bg-[#2C6BED] text-white shadow-md' : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Firebase SMS OTP
          </button>
          <button
            type="button"
            onClick={() => setUseFirebase(false)}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              !useFirebase ? 'bg-[#2C6BED] text-white shadow-md' : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Quick Demo Login
          </button>
        </div>

        {/* Quick User Switcher Section */}
        {allDemoUsers && allDemoUsers.length > 0 && (
          <div className="mb-6 p-3 bg-[#242426] border border-[#2C2C2E] rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#2C6BED] flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Quick Demo Accounts (1-Click)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {allDemoUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => switchUser(u)}
                  disabled={loading || submitting}
                  className="flex items-center gap-2 p-1.5 rounded-lg bg-[#1C1C1E] hover:bg-[#2C6BED]/20 border border-[#2C2C2E] hover:border-[#2C6BED] transition text-left group"
                >
                  <img
                    src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={u.display_name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <div className="overflow-hidden">
                    <div className="text-[11px] font-medium text-white truncate group-hover:text-[#2C6BED]">
                      {u.display_name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 text-center leading-relaxed">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] mb-1">
                Mobile Phone Number ({useFirebase ? 'Sends Real SMS OTP via Firebase' : 'Mock Code 123456'})
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-3 w-4 h-4 text-[#8E8E93]" />
                <input
                  type="tel"
                  placeholder="+1 555 019 2834"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-[#2C2C2E] focus:border-[#2C6BED] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#8E8E93] focus:outline-none transition"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#2C6BED] hover:bg-[#3B75EE] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#2C6BED]/20 text-xs"
            >
              <span>{submitting ? 'Sending SMS OTP...' : 'Send Verification OTP'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] mb-1">
                Enter 6-Digit SMS Verification Code
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3 w-4 h-4 text-[#8E8E93]" />
                <input
                  type="text"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-[#2C2C2E] focus:border-[#2C6BED] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#8E8E93] focus:outline-none transition tracking-widest text-center font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-1/3 bg-[#242426] hover:bg-[#2C2C2E] text-[#8E8E93] font-semibold py-2.5 rounded-xl transition text-xs"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-2/3 bg-[#2C6BED] hover:bg-[#3B75EE] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#2C6BED]/20 text-xs"
              >
                <UserCheck className="w-4 h-4" />
                <span>{submitting ? 'Verifying OTP...' : 'Confirm & Login'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
