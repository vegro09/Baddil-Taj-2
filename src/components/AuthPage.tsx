import { useState, useEffect, FormEvent, useRef, ChangeEvent } from 'react';
import { dbService } from '../db/dbService';
import { ARAB_COUNTRIES, SelectionRegion, SelectionCity } from '../data/locations';
import { Landmark, ArrowRight, Eye, EyeOff, Loader2, User, Mail, Lock, MapPin, CheckCircle, Camera, UploadCloud, X, AlertCircle } from 'lucide-react';
import { useTranslation } from './LanguageContext';

const getFriendlyErrorMessage = (errorCode: string, language: string): string => {
  if (language === 'ar') {
    switch (errorCode) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      case 'auth/email-already-in-use':
        return 'هذا البريد الإلكتروني مستخدم بالفعل.';
      case 'auth/invalid-email':
        return 'البريد الإلكتروني غير صحيح.';
      case 'auth/weak-password':
        return 'كلمة المرور ضعيفة للغاية (يجب أن تكون 6 أحرف على الأقل).';
      case 'auth/operation-not-allowed':
        return 'تسجيل الدخول بهذه الطريقة غير مفعّل حالياً في خيارات Firebase.';
      case 'auth/network-request-failed':
        return 'تعذر الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.';
      case 'auth/too-many-requests':
        return 'تم حظر الطلبات مؤقتاً بسبب تكرار المحاولات الخاطئة. حاول لاحقاً.';
      case 'auth/user-disabled':
        return 'تم تعطيل هذا الحساب من قبل الإدارة.';
      case 'auth/popup-closed-by-user':
        return 'تم إغلاق نافذة تسجيل الدخول قبل اكتمال العملية.';
      case 'auth/popup-blocked':
        return 'تم حظر النافذة المنبثقة من المتصفح. يرجى السماح بالنوافذ المنبثقة.';
      case 'auth/cancelled-popup-request':
        return 'تم إلغاء عملية تسجيل الدخول.';
      case 'auth/unauthorized-domain':
        return 'هذا النطاق (Domain) غير مصرح به في إعدادات Firebase.';
      default:
        return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
    }
  } else {
    // English messages
    switch (errorCode) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Incorrect email or password.';
      case 'auth/email-already-in-use':
        return 'This email is already in use.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/weak-password':
        return 'Password is too weak (must be at least 6 characters).';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled in Firebase Console.';
      case 'auth/network-request-failed':
        return 'Network connection failed. Please check your internet connection.';
      case 'auth/too-many-requests':
        return 'Too many unsuccessful attempts. Access temporarily blocked.';
      case 'auth/user-disabled':
        return 'This user account has been disabled.';
      case 'auth/popup-closed-by-user':
        return 'Login popup was closed before completion.';
      case 'auth/popup-blocked':
        return 'Popup blocked by browser. Please enable popups for this site.';
      case 'auth/cancelled-popup-request':
        return 'Sign-in request was cancelled.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized in Firebase Console settings.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
};

interface AuthPageProps {
  onSuccess: (userId: string) => void;
  initialView?: 'login' | 'signup' | 'welcome';
  onBackToFeed?: () => void;
  onOpenLegal?: (tab: 'terms' | 'privacy') => void;
}

const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";

