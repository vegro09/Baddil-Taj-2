import { useState } from 'react';
import { useTranslation } from './LanguageContext';
import { ShieldAlert, CheckCircle2, LogOut, ArrowRight, ArrowLeft, Loader2, Landmark, Mail } from 'lucide-react';
import { dbService } from '../db/dbService';
import { 
  TERMS_CONTENT_AR, 
  PRIVACY_CONTENT_AR, 
  TERMS_CONTENT_EN, 
  PRIVACY_CONTENT_EN,
  LEGAL_LAST_UPDATED_AR,
  LEGAL_LAST_UPDATED_EN 
} from '../data/legalContents';

// Styled renderer to keep elements clean, responsive, and styled with Tailwind inside Drawer
function StyledMarkdown({ text, isAr }: { text: string; isAr: boolean }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-4">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed === '') return null;

        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-lg sm:text-xl font-black text-slate-800 border-b border-slate-100 pb-2 leading-tight pt-1">
              {trimmed.replace('# ', '')}
            </h1>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-sm sm:text-base font-bold text-slate-700 mt-4 leading-snug">
              {trimmed.replace('## ', '')}
            </h2>
          );
        }
        if (/^\d+\.\s*/.test(trimmed)) {
          const content = trimmed.replace(/^\d+\.\s*/, '');
          return (
            <div key={idx} className="flex gap-1.5 text-slate-600 text-xs leading-relaxed rtl:mr-2 ltr:ml-2">
              <span className="font-bold text-emerald-600">•</span>
              <span>{content}</span>
            </div>
          );
        }
        if (trimmed.includes('@gmail.com') || trimmed.includes('baddil.support@gmail.com')) {
          const emailMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          const email = emailMatch ? emailMatch[0] : "baddil.support@gmail.com";
          const label = trimmed.split(':')[0] || "البريد الإلكتروني";
          return (
            <div key={idx} className="my-3 p-3 bg-emerald-50/60 border border-emerald-100/40 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-start">
              <div className="flex flex-col">
                <span className="font-bold text-slate-800 text-xs">{label}</span>
                <span className="text-[9px] text-slate-500 mt-0.5">{isAr ? 'اضغط لإرسال بريد إلكتروني للدعم' : 'Click to contact support directly'}</span>
              </div>
              <a 
                href={`mailto:${email}`}
                className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-heavy text-[11px] px-4 py-2 rounded-lg shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5 text-white" />
                <span>{email}</span>
              </a>
            </div>
          );
        }
        return (
          <p key={idx} className="text-slate-600 text-xs leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

interface ConsentBlockingScreenProps {
  userId: string;
  onConsentAccepted: (updatedProfile: any) => void;
  onLogout: () => void;
}

export default function ConsentBlockingScreen({ userId, onConsentAccepted, onLogout }: ConsentBlockingScreenProps) {
  const { direction, language } = useTranslation();
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Inline reader modal state for safe, fluent viewing of documents before accepting
  const [activeDraweView, setActiveDraweView] = useState<'none' | 'terms' | 'privacy'>('none');

  const isAr = language === 'ar';

  const handleAcceptAndContinue = async () => {
    if (!termsAgreed || !privacyAgreed) return;

    setSubmitting(true);
    try {
      const consentFields = {
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: "1.0",
        privacyAccepted: true,
        privacyAcceptedAt: new Date().toISOString(),
        privacyVersion: "1.0",
        legalAccepted: true,
        legalAcceptedAt: new Date().toISOString(),
        legalVersion: "1.0",
        appLanguageAtConsent: language || "ar",
        consentSource: "existing_user_login" as const
      };

      await dbService.updateOrCreateProfile(consentFields);
      
      // Load and return updated profile doc
      const updatedProfile = await dbService.getUserProfile(userId);
      onConsentAccepted(updatedProfile);
    } catch (err) {
      console.error("Failed to commit user legal consensus", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 overflow-y-auto" dir={direction}>
      
      {/* Drawer Overlay for document reading */}
      {activeDraweView !== 'none' && (
        <div className="fixed inset-0 bg-slate-950/70 z-[160] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh] text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <button 
                onClick={() => setActiveDraweView('none')}
                className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 cursor-pointer"
              >
                {direction === 'rtl' ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
                <span>{isAr ? 'رجوع للموافقة' : 'Back to consent'}</span>
              </button>
              <h3 className="text-sm font-black text-slate-800">
                {activeDraweView === 'terms' 
                  ? (isAr ? 'شروط وأحكام بَدِل' : 'BADDIL Terms & Conditions') 
                  : (isAr ? 'سياسة خصوصية بَدِل' : 'BADDIL Privacy Policy')}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 rounded-2xl p-4 sm:p-6 text-xs sm:text-sm text-slate-600 leading-relaxed max-h-[60vh] text-right">
              <StyledMarkdown 
                text={activeDraweView === 'terms' ? (isAr ? TERMS_CONTENT_AR : TERMS_CONTENT_EN) : (isAr ? PRIVACY_CONTENT_AR : PRIVACY_CONTENT_EN)} 
                isAr={isAr}
              />
            </div>

            <button 
              onClick={() => {
                if (activeDraweView === 'terms') setTermsAgreed(true);
                if (activeDraweView === 'privacy') setPrivacyAgreed(true);
                setActiveDraweView('none');
              }}
              className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer"
            >
              {isAr ? 'قرأت وأوافق' : 'Read and Agree'}
            </button>
          </div>
        </div>
      )}

      {/* Main Consent Form Block */}
      <div className="bg-white w-full max-w-lg rounded-[32px] border border-slate-100 shadow-2xl p-6 sm:p-8 relative flex flex-col max-h-[90vh]">
        
        {/* Logo Accent header */}
        <div className="flex justify-between items-start mb-6 shrink-0" dir={direction}>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl shrink-0">
            <Landmark className="h-6 w-6" />
          </div>
          <p className="text-[10px] sm:text-xs font-black px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 uppercase">
            {isAr ? 'تحديث قانوني مطلوب' : 'Legal update required'}
          </p>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 text-right space-y-6" dir="rtl">
          
          {/* Informative text */}
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-black text-slate-800 leading-snug">
              {isAr ? 'تحديث اتفاقية الاستخدام وسياسة الخصوصية' : 'Terms and Privacy Policy Update'}
            </h2>
            <p className="text-slate-500 text-xs leading-relaxed">
              {isAr ? (
                <>
                  مرحباً بك مجدداً في عائلة <strong className="text-emerald-700">بَدِل</strong>. قمنا بتحديث الشروط والأحكام وسياسة الخصوصية الخاصة بالمنصة إلى <strong className="text-slate-700 font-bold">الإصدار 1.0 (بتاريخ {LEGAL_LAST_UPDATED_AR})</strong> لضمان حماية حقوقك القانونية، وتنظيم العلاقة والتعامل الآمن مع جيرانك أثناء إتمام عمليات التبادل والمقايضة.
                </>
              ) : (
                <>
                  Welcome back to <strong className="text-emerald-700">BADDIL</strong>. We have updated our Terms and Conditions and Privacy Policy to <strong className="text-slate-700 font-bold">Version 1.0 (as of {LEGAL_LAST_UPDATED_EN})</strong> to elevate protection for your legal rights and establish safety baselines during barter swaps.
                </>
              )}
            </p>
            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl font-semibold text-[11px] text-slate-500 text-right space-y-1.5">
              <p className="text-slate-700 font-bold mb-1">{isAr ? 'أهم البنود المحدثة:' : 'Key highlights of the update:'}</p>
              <p>✔ {isAr ? 'حظر صريح للأسلحة والمنشطات والأشياء المقلدة والمسروقة.' : 'Explicit ban on weapons, stolen goods, drugs, and counterfeits.'}</p>
              <p>✔ {isAr ? 'إخلاء مسؤولية المنصة عن عيوب السلع ومطابقة المواصفات.' : 'Full disclaimer of BADDIL’s liability for item condition or specifications.'}</p>
              <p>✔ {isAr ? 'إجراءات صارمة ووقائية للحظر الفوري في حال الاحتيال أو الإساءة.' : 'Immediate account locking or banning for abuse, fraud or listing violations.'}</p>
            </div>
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-4 text-right">
            
            {/* Checkbox 1: Terms */}
            <div className="flex items-start gap-3 p-3 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
              <input
                id="chk_terms_b"
                type="checkbox"
                checked={termsAgreed}
                onChange={() => setTermsAgreed(!termsAgreed)}
                className="rounded accent-emerald-600 h-5 w-5 shrink-0 mt-0.5 cursor-pointer"
              />
              <label htmlFor="chk_terms_b" className="text-xs text-slate-600 font-bold select-none cursor-pointer leading-normal flex-1">
                {isAr ? (
                  <>
                    أوافق وأتعهد بالالتزام الكامل بـ{' '}
                    <button
                      type="button"
                      onClick={() => setActiveDraweView('terms')}
                      className="text-emerald-700 hover:text-emerald-800 font-black underline inline cursor-pointer outline-none bg-transparent"
                    >
                      الشروط والأحكام (اضغط للقراءة)
                    </button>
                    .
                  </>
                ) : (
                  <>
                    I agree and commit to BADDIL’s{' '}
                    <button
                      type="button"
                      onClick={() => setActiveDraweView('terms')}
                      className="text-emerald-700 hover:text-emerald-800 font-black underline inline cursor-pointer outline-none bg-transparent"
                    >
                      Terms & Conditions (click to read)
                    </button>
                    .
                  </>
                )}
              </label>
            </div>

            {/* Checkbox 2: Privacy */}
            <div className="flex items-start gap-3 p-3 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
              <input
                id="chk_privacy_b"
                type="checkbox"
                checked={privacyAgreed}
                onChange={() => setPrivacyAgreed(!privacyAgreed)}
                className="rounded accent-emerald-600 h-5 w-5 shrink-0 mt-0.5 cursor-pointer"
              />
              <label htmlFor="chk_privacy_b" className="text-xs text-slate-600 font-bold select-none cursor-pointer leading-normal flex-1">
                {isAr ? (
                  <>
                    أوافق على سياسة معالجة البيانات وبنود{' '}
                    <button
                      type="button"
                      onClick={() => setActiveDraweView('privacy')}
                      className="text-emerald-700 hover:text-emerald-800 font-black underline inline cursor-pointer outline-none bg-transparent"
                    >
                      سياسة الخصوصية (اضغط للقراءة)
                    </button>
                    .
                  </>
                ) : (
                  <>
                    I consent to the data usage constraints in the{' '}
                    <button
                      type="button"
                      onClick={() => setActiveDraweView('privacy')}
                      className="text-emerald-700 hover:text-emerald-800 font-black underline inline cursor-pointer outline-none bg-transparent"
                    >
                      Privacy Policy (click to read)
                    </button>
                    .
                  </>
                )}
              </label>
            </div>

          </div>

        </div>

        {/* Actions Button Bar */}
        <div className="flex gap-3 text-right pt-4 border-t border-slate-100 mt-6 shrink-0" dir={direction}>
          <button
            type="button"
            disabled={!termsAgreed || !privacyAgreed || submitting}
            onClick={handleAcceptAndContinue}
            style={{ minHeight: '44px' }}
            className={`flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-heavy text-xs rounded-xl cursor-pointer transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5`}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{isAr ? 'قبول ومتابعة' : 'Accept & Continue'}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            style={{ minHeight: '44px' }}
            className="px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
            title={isAr ? 'تسجيل الخروج والعودة كزائر' : 'Logout and return as guest'}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{isAr ? 'خروج' : 'Logout'}</span>
          </button>
        </div>

      </div>

    </div>
  );
}
