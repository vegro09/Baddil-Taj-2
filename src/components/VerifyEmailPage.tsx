import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, CheckCircle2, RefreshCw, LogOut, AlertCircle, Landmark } from 'lucide-react';
import { dbService } from '../db/dbService';
import { auth } from '../db/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { useTranslation } from './LanguageContext';

interface VerifyEmailPageProps {
  onVerified: () => void;
  onLogout: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function VerifyEmailPage({ onVerified, onLogout, showToast }: VerifyEmailPageProps) {
  const { t, language } = useTranslation();
  const [userEmail, setUserEmail] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(0);

  const isAr = language === 'ar';

  useEffect(() => {
    if (auth?.currentUser) {
      setUserEmail(auth.currentUser.email || '');
      if (auth.currentUser.emailVerified) {
        onVerified();
      }
    }
  }, [onVerified]);

  // Handle cooldown timer for email resend
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendVerification = async () => {
    if (!auth?.currentUser) {
      showToast(isAr ? "يرجى تسجيل الدخول أولاً" : "Please log in first", 'error');
      return;
    }
    setSending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      showToast(
        isAr 
          ? "🎉 تم إرسال رابط التحقق بنجاح! يرجى مراجعة بريدك الإلكتروني (بما في ذلك البريد المزعج Spam)." 
          : "🎉 Verification link sent successfully! Please check your email inbox (including spam folder).",
        'success'
      );
      setCooldown(60); // 1 minute cooldown
    } catch (err: any) {
      console.error("Failed to send verification email:", err);
      showToast(
        isAr 
          ? "فشل إرسال البريد. يرجى المحاولة مرة أخرى لاحقاً." 
          : "Failed to send verification email. Please try again later.",
        'error'
      );
    } finally {
      setSending(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!auth?.currentUser) return;
    setChecking(true);
    try {
      // Reload current user info from Firebase Server
      await auth.currentUser.reload();
      const updatedUser = auth.currentUser;
      
      if (updatedUser?.emailVerified) {
        showToast(
          isAr 
            ? "💚 تهانينا! تم تفعيل حسابك بنجاح." 
            : "💚 Congratulations! Your account has been successfully verified.",
          'success'
        );
        onVerified();
      } else {
        showToast(
          isAr 
            ? "لم يتم تفعيل الحساب بعد. يرجى الضغط على الرابط المرسل إلى بريدك الإلكتروني." 
            : "Account not verified yet. Please click the link sent to your email inbox.",
          'info'
        );
      }
    } catch (err: any) {
      console.error("Failed to reload user verification status:", err);
      showToast(
        isAr 
          ? "حدث خطأ أثناء تحديث الحالة. حاول مرة أخرى." 
          : "Failed to refresh verification status. Try again.",
        'error'
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto bg-white rounded-3xl border border-slate-100 p-8 shadow-xl shadow-slate-100 text-center space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex justify-center">
        <div className="bg-emerald-50 text-emerald-600 p-5 rounded-full animate-pulse">
          <Mail className="h-12 w-12" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-black text-slate-800">
          {isAr ? "تفعيل الحساب مطلوب ⚠️" : "Account Verification Required ⚠️"}
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          {isAr 
            ? "من أجل سلامة وأمان مجتمع بَدَل، يرجى تفعيل حسابك عن طريق تأكيد بريدك الإلكتروني لتتمكن من إضافة إعلانات مقايضة أو بدء محادثات مع مستخدمين آخرين." 
            : "To ensure the safety of the Badal community, please verify your email address to add barter listings or initiate chats with other users."}
        </p>
      </div>

      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-right flex flex-col items-center gap-1">
        <span className="text-[10px] text-slate-400 font-bold w-full text-center">
          {isAr ? "بريدك الإلكتروني المسجل:" : "Your registered email:"}
        </span>
        <span className="text-sm font-black text-slate-700 font-mono break-all text-center">
          {userEmail || "—"}
        </span>
      </div>

      <div className="space-y-3 pt-2">
        {/* Send verification email button */}
        <button
          onClick={handleSendVerification}
          disabled={sending || cooldown > 0}
          className={`w-full py-3 px-4 rounded-2xl font-black text-xs transition-all duration-300 flex items-center justify-center gap-2 ${
            cooldown > 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10 active:scale-[0.98]'
          }`}
        >
          {sending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {cooldown > 0
            ? (isAr ? `إعادة الإرسال بعد ${cooldown} ثانية` : `Resend in ${cooldown}s`)
            : (isAr ? "إرسال رابط التفعيل" : "Send Verification Link")}
        </button>

        {/* Refresh status button */}
        <button
          onClick={handleCheckStatus}
          disabled={checking}
          className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          {isAr ? "تحديث حالة التفعيل" : "Check Activation Status"}
        </button>
      </div>

      <div className="border-t border-slate-100 pt-5 flex justify-between items-center text-xs">
        <button
          onClick={onLogout}
          className="text-rose-600 hover:text-rose-700 font-black flex items-center gap-1 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {isAr ? "تسجيل الخروج" : "Log Out"}
        </button>

        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold">
          <AlertCircle className="h-3 w-3" />
          {isAr ? "بَدَل دائمًا آمن وموثوق" : "Badal is always secure"}
        </span>
      </div>
    </div>
  );
}
