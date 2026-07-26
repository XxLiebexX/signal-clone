import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  UserCredential,
} from 'firebase/auth';

export const isFirebaseConfigured = () => {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  return Boolean(key && key !== 'your_firebase_api_key_here' && !key.includes('Demo'));
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDemoFirebaseApiKeySignalCloneKey123',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'signal-clone-demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'signal-clone-demo',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'signal-clone-demo.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789012:web:demo1234567890',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

// Helper to set up Recaptcha Verifier
export const setupRecaptcha = (containerId: string = 'recaptcha-container') => {
  if (typeof window === 'undefined') return null;

  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch (e) {
      console.warn('Failed to clear old recaptchaVerifier', e);
    }
  }

  const verifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'invisible',
    callback: () => {
      console.log('[Firebase Auth] Recaptcha verified successfully');
    },
    'expired-callback': () => {
      console.warn('[Firebase Auth] Recaptcha expired');
    },
  });

  (window as any).recaptchaVerifier = verifier;
  return verifier;
};

// Helper to send real SMS OTP via Firebase
export const sendFirebaseOtp = async (
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  try {
    const confirmationResult = await signInWithPhoneNumber(firebaseAuth, phoneNumber, verifier);
    return confirmationResult;
  } catch (error: any) {
    console.error('[Firebase Auth] Error sending SMS OTP:', error);
    throw error;
  }
};

// Helper to verify user entered SMS OTP code
export const verifyFirebaseOtp = async (
  confirmationResult: ConfirmationResult,
  otpCode: string
): Promise<{ userCredential: UserCredential; idToken: string }> => {
  const userCredential = await confirmationResult.confirm(otpCode);
  const idToken = await userCredential.user.getIdToken();
  return { userCredential, idToken };
};
