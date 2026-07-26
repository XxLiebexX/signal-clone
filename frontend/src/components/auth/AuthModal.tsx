'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { setupRecaptcha, sendFirebaseOtp, verifyFirebaseOtp, isFirebaseConfigured } from '@/lib/firebase';
import { ConfirmationResult } from 'firebase/auth';
import { Shield, Smartphone, ArrowRight, UserCheck, Key, Sparkles, Flame, CheckCircle2, User } from 'lucide-react';

const HARDCODED_DEMO_ACCOUNTS = [
  {
    display_name: 'Yuvraj',
    phone: '+919876543210',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
    about: 'Privacy Enthusiast & Tech Lead 🛡️',
  },
  {
    display_name: 'Angel',
    phone: '+919876543211',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    about: 'Building modern fullstack applications 🚀',
  },
  {
    display_name: 'Rio',
    phone: '+919876543212',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    about: 'Signal UI & Encrypted Chat Advocate ✨',
  },
];

export const AuthModal: React.FC = () => {
  const { loginWithPhone, loading } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [useCustomPhone, setUseCustomPhone] = useState(false);
  const [useFirebase, setUseFirebase] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && (window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {}
      }
    };
  }, []);

  const handleDirectDemoLogin = async (phoneNum: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithPhone(phoneNum, '123456');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Please enter a phone number (e.g. +919876543210)');
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
        const data = await api.firebaseLogin(phone.trim(), idToken);
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
          <p className="text-xs text-[#8E8E93] mt-1">Select an account below for instant 1-Click Login</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 text-center leading-relaxed">
            {error}
          </div>
        )}

        {/* PROMINENT 1-CLICK DIRECT LOGIN BUTTONS */}
        <div className="mb-6 space-y-2">
          <div className="text-[11px] font-bold text-[#2C6BED] uppercase tracking-wider text-center mb-2 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Direct 1-Click Account Login
          </div>

          {HARDCODED_DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.phone}
              type="button"
              onClick={() => handleDirectDemoLogin(acc.phone)}
              disabled={loading || submitting}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#242426] hover:bg-[#2C6BED] border border-[#2C2C2E] hover:border-[#2C6BED] transition-all duration-200 group shadow-md"
            >
              <div className="flex items-center gap-3">
                <img
                  src={acc.avatar_url}
                  alt={acc.display_name}
                  className="w-10 h-10 rounded-full object-cover border border-[#2C2C2E] group-hover:border-white/40 transition"
                />
                <div className="text-left">
                  <div className="text-sm font-bold text-white group-hover:text-white transition">
                    Login as {acc.display_name}
                  </div>
                  <div className="text-[11px] text-[#8E8E93] group-hover:text-white/80 transition">
                    {acc.about}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#2C6BED] group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>

        {/* CUSTOM PHONE NUMBER ACCORDION TOGGLE */}
        <div className="pt-2 border-t border-[#2C2C2E]/60 text-center">
          <button
            type="button"
            onClick={() => setUseCustomPhone(!useCustomPhone)}
            className="text-xs text-[#8E8E93] hover:text-[#2C6BED] font-medium transition"
          >
            {useCustomPhone ? '▲ Hide Custom Phone Input' : '▼ Or enter a custom phone number / SMS OTP'}
          </button>

          {useCustomPhone && (
            <div className="mt-4 transition-all">
              {step === 'phone' ? (
                <form onSubmit={handlePhoneSubmit} className="space-y-3">
                  <div>
                    <input
                      type="tel"
                      placeholder="e.g. +919876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] focus:border-[#2C6BED] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#8E8E93] focus:outline-none transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#2C6BED] hover:bg-[#3B75EE] disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow"
                  >
                    <span>{submitting ? 'Connecting...' : 'Proceed with OTP 123456'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleOtpSubmit} className="space-y-3">
                  <div>
                    <input
                      type="text"
                      placeholder="123456"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#2C2C2E] focus:border-[#2C6BED] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#8E8E93] focus:outline-none transition text-center font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep('phone')}
                      className="w-1/3 bg-[#242426] hover:bg-[#2C2C2E] text-[#8E8E93] font-semibold py-2 rounded-xl transition text-xs"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-2/3 bg-[#2C6BED] hover:bg-[#3B75EE] disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition flex items-center justify-center gap-2 text-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Confirm & Login</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