export default function AuthPage({ onSuccess, initialView = 'welcome', onBackToFeed, onOpenLegal }: AuthPageProps) {
  const { t, language } = useTranslation();
  const [view, setView] = useState<'welcome' | 'login' | 'signup' | 'forgot-password'>(initialView);
  
  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string; global?: string }>({});
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleSubmitting(true);
    setLoginErrors({});
    setSignUpErrors({});
    try {
      const user = await dbService.signInWithGoogle();
      if (user) {
        onSuccess(user.uid);
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      const errorCode = err.code || "";
      const errMsg = getFriendlyErrorMessage(errorCode, language);
      
      if (view === 'login') {
        setLoginErrors({ global: errMsg });
      } else {
        setSignUpErrors({ global: errMsg });
      }
    } finally {
      setGoogleSubmitting(false);
    }
  };

  // Signup states
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [imageLoadingMessage, setImageLoadingMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize and optimization helper for register avatar
  const resizeImageToMax = (file: File, maxWidth: number, maxHeight: number): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) {
                const resizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(resizedFile);
              } else {
                resolve(file);
              }
            }, 'image/jpeg', 0.82);
          } else {
            resolve(file);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtension = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const isHeic = extension === 'heic' || extension === 'heif' || file.type === 'image/heic' || file.type === 'image/heif';

    if (!isHeic && !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type) && !validExtension.includes(extension)) {
      setImageError('عذراً، صيغة الملف غير مدعومة. يرجى اختيار صورة بصيغة JPG, PNG, WEBP, أو HEIC.');
      return;
    }

    setUploadingImage(true);
    setImageError('');
    setImageLoadingMessage('جاري تحضير ملف الصورة...');

    try {
      let fileToUpload = file;

      if (isHeic) {
        setImageLoadingMessage('جاري معالجة وتحويل صيغة HEIC/HEIF...');
        const heic2anyModule = await import('heic2any');
        const heic2any = heic2anyModule.default;
        const converted = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8
        });
        const blob = Array.isArray(converted) ? converted[0] : converted;
        fileToUpload = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
          type: 'image/jpeg'
        });
      }

      setImageLoadingMessage('جاري تحسين وضغط الصورة لدقة أسرع...');
      const resizedFile = await resizeImageToMax(fileToUpload, 400, 400);

      setAvatarFile(resizedFile);

      // Create a local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarPreview(reader.result);
        }
      };
      reader.readAsDataURL(resizedFile);

    } catch (err: any) {
      console.error("Auth Register Image Upload Error:", err);
      setImageError('حدث خطأ أثناء معالجة ملف الصورة. يرجى المحاولة مع صورة أخرى.');
    } finally {
      setUploadingImage(false);
      setImageLoadingMessage('');
    }
  };

  const handleRemoveImage = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  // Location selection states for signup
  const [countryCode, setCountryCode] = useState('');
  const [regionId, setRegionId] = useState('');
  const [cityId, setCityId] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [regionsList, setRegionsList] = useState<SelectionRegion[]>([]);
  const [citiesList, setCitiesList] = useState<SelectionCity[]>([]);
  
  const [signUpErrors, setSignUpErrors] = useState<{
    display_name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    country?: string;
    governorate?: string;
    city?: string;
    global?: string;
    legal?: string;
  }>({});
  const [signUpSubmitting, setSignUpSubmitting] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [legalAgreed, setLegalAgreed] = useState(false);

  // Password recovery states
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotErrors, setForgotErrors] = useState<{ email?: string; global?: string }>({});
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  // Sync Regions list on Country Code selection
  useEffect(() => {
    if (countryCode) {
      const countryObj = ARAB_COUNTRIES.find(c => c.code === countryCode);
      const list = countryObj ? countryObj.regions : [];
      setRegionsList([
        ...list,
        { id: 'manual', name: 'لم أجد منطقتي — كتابة الموقع يدويًا', cities: [] }
      ]);
    } else {
      setRegionsList([]);
    }
    setRegionId('');
    setCityId('');
    setManualLocation('');
  }, [countryCode]);

  // Sync Cities list on Region selection
  useEffect(() => {
    if (regionId) {
      const regionObj = regionsList.find(r => r.id === regionId);
      const list = regionObj ? regionObj.cities : [];
      setCitiesList(list);
    } else {
      setCitiesList([]);
    }
    setCityId('');
  }, [regionId, regionsList]);

  // Handle Quick Login Fill
  const fillPresetAccount = (email: string) => {
    setLoginEmail(email);
    setLoginPassword('password123');
    setLoginErrors({});
  };

  // Login handler
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginErrors({});
    
    // Validations
    let hasErr = false;
    const errors: typeof loginErrors = {};

    if (!loginEmail.trim()) {
      errors.email = "أدخل البريد الإلكتروني";
      hasErr = true;
    } else if (!/\S+@\S+\.\S+/.test(loginEmail)) {
      errors.email = "أدخل بريدًا إلكترونيًا صحيحًا";
      hasErr = true;
    }

    if (!loginPassword) {
      errors.password = "أدخل كلمة المرور";
      hasErr = true;
    }

    if (hasErr) {
      setLoginErrors(errors);
      return;
    }

    setLoginSubmitting(true);
    try {
      const user = await dbService.login(loginEmail, loginPassword);
      onSuccess(user.uid);
    } catch (err: any) {
      console.error("Login error:", err);
      const code = err.code || "";
      const errMsg = getFriendlyErrorMessage(code, language);
      setLoginErrors({ global: errMsg });
    } finally {
      setLoginSubmitting(false);
    }
  };

  // Sign up handler
  const handleSignUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSignUpErrors({});
    
    let hasErr = false;
    const errors: typeof signUpErrors = {};

    if (!signUpName.trim()) {
      errors.display_name = "حقل الاسم مطلوب";
      hasErr = true;
    } else if (signUpName.trim().length < 3) {
      errors.display_name = "يجب أن يكون الاسم 3 أحرف على الأقل";
      hasErr = true;
    }

    if (!signUpEmail.trim()) {
      errors.email = "أدخل بريدًا إلكترونيًا";
      hasErr = true;
    } else if (!/\S+@\S+\.\S+/.test(signUpEmail)) {
      errors.email = "أدخل بريدًا إلكترونيًا صحيحًا";
      hasErr = true;
    }

    const passHasMinLength = signUpPassword.length >= 12;
    const passHasUpper = /[A-Z]/.test(signUpPassword);
    const passHasLower = /[a-z]/.test(signUpPassword);
    const passHasNumber = /[0-9]/.test(signUpPassword);
    const passHasSpecial = /[^A-Za-z0-9]/.test(signUpPassword);

    if (!signUpPassword) {
      errors.password = "أدخل كلمة المرور";
      hasErr = true;
    } else if (!passHasMinLength || !passHasUpper || !passHasLower || !passHasNumber || !passHasSpecial) {
      errors.password = "يجب أن تكون كلمة المرور قوية (12 حرفاً على الأقل، وتحتوي على حرف كبير، حرف صغير، رقم، ورمز خاص)";
      hasErr = true;
    }

    if (signUpConfirmPassword !== signUpPassword) {
      errors.confirmPassword = "كلمتا المرور غير متطابقتين";
      hasErr = true;
    }

    if (!countryCode) {
      errors.country = "اختر الدولة";
      hasErr = true;
    }

    if (!regionId && regionsList.length > 0) {
      errors.governorate = "اختر المحافظة أو المنطقة";
      hasErr = true;
    } else if (regionId === 'manual') {
      if (!manualLocation || manualLocation.trim().length < 2) {
        errors.governorate = "يرجى كتابة اسم الموقع بالتفصيل (حرفين على الأقل)";
        hasErr = true;
      }
    }

    if (!legalAgreed) {
      errors.legal = language === 'ar' ? "يرجى الموافقة على الشروط والأحكام وسياسة الخصوصية الخاصة بتطبيق بَدِل للمتابعة" : "Please agree to the Terms & Conditions and Privacy Policy to continue";
      hasErr = true;
    }

    if (hasErr) {
      setSignUpErrors(errors);
      return;
    }

    setSignUpSubmitting(true);
    try {
      const conObj = ARAB_COUNTRIES.find(c => c.code === countryCode);
      const regObj = regionsList.find(r => r.id === regionId);
      const resolvedGovernorate = regionId === 'manual' ? manualLocation.trim() : (regObj?.name || regionId);

      const user = await dbService.signUp({
        email: signUpEmail,
        password: signUpPassword,
        displayName: signUpName.trim(),
        country: conObj?.name || countryCode,
        governorate: resolvedGovernorate,
        city: '',
        profileImageUrl: '',
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
        consentSource: "signup"
      });

      if (avatarFile) {
        try {
          const profileImgUrl = await dbService.uploadProfileImage(avatarFile);
          await dbService.updateOrCreateProfile({ profile_image_url: profileImgUrl });
        } catch (uploadErr) {
          console.error("Failed uploading profile image during signup fallback", uploadErr);
        }
      }

      setSignUpSuccess(true);
      setTimeout(() => {
        onSuccess(user.uid);
      }, 1500);
    } catch (err: any) {
      console.error("SignUp error:", err);
      const code = err.code || "";
      const errMsg = getFriendlyErrorMessage(code, language);
      if (code === 'auth/email-already-in-use') {
        setSignUpErrors({ email: errMsg });
      } else {
        setSignUpErrors({ global: errMsg });
      }
    } finally {
      setSignUpSubmitting(false);
    }
  };

  // Password recovery handler
  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setForgotErrors({});
    setForgotSuccess(false);

    if (!forgotEmail.trim()) {
      setForgotErrors({ email: "أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور" });
      return;
    } else if (!/\S+@\S+\.\S+/.test(forgotEmail)) {
      setForgotErrors({ email: "أدخل بريدًا إلكترونيًا صحيحًا" });
      return;
    }

    setForgotSubmitting(true);
    try {
      await dbService.forgotPassword(forgotEmail);
      setForgotSuccess(true);
    } catch (err: any) {
      console.error("Forgot error:", err);
      const code = err.code || "";
      const errMsg = getFriendlyErrorMessage(code, language);
      setForgotErrors({ global: errMsg });
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div className={`max-w-md w-full mx-auto min-h-[75vh] flex flex-col justify-center py-8 ${language === 'ar' ? 'text-right' : 'text-left'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* 1. Welcome onboarding view */}
      {view === 'welcome' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 flex flex-col items-center">
          <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 text-white p-4 rounded-2xl shadow-xl shadow-emerald-500/10 mb-5 animate-bounce">
            <Landmark className="h-8 w-8" />
          </div>
          
          <h2 className="text-2xl font-black text-slate-800 text-center mb-2">
            {language === 'ar' ? 'تطبيق بَدِل للمقايضة' : 'Baddil Barter App'}
          </h2>
          <p className="text-xs text-slate-500 text-center leading-relaxed max-w-sm mb-8">
            {language === 'ar' 
              ? 'منصة مقايضة وتبادل السلع الأولى عربياً. تبادل ما لا تحتاجه وبادل بما ترغب به بكل سهولة وأمان مع أفراد مدينتك.'
              : 'The premium Arab barter platform. Safely exchange what you do not need for what you want in your city.'}
          </p>

          <div className="w-full space-y-3">
            <button
              onClick={() => setView('login')}
              style={{ minHeight: '44px' }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-heavy text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98]"
            >
              {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
            </button>
            
            <button
              onClick={() => setView('signup')}
              style={{ minHeight: '44px' }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-heavy text-xs rounded-xl cursor-pointer transition-all"
            >
              {language === 'ar' ? 'إنشاء حساب جديد' : 'Create New Account'}
            </button>
          </div>

          {onBackToFeed && (
            <button
              onClick={onBackToFeed}
              className="text-xs text-emerald-600 font-heavy mt-6 hover:underline cursor-pointer"
            >
              {language === 'ar' ? 'تصفح الإعلانات أولاً كـ زائر' : 'Browse listings as guest'}
            </button>
          )}
        </div>
      )}

      {/* 2. Login View */}
      {view === 'login' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-800">{language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</h2>
            <button
              onClick={() => setView('welcome')}
              className="p-1 px-2.5 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>{language === 'ar' ? 'رجوع' : 'Back'}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {loginErrors.global && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-3 text-xs font-bold mb-4">
              {loginErrors.global}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-600 block">{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className={`w-full text-xs bg-slate-50 border ${loginErrors.email ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-emerald-500'} rounded-xl py-3 px-3 outline-none transition-all pr-8`}
                />
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              </div>
              {loginErrors.email && <p className="text-[10px] text-rose-500 font-bold">{loginErrors.email}</p>}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setView('forgot-password')}
                  className="text-[10px] text-emerald-600 hover:underline"
                >
                  {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                </button>
                <label className="text-[11px] font-black text-slate-600 block">{language === 'ar' ? 'كلمة المرور' : 'Password'}</label>
              </div>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className={`w-full text-xs bg-slate-50 border ${loginErrors.password ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-emerald-500'} rounded-xl py-3 px-3 outline-none transition-all pl-9 pr-8`}
                />
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{ minWidth: '32px', minHeight: '32px' }}
                  className="absolute left-8 top-1.5 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="h-4 w-4 mt-1" /> : <Eye className="h-4 w-4 mt-1" />}
                </button>
              </div>
              {loginErrors.password && <p className="text-[10px] text-rose-500 font-bold">{loginErrors.password}</p>}
            </div>

             <button
              type="submit"
              disabled={loginSubmitting || googleSubmitting}
              style={{ minHeight: '44px' }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-500/80 text-white font-heavy text-xs py-3 px-4 rounded-xl cursor-pointer transition-all shadow-md mt-2 flex items-center justify-center gap-1.5"
            >
              {loginSubmitting && <Loader2 className="h-4 w-4 animate-spin text-white" />}
              <span>{loginSubmitting ? (language === 'ar' ? "جاري تسجيل الدخول..." : "Signing in...") : (language === 'ar' ? "تسجيل الدخول" : "Sign In")}</span>
            </button>

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-slate-100"></div>
              <span className="text-[10px] text-slate-400 font-bold px-3">
                {language === 'ar' ? 'أو' : 'OR'}
              </span>
              <div className="flex-1 border-t border-slate-100"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleSubmitting || loginSubmitting}
              style={{ minHeight: '44px' }}
              className="w-full bg-white hover:bg-slate-50 disabled:bg-slate-50 border border-slate-200 text-slate-700 font-heavy text-xs py-3 px-4 rounded-xl cursor-pointer transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {googleSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>
                {googleSubmitting 
                  ? (language === 'ar' ? 'جاري الاتصال بجوجل...' : 'Connecting to Google...') 
                  : (language === 'ar' ? 'المتابعة باستخدام جوجل' : 'Continue with Google')}
              </span>
            </button>
          </form>



          <div className="mt-6 text-center">
            <button
              onClick={() => setView('signup')}
              className="text-xs text-slate-500 hover:text-emerald-600 font-bold"
            >
              {language === 'ar' ? 'ليس لديك حساب؟ ' : 'Don\'t have an account? '} <span className="text-emerald-600 font-black">{language === 'ar' ? 'إنشاء حساب' : 'Create Account'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Account Signup View */}
      {view === 'signup' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-800">إنشاء حساب</h2>
            <button
              onClick={() => setView('welcome')}
              className="p-1 px-2.5 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>رجوع</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {signUpSuccess && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl p-4 text-xs font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <span>تم إنشاء الحساب بنجاح</span>
            </div>
          )}

          {signUpErrors.global && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-3 text-xs font-bold mb-4">
              {signUpErrors.global}
            </div>
          )}

          <form onSubmit={handleSignUpSubmit} className="space-y-4">
            
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
            />

            {/* Profile Picture Upload & Preview Component */}
            <div className="space-y-2 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
              <label className="text-[11px] font-black text-slate-700 block text-right">الصورة الشخصية للحساب</label>
              
              <div className="flex flex-row-reverse items-center justify-between gap-3 text-right">
                
                {/* Image Preview Window */}
                <div 
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  className="relative h-14 w-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex-shrink-0 cursor-pointer overflow-hidden group transition-all hover:scale-105"
                  title="انقر لإرفاق صورة شخصية من جهازك"
                >
                  <img
                    src={avatarPreview || DEFAULT_AVATAR}
                    alt="avatar-preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                </div>

                {/* Info and Upload Buttons */}
                <div className="flex-1 text-right space-y-1.5">
                  <p className="text-[9px] text-slate-400 leading-normal font-semibold">
                    أرفق صورة حقيقية لتوثيق وموثوقية حسابك في بَدِل. تقبل صيغ JPG, PNG, WEBP, HEIC.
                  </p>
                  
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 text-emerald-800 font-bold py-1 px-2.5 rounded-xl text-[10px] flex items-center gap-1.5 transition-all outline-none cursor-pointer disabled:opacity-50"
                      style={{ minHeight: '32px' }}
                    >
                      <UploadCloud className="h-3.5 w-3.5 text-emerald-700" />
                      <span>ارفاق صورة</span>
                    </button>

                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        disabled={uploadingImage}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 font-bold py-1 px-2.5 rounded-xl text-[10px] flex items-center gap-1.5 transition-all outline-none cursor-pointer"
                        style={{ minHeight: '32px' }}
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>إزالة</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Upload Notification states */}
              {uploadingImage && (
                <div className="bg-emerald-50/50 border border-emerald-100 p-2 rounded-lg flex items-center gap-2 text-emerald-800 text-[10px] animate-pulse justify-end">
                  <span>{imageLoadingMessage || 'جاري معالجة الصورة...'}</span>
                  <Loader2 className="h-3.5 w-3.5 text-emerald-600 animate-spin shrink-0" />
                </div>
              )}

              {imageError && (
                <div className="bg-rose-50 border border-rose-100 p-2 rounded-lg flex items-center gap-2 text-rose-800 text-[10px] justify-end">
                  <span className="flex-1 text-right leading-normal">{imageError}</span>
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <button type="button" onClick={() => setImageError('')} className="p-0.5 hover:bg-rose-100 rounded text-rose-800">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-600 block">الاسم الكامل</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="مثال: منير الأحمد"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  className={`w-full text-xs bg-slate-50 border ${signUpErrors.display_name ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-emerald-500'} rounded-xl py-2.5 px-3 outline-none pr-8 transition-all`}
                />
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              </div>
              {signUpErrors.display_name && <p className="text-[10px] text-rose-500 font-bold">{signUpErrors.display_name}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-600 block">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  className={`w-full text-xs bg-slate-50 border ${signUpErrors.email ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-emerald-500'} rounded-xl py-2.5 px-3 outline-none pr-8 transition-all`}
                />
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              </div>
              {signUpErrors.email && <p className="text-[10px] text-rose-500 font-bold">{signUpErrors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1 text-right">
                <label className="text-[11px] font-black text-slate-600 block">كلمة المرور</label>
                <input
                  type={showSignUpPassword ? "text" : "password"}
                  placeholder="12 حرفاً كحد أدنى"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  className={`w-full text-xs bg-slate-50 border ${signUpErrors.password ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-500'} rounded-xl py-2.5 px-3 outline-none transition-all`}
                />
              </div>
              
              <div className="space-y-1 text-right">
                <label className="text-[11px] font-black text-slate-600 block">تأكيد كلمة المرور</label>
                <input
                  type={showSignUpPassword ? "text" : "password"}
                  placeholder="تأكيد كلمة المرور"
                  value={signUpConfirmPassword}
                  onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  className={`w-full text-xs bg-slate-50 border ${signUpErrors.confirmPassword ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-500'} rounded-xl py-2.5 px-3 outline-none transition-all`}
                />
              </div>
            </div>

            {/* Real-time strong password verification feedback */}
            {signUpPassword && (
              <div className="bg-slate-50 p-3 rounded-2xl text-right text-[10px] space-y-1.5 border border-slate-100" dir="rtl">
                <p className="font-black text-slate-600 mb-1">متطلبات أمان كلمة المرور:</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className={signUpPassword.length >= 12 ? "text-emerald-600 font-bold" : "text-slate-400"}>12 حرفاً على الأقل</span>
                    <span className={signUpPassword.length >= 12 ? "text-emerald-600 font-black" : "text-slate-300"}>{signUpPassword.length >= 12 ? "✓" : "○"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className={/[A-Z]/.test(signUpPassword) ? "text-emerald-600 font-bold" : "text-slate-400"}>حرف كبير (A-Z)</span>
                    <span className={/[A-Z]/.test(signUpPassword) ? "text-emerald-600 font-black" : "text-slate-300"}>{/[A-Z]/.test(signUpPassword) ? "✓" : "○"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className={/[a-z]/.test(signUpPassword) ? "text-emerald-600 font-bold" : "text-slate-400"}>حرف صغير (a-z)</span>
                    <span className={/[a-z]/.test(signUpPassword) ? "text-emerald-600 font-black" : "text-slate-300"}>{/[a-z]/.test(signUpPassword) ? "✓" : "○"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className={/[0-9]/.test(signUpPassword) ? "text-emerald-600 font-bold" : "text-slate-400"}>رقم واحد (0-9)</span>
                    <span className={/[0-9]/.test(signUpPassword) ? "text-emerald-600 font-black" : "text-slate-300"}>{/[0-9]/.test(signUpPassword) ? "✓" : "○"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end col-span-2">
                    <span className={/[^A-Za-z0-9]/.test(signUpPassword) ? "text-emerald-600 font-bold" : "text-slate-400"}>رمز خاص واحد على الأقل (مثل @، #، $، %، إلخ)</span>
                    <span className={/[^A-Za-z0-9]/.test(signUpPassword) ? "text-emerald-600 font-black" : "text-slate-300"}>{/[^A-Za-z0-9]/.test(signUpPassword) ? "✓" : "○"}</span>
                  </div>
                </div>
              </div>
            )}

            {signUpErrors.password && <p className="text-[10px] text-rose-500 font-bold">{signUpErrors.password}</p>}
            {signUpErrors.confirmPassword && <p className="text-[10px] text-rose-500 font-bold">{signUpErrors.confirmPassword}</p>}

            {/* Checkbox to see characters */}
            <div className="flex items-center gap-1.5 justify-end">
              <label htmlFor="chk_show_pass" className="text-[10px] text-slate-500 font-bold select-none cursor-pointer">إظهار كلمات المرور</label>
              <input
                id="chk_show_pass"
                type="checkbox"
                checked={showSignUpPassword}
                onChange={() => setShowSignUpPassword(!showSignUpPassword)}
                className="rounded accent-emerald-600"
              />
            </div>

            {/* Location dropdown selection hierarchy */}
            <div className="space-y-3 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
              <span className="text-[11px] font-black text-slate-700 flex items-center justify-end gap-1">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                <span>موقعك الجغرافي للمقايضة</span>
              </span>

              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">الدولة</label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className={`w-full text-xs bg-white border ${signUpErrors.country ? 'border-rose-400' : 'border-slate-200'} rounded-xl p-2 outline-none`}
                  >
                    <option value="">اختر الدولة</option>
                    {ARAB_COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  {signUpErrors.country && <span className="text-[9px] text-rose-500">{signUpErrors.country}</span>}
                </div>

                {countryCode && regionsList.length > 0 && (
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">المنطقة أو المحافظة</label>
                    <select
                      value={regionId}
                      onChange={(e) => setRegionId(e.target.value)}
                      className={`w-full text-xs bg-white border ${signUpErrors.governorate ? 'border-rose-400' : 'border-slate-200'} rounded-xl p-2 outline-none`}
                    >
                      <option value="">اختر المحافظة أو المنطقة</option>
                      {regionsList.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    {signUpErrors.governorate && regionId !== 'manual' && <span className="text-[9px] text-rose-500">{signUpErrors.governorate}</span>}
                  </div>
                )}

                {regionId === 'manual' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 block text-right">كتابة اسم المنطقة أو المدينة يدويًا</label>
                    <input
                      type="text"
                      maxLength={100}
                      placeholder="مثال: السلط، حي الزهور، الخ..."
                      value={manualLocation}
                      onChange={(e) => setManualLocation(e.target.value)}
                      className={`w-full text-right text-xs bg-white border rounded-xl py-2 px-3 outline-none transition-all ${
                        signUpErrors.governorate ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-500'
                      }`}
                    />
                    {signUpErrors.governorate && <span className="text-[9px] text-rose-500 block text-right leading-none mt-1">{signUpErrors.governorate}</span>}
                  </div>
                )}


              </div>
            </div>

            {/* Terms and Privacy consensus check container */}
            <div className="space-y-1 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
              <div className="flex items-start gap-2.5 justify-end text-right" dir="rtl">
                <input
                  id="chk_legal"
                  type="checkbox"
                  checked={legalAgreed}
                  onChange={() => setLegalAgreed(!legalAgreed)}
                  className="rounded accent-emerald-600 h-4.5 w-4.5 shrink-0 mt-0.5 cursor-pointer"
                />
                <label htmlFor="chk_legal" className="text-[11px] text-slate-500 font-bold select-none cursor-pointer leading-relaxed text-right flex-1">
                  {language === 'ar' ? (
                    <>
                      أوافق وأتعهد بالالتزام بـ{' '}
                      <button
                        type="button"
                        onClick={() => onOpenLegal?.('terms')}
                        className="text-emerald-700 hover:text-emerald-800 font-black underline inline cursor-pointer outline-none bg-transparent border-none p-0"
                      >
                        الشروط والأحكام
                      </button>{' '}
                      و{' '}
                      <button
                        type="button"
                        onClick={() => onOpenLegal?.('privacy')}
                        className="text-emerald-700 hover:text-emerald-800 font-black underline inline cursor-pointer outline-none bg-transparent border-none p-0"
                      >
                        سياسة الخصوصية
                      </button>{' '}
                      الخاصة بتطبيق بَدِل للمقاصة والتبادل.
                    </>
                  ) : (
                    <>
                      I agree and consent to the{' '}
                      <button
                        type="button"
                        onClick={() => onOpenLegal?.('terms')}
                        className="text-emerald-700 hover:text-emerald-800 font-black underline inline cursor-pointer outline-none bg-transparent border-none p-0"
                      >
                        Terms & Conditions
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={() => onOpenLegal?.('privacy')}
                        className="text-emerald-700 hover:text-emerald-800 font-black underline inline cursor-pointer outline-none bg-transparent border-none p-0"
                      >
                        Privacy Policy
                      </button>{' '}
                      of BADDIL community platform.
                    </>
                  )}
                </label>
              </div>
              {signUpErrors.legal && <p className="text-[10px] text-rose-500 font-bold text-right leading-snug mt-1">{signUpErrors.legal}</p>}
            </div>

             <button
              type="submit"
              disabled={signUpSubmitting || googleSubmitting}
              style={{ minHeight: '44px' }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-500/80 text-white font-heavy text-xs py-3 px-4 rounded-xl cursor-pointer transition-all shadow-md mt-2 flex items-center justify-center gap-1.5"
            >
              {signUpSubmitting && <Loader2 className="h-4 w-4 animate-spin text-white" />}
              <span>{signUpSubmitting ? "جاري إنشاء الحساب..." : "إنشاء حساب جديد"}</span>
            </button>

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-slate-100"></div>
              <span className="text-[10px] text-slate-400 font-bold px-3">
                {language === 'ar' ? 'أو' : 'OR'}
              </span>
              <div className="flex-1 border-t border-slate-100"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleSubmitting || signUpSubmitting}
              style={{ minHeight: '44px' }}
              className="w-full bg-white hover:bg-slate-50 disabled:bg-slate-50 border border-slate-200 text-slate-700 font-heavy text-xs py-3 px-4 rounded-xl cursor-pointer transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {googleSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>
                {googleSubmitting 
                  ? (language === 'ar' ? 'جاري الاتصال بجوجل...' : 'Connecting to Google...') 
                  : (language === 'ar' ? 'المتابعة باستخدام جوجل' : 'Continue with Google')}
              </span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setView('login')}
              className="text-xs text-slate-500 hover:text-emerald-600 font-bold"
            >
              لديك حساب بالفعل؟ <span className="text-emerald-600 font-black">تسجيل الدخول</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Forgot Password View */}
      {view === 'forgot-password' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-800">إعادة تعيين كلمة المرور</h2>
            <button
              onClick={() => setView('login')}
              className="p-1 px-2.5 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>تسجيل دخول</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed mb-4">
            أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور وسنرسل لك رابط المتابعة فوراً.
          </p>

          {forgotSuccess && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl p-3 text-xs font-bold mb-4">
              تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح (في الوضع التجريبي، تم تأكيد سلامة الطلب).
            </div>
          )}

          {forgotErrors.global && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-3 text-xs font-bold mb-4">
              {forgotErrors.global}
            </div>
          )}

          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-600 block">بريدك الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className={`w-full text-xs bg-slate-50 border ${forgotErrors.email ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-500'} rounded-xl py-3 px-3 outline-none pr-8 transition-all`}
                />
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              </div>
              {forgotErrors.email && <p className="text-[10px] text-rose-500 font-bold">{forgotErrors.email}</p>}
            </div>

            <button
              type="submit"
              disabled={forgotSubmitting}
              style={{ minHeight: '44px' }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-500/80 text-white font-heavy text-xs py-3 px-4 rounded-xl cursor-pointer transition-all shadow-md mt-2 flex items-center justify-center gap-1.5"
            >
              {forgotSubmitting && <Loader2 className="h-4 w-4 animate-spin text-white" />}
              <span>{forgotSubmitting ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}</span>
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
