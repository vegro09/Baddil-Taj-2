import { useState, useEffect } from 'react';
import { useTranslation } from './LanguageContext';
import { ArrowLeft, ArrowRight, ShieldCheck, FileText, Mail } from 'lucide-react';
import { 
  TERMS_CONTENT_AR, 
  PRIVACY_CONTENT_AR, 
  TERMS_CONTENT_EN, 
  PRIVACY_CONTENT_EN,
  LEGAL_LAST_UPDATED_AR,
  LEGAL_LAST_UPDATED_EN 
} from '../data/legalContents';

// Styled renderer to keep elements clean, responsive, and styled with Tailwind
function StyledMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-4">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed === '') return null;

        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-xl sm:text-2xl font-black text-slate-800 border-b border-slate-100 pb-3 leading-tight pt-2">
              {trimmed.replace('# ', '')}
            </h1>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-base sm:text-lg font-bold text-slate-700 mt-6 leading-snug">
              {trimmed.replace('## ', '')}
            </h2>
          );
        }
        if (/^\d+\.\s*/.test(trimmed)) {
          const content = trimmed.replace(/^\d+\.\s*/, '');
          return (
            <div key={idx} className="flex gap-2 text-slate-600 text-xs sm:text-sm leading-relaxed rtl:mr-2 ltr:ml-2">
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
            <div key={idx} className="my-3.5 p-4 bg-emerald-50/60 border border-emerald-100/40 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-start">
              <div className="flex flex-col">
                <span className="font-bold text-slate-800 text-xs sm:text-sm">{label}</span>
                <span className="text-[10px] text-slate-500 mt-0.5">اضغط على الزر أدناه لإرسال رسالة مباشرة للمسؤولين</span>
              </div>
              <a 
                href={`mailto:${email}`}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-heavy text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Mail className="h-4 w-4 text-white" />
                <span>{email}</span>
              </a>
            </div>
          );
        }
        return (
          <p key={idx} className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

interface LegalPageProps {
  onBack: () => void;
  initialTab?: 'terms' | 'privacy';
}

export default function LegalPage({ onBack, initialTab = 'terms' }: LegalPageProps) {
  const { direction, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const isAr = language === 'ar';

  return (
    <div className="max-w-4xl w-full mx-auto bg-white border border-slate-100 rounded-[32px] shadow-xl shadow-slate-100/50 p-4 sm:p-8 pb-28 sm:pb-8 flex flex-col" dir={direction}>
      
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-700 text-xs font-bold transition-all p-2 rounded-xl hover:bg-slate-50 cursor-pointer"
        >
          {direction === 'rtl' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          <span>{isAr ? 'الرجوع' : 'Back'}</span>
        </button>

        <span className="text-[10px] sm:text-xs font-semibold text-slate-400">
          {isAr ? `آخر تحديث: ${LEGAL_LAST_UPDATED_AR}` : `Last updated: ${LEGAL_LAST_UPDATED_EN}`}
        </span>
      </div>

      {/* Main Title */}
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
          {isAr ? 'الشروط والخصوصية' : 'Terms & Privacy'}
        </h1>
        <p className="text-slate-400 text-xs mt-1.5 font-medium max-w-md mx-auto">
          {isAr ? 'اتفاقية مستخدم وتعهد سياسة الحفاظ على أمان البيانات في مجتمع بَدِل للمقايضة' : 'User agreements and data safety policies for BADDIL bartering community'}
        </p>
      </div>

      {/* Segmented Controls Tabs */}
      <div className="bg-slate-100 p-1 rounded-2xl flex max-w-md mx-auto w-full mb-8">
        <button
          onClick={() => setActiveTab('terms')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'terms' 
              ? 'bg-white text-emerald-700 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span>{isAr ? 'الشروط والأحكام' : 'Terms & Conditions'}</span>
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'privacy' 
              ? 'bg-white text-emerald-700 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>{isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}</span>
        </button>
      </div>

      {/* Content Rendering container */}
      <div className="bg-slate-50/50 border border-slate-100/50 rounded-2xl p-4 sm:p-6 mb-8 max-h-[60vh] overflow-y-auto custom-scrollbar text-right leading-relaxed">
        <StyledMarkdown 
          text={
            activeTab === 'terms' 
              ? (isAr ? TERMS_CONTENT_AR : TERMS_CONTENT_EN) 
              : (isAr ? PRIVACY_CONTENT_AR : PRIVACY_CONTENT_EN)
          } 
        />
      </div>

      {/* Support / Help block */}
      <div className="bg-emerald-50/40 border border-emerald-100/40 rounded-2xl p-4 text-center flex flex-col items-center">
        <div className="p-2.5 bg-emerald-100/50 text-emerald-700 rounded-full mb-2">
          <Mail className="h-4 w-4" />
        </div>
        <h4 className="text-xs sm:text-sm font-bold text-slate-800">
          {isAr ? 'لديك أي استفسارات أو شكاوى قانونية؟' : 'Have any questions or legal inquiries?'}
        </h4>
        <p className="text-[11px] text-slate-500 mt-0.5 mb-2.5">
          {isAr ? 'تواصل مع الإدارة مباشرة على البريد الإلكتروني الرسمي' : 'Get in touch with support directly via email'}
        </p>
        <a 
          href="mailto:baddil.support@gmail.com" 
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-[0.98] cursor-pointer"
        >
          <Mail className="h-4 w-4 text-white shrink-0" />
          <span>baddil.support@gmail.com</span>
        </a>
      </div>

    </div>
  );
}
