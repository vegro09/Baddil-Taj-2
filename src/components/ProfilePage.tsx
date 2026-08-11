import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { 
  User, 
  MapPin, 
  Star, 
  Package, 
  Handshake, 
  Edit3, 
  Globe, 
  Settings, 
  LogOut, 
  Check, 
  AlertCircle, 
  Sparkles,
  Loader2,
  Trash2,
  Heart,
  Camera,
  UploadCloud,
  X,
  Bell,
  BellRing,
  BellOff,
  Sun,
  Moon
} from 'lucide-react';
import { Profile, Listing, formatUserCode, isListingBoosted } from '../types';
import { dbService } from '../db/dbService';
import { ARAB_COUNTRIES, SelectionRegion, SelectionCity } from '../data/locations';
import { motion } from 'motion/react';
import { useTranslation } from './LanguageContext';
import BoostCountdown from './BoostCountdown';

interface ProfilePageProps {
  onSelectListing: (id: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onLogoutClick?: () => void;
  onOpenLegal?: () => void;
}

const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";

function getCleanSystemInfo() {
  if (typeof navigator === 'undefined') return 'Unknown Device';
  const ua = navigator.userAgent;
  let browser = 'Browser';
  let os = 'OS';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  if (ua.includes('Chrome') && !ua.includes('Chromium') && !ua.includes('Edg') && !ua.includes('OPR')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium')) {
    browser = 'Safari';
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('Edg')) {
    browser = 'Edge';
  } else if (ua.includes('OPR') || ua.includes('Opera')) {
    browser = 'Opera';
  }

  // Find a version number
  const versionMatch = ua.match(/(Chrome|Safari|Firefox|Version)\/([\d.]+)/);
  const version = versionMatch ? versionMatch[2].split('.')[0] : '';

  return `${os} · ${browser}${version ? ' ' + version : ''}`;
}

export default function ProfilePage({
  onSelectListing,
  favorites,
  onToggleFavorite,
  onLogoutClick,
  onOpenLegal
}: ProfilePageProps) {
  const { t, language, direction, setLanguage, translateLocation } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [currentTab, setCurrentTab] = useState<'active' | 'boosted' | 'exchanged'>('active');
  const [loading, setLoading] = useState(true);

  // Settings states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('baddil_theme') as 'light' | 'dark') || 'light';
    setActiveTheme(savedTheme);
  }, []);

  const handleThemeChange = (theme: 'light' | 'dark') => {
    localStorage.setItem('baddil_theme', theme);
    setActiveTheme(theme);
    window.dispatchEvent(new Event('baddil_theme_change'));
  };

  const [settingsSubView, setSettingsSubView] = useState<'main' | 'complaints' | 'report' | 'feature' | 'improvement' | 'support'>('main');
  const [feedbackType, setFeedbackType] = useState<'complaint' | 'suggestion'>('complaint');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackImgUrl, setFeedbackImgUrl] = useState('');
  const [feedbackUploading, setFeedbackUploading] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  const resetFeedbackForm = () => {
    setFeedbackType('complaint');
    setFeedbackSubject('');
    setFeedbackMessage('');
    setFeedbackImgUrl('');
    setFeedbackSuccess(false);
    setFeedbackError('');
    setSubmittingFeedback(false);
    setFeedbackUploading(false);
  };

  const handleFeedbackFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFeedbackUploading(true);
    setFeedbackError('');
    try {
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        fileToUpload = await resizeImageToMax(file, 800, 800);
      }
      const url = await dbService.uploadFeedbackImage(fileToUpload);
      setFeedbackImgUrl(url);
    } catch (err: any) {
      console.error(err);
      setFeedbackError(language === 'ar' ? 'فشل رفع الصورة المرفقة' : 'Failed to upload attachment');
    } finally {
      setFeedbackUploading(false);
    }
  };

  const handleFeedbackSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedbackError('');
    setSubmittingFeedback(true);

    try {
      let type = 'complaint';
      if (settingsSubView === 'complaints') {
        type = feedbackType;
      } else if (settingsSubView === 'report') {
        type = 'bug';
      } else if (settingsSubView === 'feature') {
        type = 'feature_request';
      } else if (settingsSubView === 'improvement') {
        type = 'improvement';
      }

      let deviceInfo = undefined;
      if (settingsSubView === 'report') {
        deviceInfo = `Browser: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'} | Screen: ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown'}`;
      }

      await dbService.submitFeedback({
        type,
        subject: settingsSubView === 'report' ? (language === 'ar' ? 'تقرير عن مشكلة في التطبيق' : 'Application Issue Report') : feedbackSubject,
        message: feedbackMessage,
        imageUrl: feedbackImgUrl,
        ...(deviceInfo ? { deviceInfo } : {})
      });

      setFeedbackSuccess(true);
    } catch (err: any) {
      console.error("Feedback submit error", err);
      setFeedbackError(language === 'ar' ? 'حدث خطأ غير متوقع أثناء الإرسال. يرجى المحاولة مرة أخرى.' : 'An unexpected error occurred during submission. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Notification Preferences States
  const [notiPermission, setNotiPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [notificationsSupported, setNotificationsSupported] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window
  );
  const [notiLocalEnabled, setNotiLocalEnabled] = useState<boolean>(
    typeof window !== 'undefined' ? localStorage.getItem('db_notifications_enabled') !== 'false' : true
  );

  const requestNotificationPermission = async () => {
    if (!notificationsSupported) return;
    try {
      const permission = await Notification.requestPermission();
      setNotiPermission(permission);
      if (permission === 'granted') {
        localStorage.setItem('db_notifications_enabled', 'true');
        setNotiLocalEnabled(true);
        new Notification(
          language === 'ar' ? "تم تفعيل الإشعارات بنجاح! 🔔" : "Notifications enabled successfully! 🔔",
          {
            body: language === 'ar' 
              ? "ستتلقى تنبيهات فورية هنا عند وصول أي رسائل جديدة من المتبادلين." 
              : "You will receive instant push notifications when new chat messages arrive.",
            icon: "/favicon.ico"
          }
        );
      }
    } catch (err) {
      console.error("Failed to request notification permission", err);
    }
  };

  const toggleLocalNotification = (checked: boolean) => {
    localStorage.setItem('db_notifications_enabled', checked ? 'true' : 'false');
    setNotiLocalEnabled(checked);
  };

  // Edit states
  const [showEditSlider, setShowEditSlider] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [editCountryCode, setEditCountryCode] = useState('');
  const [editRegionId, setEditRegionId] = useState('');
  const [editManualLocation, setEditManualLocation] = useState('');
  const [editRegionsList, setEditRegionsList] = useState<SelectionRegion[]>([]);
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Sync Regions list on Edit Country Code selection
  useEffect(() => {
    if (editCountryCode) {
      const countryObj = ARAB_COUNTRIES.find(c => c.code === editCountryCode);
      const list = countryObj ? countryObj.regions : [];
      setEditRegionsList([
        ...list,
        { id: 'manual', name: 'لم أجد منطقتي — كتابة الموقع يدويًا', cities: [] }
      ]);
    } else {
      setEditRegionsList([]);
    }
  }, [editCountryCode]);

  // Mock accounts triggers
  const [currentUid, setCurrentUid] = useState('');

  // Profile image upload states & refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [imageSuccess, setImageSuccess] = useState('');
  const [imageLoadingMessage, setImageLoadingMessage] = useState('');

  // Image downscale and quality-aware conversion to prevent storage exhaustion
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

    // Validate type
    const validExtension = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const isHeic = extension === 'heic' || extension === 'heif' || file.type === 'image/heic' || file.type === 'image/heif';

    if (!isHeic && !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type) && !validExtension.includes(extension)) {
      setImageError('عذراً، صيغة الملف غير مدعومة. يرجى اختيار صورة بصيغة JPG, PNG, WEBP, أو HEIC.');
      return;
    }

    setUploadingImage(true);
    setImageError('');
    setImageSuccess('');
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

      setImageLoadingMessage('جاري الرفع لنظام التخزين المعتمد...');
      const url = await dbService.uploadProfileImage(resizedFile);

      setSelectedAvatar(url);
      setImageSuccess('تم تحميل الصورة الرمزية وتجهيز المعاينة بنجاح! احفظ التغييرات أسفله للتأكيد.');
    } catch (err: any) {
      console.error("Profile Image Upload Error:", err);
      setImageError(err.message || 'حدث خطأ أثناء رفع ومعالجة ملف الصورة. حاول مجدداً مع صورة أخرى.');
    } finally {
      setUploadingImage(false);
      setImageLoadingMessage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    setImageError('');
    setImageSuccess('');
    if (window.confirm('هل تريد حذف صورتك المخصصة والرجوع للصورة الافتراضية؟')) {
      try {
        setUploadingImage(true);
        setImageLoadingMessage('جاري إزالة الصورة الحالية...');
        await dbService.deleteProfileImage();
        setSelectedAvatar('');
        setImageSuccess('تم حذف صورتك بنجاح! تم تعيين الرمز الافتراضي لحسابك.');
      } catch (err: any) {
        setImageError('فشلت إزالة الصورة الرمزية من خادم التخزين.');
      } finally {
        setUploadingImage(false);
        setImageLoadingMessage('');
      }
    }
  };

  useEffect(() => {
    async function initUser() {
      setLoading(true);
      try {
        const uid = await dbService.getCurrentUserId();
        setCurrentUid(uid);
        
        const [pData, lData, email] = await Promise.all([
          dbService.getCurrentUserProfile(),
          dbService.getListings({ ownerId: uid }),
          dbService.getCurrentUserEmail()
        ]);

        setUserEmail(email || '');

        if (pData) {
          setProfile(pData);
          setDisplayName(pData.display_name);
          setBio(pData.bio || '');
          setSelectedAvatar(pData.profile_image_url || DEFAULT_AVATAR);

          const countryObj = ARAB_COUNTRIES.find(c => c.name === pData.country);
          const cCode = countryObj ? countryObj.code : '';
          setEditCountryCode(cCode);

          if (cCode && countryObj) {
            const matchedReg = countryObj.regions.find(r => r.name === pData.governorate);
            if (matchedReg) {
              setEditRegionId(matchedReg.id);
              setEditManualLocation('');
            } else if (pData.governorate) {
              setEditRegionId('manual');
              setEditManualLocation(pData.governorate);
            } else {
              setEditRegionId('');
              setEditManualLocation('');
            }
          } else {
            setEditRegionId('');
            setEditManualLocation('');
          }
        }
        setListings(lData);
      } catch (err) {
        console.error("Init profiles error", err);
      } finally {
        setLoading(false);
      }
    }
    initUser();

    // Re-initialize listener
    window.addEventListener('badal_auth_change', initUser);
    return () => {
      window.removeEventListener('badal_auth_change', initUser);
    };
  }, []);

  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setEditError('');

    // Display Name Validation according to security rule constraints
    if (!displayName || displayName.trim().length < 3) {
      setEditError("يجب أن يكون الاسم 3 أحرف على الأقل");
      return;
    }

    if (!editCountryCode) {
      setEditError("يرجى اختيار الدولة");
      return;
    }

    if (!editRegionId && editRegionsList.length > 0) {
      setEditError("يرجى اختيار المحافظة أو المنطقة");
      return;
    } else if (editRegionId === 'manual') {
      if (!editManualLocation || editManualLocation.trim().length < 2) {
        setEditError("يرجى كتابة اسم الموقع بالتفصيل (حرفين على الأقل)");
        return;
      }
    }

    setSavingEdit(true);
    try {
      const countryObj = ARAB_COUNTRIES.find(c => c.code === editCountryCode);
      const regionObj = editRegionsList.find(r => r.id === editRegionId);
      const resolvedGovernorate = editRegionId === 'manual' ? editManualLocation.trim() : (regionObj?.name || editRegionId);

      await dbService.updateOrCreateProfile({
        display_name: displayName,
        bio: bio,
        profile_image_url: selectedAvatar,
        country: countryObj?.name || editCountryCode,
        governorate: resolvedGovernorate,
        city: ''
      });

      // Fetch fresh
      const updated = await dbService.getCurrentUserProfile();
      if (updated) setProfile(updated);
      
      setShowEditSlider(false);
    } catch (err) {
      setEditError('تعذر تحديث البيانات، يرجى تكرار المحاولة.');
    } finally {
      setSavingEdit(false);
    }
  };

  const switchMockUser = (uid: string) => {
    localStorage.setItem('badal_current_mock_user_id', uid);
    window.dispatchEvent(new Event('badal_auth_change'));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 animate-pulse">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-sm">جاري مراجعة ملفك الشخصي إحصائياتك الأمنية...</p>
      </div>
    );
  }

  // Filter listings
  const filteredListings = listings.filter((item) => {
    if (currentTab === 'active') return item.is_active && item.status === 'active';
    if (currentTab === 'boosted') return item.is_active && isListingBoosted(item) && item.status === 'active';
    if (currentTab === 'exchanged') return item.status === 'exchanged';
    return true;
  });

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24 text-right">
      
      {/* Profile banner information summary card */}
      <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm text-center relative overflow-hidden space-y-4">
        
        {/* Soft elegant ambient backgrounds */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-tr from-emerald-50 to-teal-50 -z-10" />

        {/* Avatar centered with dynamic device picture upload support */}
        <div className="relative inline-block mt-4 group">
          <div 
            onClick={() => {
              setImageError('');
              setImageSuccess('');
              fileInputRef.current?.click();
            }}
            className="h-18 w-18 rounded-3xl bg-white border-4 border-white shadow-md shadow-emerald-700/5 mx-auto overflow-hidden relative cursor-pointer hover:scale-105 duration-200 transition-all group"
            title="انقر لتغيير الصورة الشخصية مباشرة من جهازك"
          >
            <img 
              src={profile?.profile_image_url || DEFAULT_AVATAR} 
              alt="avatar" 
              className="w-full h-full object-cover group-hover:opacity-85"
              referrerPolicy="no-referrer" 
            />
            {/* Camera hover overlay */}
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-205">
              <Camera className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        {/* Details and public codes */}
        <div className="space-y-1">
          <h2 className="text-lg font-black text-slate-800 leading-snug">
            {profile?.display_name || 'بائع مجهول'}
          </h2>
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <span className="font-mono text-slate-500 font-medium">{formatUserCode(profile?.username, profile?.id)}</span>
            <span>·</span>
            <span className="flex items-center gap-0.5 text-slate-500 font-bold">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{profile?.city ? `${translateLocation(profile.city)}، ` : ''}{profile?.governorate ? `${translateLocation(profile.governorate)}، ` : ''}{translateLocation(profile?.country || 'الأردن')}</span>
            </span>
          </div>

          {profile?.bio && (
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed pt-1 select-none">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Stats matrices split */}
        <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-4.5">
          
          <div className="flex flex-col items-center border-l border-slate-100">
            <div className="flex items-center gap-0.5 text-amber-500 font-bold font-mono">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span className="text-sm">{profile?.average_rating || '5.0'}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">({profile?.ratings_count || '0'} تقييم)</span>
          </div>

          <div className="flex flex-col items-center border-l border-slate-100">
            <div className="flex items-center gap-1 text-teal-700 font-black font-mono">
              <Handshake className="h-4 w-4 text-teal-600" />
              <span className="text-sm">{profile?.completed_exchanges_count || '0'}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">تبادل مكتمل</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-slate-800 font-black font-mono">
              <Package className="h-4 w-4 text-slate-500" />
              <span className="text-sm">{profile?.active_listings_count || '0'}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">إعلان نشط</span>
          </div>

        </div>

      </div>

      {/* Shared Hidden Native File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
      />

      {/* Shortcut Direct Upload Status notifications (only visible when edit drawer is closed) */}
      {!showEditSlider && (uploadingImage || imageError || imageSuccess) && (
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm text-right space-y-2">
          {uploadingImage && (
            <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs animate-pulse">
              <Loader2 className="h-4 w-4 text-emerald-600 animate-spin shrink-0" />
              <span>{imageLoadingMessage || 'جاري معالجة ورفع صورتك المخصصة...'}</span>
            </div>
          )}

          {imageError && (
            <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs text-right">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              <span className="flex-1 leading-normal">{imageError}</span>
              <button 
                type="button" 
                onClick={() => setImageError('')} 
                className="p-1 hover:bg-rose-100 rounded text-rose-800 shrink-0 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {imageSuccess && (
            <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs text-right">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="flex-1 leading-normal">{imageSuccess}</span>
              <button 
                type="button" 
                onClick={() => setImageSuccess('')} 
                className="p-1 hover:bg-emerald-100 rounded text-emerald-800 shrink-0 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Structured horizontal Action row - separate organized layout to prevent icon overlaps with exactly 12px visual spacing and large touch targets */}
      <div className="flex justify-between items-center bg-slate-50/60 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 gap-2">
        
        <button
          onClick={() => setShowEditSlider(true)}
          className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
          style={{ minHeight: '44px' }}
        >
          <Edit3 className="h-4 w-4 text-emerald-600 dark:text-emerald-450" />
          <span>{t('profile.edit_btn')}</span>
        </button>

        <button
          onClick={() => setShowSettingsModal(true)}
          className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl cursor-pointer shadow-sm"
          style={{ minHeight: '44px', minWidth: '44px' }}
          title={t('profile.settings_btn')}
        >
          <Settings className="h-4.5 w-4.5 mx-auto" />
        </button>

        {/* Admin Dashboard Access Button - visible strictly for authorized admin emails to preserve security and stealth */}
        {(userEmail.toLowerCase().trim() === 'vegro09@gmail.com' || 
          userEmail.toLowerCase().trim() === 'baddil.support@gmail.com' || 
          profile?.role === 'admin' || 
          profile?.role === 'super_admin' || 
          profile?.role === 'moderator') && (
          <>
            <style>{`
              @keyframes admin-gold-shimmer {
                0% { transform: translateX(150%); }
                50% { transform: translateX(-150%); }
                100% { transform: translateX(-150%); }
              }
              .animate-admin-gold-shimmer {
                animation: admin-gold-shimmer 2.5s infinite ease-in-out;
              }
            `}</style>
            <button
              onClick={() => {
                window.history.pushState(null, '', '/admin');
                window.dispatchEvent(new Event('popstate'));
              }}
              className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:via-yellow-300 hover:to-amber-500 border border-amber-300 dark:border-amber-600 text-slate-900 font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]"
              style={{ minHeight: '44px' }}
            >
              <span className="relative z-10">لوحة الإشراف</span>
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 pointer-events-none animate-admin-gold-shimmer" />
            </button>
          </>
        )}

      </div>

      {/* Dynamic Browser Push Notifications control center */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl mb-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 text-right flex-1">
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-700 dark:text-emerald-400 mt-0.5">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {language === 'ar' ? 'إشعارات الرسائل الفورية' : 'Instant Message Notifications'}
              </h4>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                {language === 'ar' 
                  ? 'احصل على إشعارات منبثقة على جهازك مباشرة عندما يرسل لك شريك المقايضة رسالة جديدة.' 
                  : 'Get instant push alerts directly on your device when a trading partner sends a message.'}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          {notificationsSupported && notiPermission === 'granted' && (
            <div className="flex items-center shrink-0">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={notiLocalEnabled} 
                  onChange={(e) => toggleLocalNotification(e.target.checked)}
                />
                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          )}
        </div>

        {/* 1. If notification permission not requested yet or default */}
        {notificationsSupported && notiPermission === 'default' && (
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-100 dark:border-emerald-900/40 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-sm">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <BellRing className="h-4 w-4 text-emerald-600 dark:text-emerald-400 animate-bounce shrink-0" />
              <span className="text-[11px] font-bold">
                {language === 'ar' ? 'لم تقم بتفعيل إشعارات المتصفح بعد.' : 'Browser push notifications not enabled yet.'}
              </span>
            </div>
            <button
              onClick={requestNotificationPermission}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-xs py-1.5 px-3.5 rounded-lg shrink-0 cursor-pointer shadow-sm shadow-emerald-700/15 text-center active:scale-95 transition-all"
            >
              {language === 'ar' ? 'تفعيل الإشعارات الآن' : 'Enable Notifications Now'}
            </button>
          </div>
        )}

        {/* 2. If notification is already granted */}
        {notificationsSupported && notiPermission === 'granted' && (
          <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-[11px] ${notiLocalEnabled ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}>
            {notiLocalEnabled ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-450 shrink-0" />
                <span className="font-bold">
                  {language === 'ar' ? 'مسار الإشعارات نشط: ستتلقى تنبيهات المتصفح فوراً.' : 'Notifications Active: You will receive real-time push alerts.'}
                </span>
              </>
            ) : (
              <>
                <BellOff className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="font-semibold">
                  {language === 'ar' ? 'تم كتم الإشعارات مؤقتاً من إعدادات التطبيق.' : 'Notifications are paused from app preferences.'}
                </span>
              </>
            )}
          </div>
        )}

        {/* 3. If notification was blocked/denied */}
        {notificationsSupported && notiPermission === 'denied' && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3 rounded-xl flex items-start gap-2 text-amber-900 dark:text-amber-400 text-[11px]">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-450 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-right leading-normal">
              <span className="font-bold block">
                {language === 'ar' ? 'تم حظر الإشعارات من إعدادات المتصفح' : 'Notifications are blocked in browser'}
              </span>
              <span>
                {language === 'ar' 
                  ? 'يرجى النقر على قفل الأمان بجانب شريط العنوان في متصفحك وتغيير سماح الإشعارات إلى "سماح" لتفعيل الميزة.' 
                  : 'Please click on the site permission lock icon next to the URL address bar, and change Notifications to "Allow".'}
              </span>
            </div>
          </div>
        )}

        {/* 4. If notifications are NOT supported by current browser (e.g. old mobile safari) */}
        {!notificationsSupported && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-3 rounded-xl flex items-center gap-2 text-blue-800 dark:text-blue-400 text-[11px]">
            <AlertCircle className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" />
            <span className="font-medium leading-normal text-right">
              {language === 'ar' 
                ? 'متصفحك الحالي لا يدعم إشعارات الدفع المنبثقة للويب. سنرسل لك تنبيهات فورية داخل التطبيق كبديل دائم.' 
                : 'System push notifications are not supported on this browser. In-app notifications will keep you updated.'}
            </span>
          </div>
        )}
      </div>

      {/* Tab Selectors of active listings owned */}
      <div className="space-y-3.5">
        
        <div 
          className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2"
          style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
        >
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">{t('profile.my_manage')}</h3>
          <span></span>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl">
          <button
            onClick={() => setCurrentTab('active')}
            className={`flex-1 py-2 font-bold text-xs rounded-xl transition-all ${
              currentTab === 'active' 
                ? 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t('profile.tab.active')}
          </button>
          <button
            onClick={() => setCurrentTab('boosted')}
            className={`flex-1 py-1 px-1 font-bold text-xs rounded-xl transition-all ${
              currentTab === 'boosted' 
                ? 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t('profile.tab.boosted')}
          </button>
          <button
            onClick={() => setCurrentTab('exchanged')}
            className={`flex-1 py-1 px-1 font-bold text-xs rounded-xl transition-all ${
              currentTab === 'exchanged' 
                ? 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t('profile.tab.exchanged')}
          </button>
        </div>

        {/* Filtered lists print values */}
        {filteredListings.length === 0 ? (
          <div className="bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl py-12 text-center border border-dashed border-slate-200 dark:border-slate-800">
            <Package className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2.5 shrink-0" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
               لا توجد سلع نشطة في هذا التصنيف حالياً.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredListings.map((item) => {
              const isBoosted = isListingBoosted(item);
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectListing(item.id)}
                  className={`group bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3 hover:border-emerald-100 dark:hover:border-emerald-900/55 transition-all duration-200 flex items-center justify-between cursor-pointer font-sans ${
                    isBoosted ? 'golden-glow-card' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-16 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm shrink-0">
                      <img 
                        src={item.images[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200';
                        }}
                      />
                    </div>
                    
                    <div className="text-start">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 line-clamp-1 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-450">
                        {item.title}
                      </h4>
                      <div className="flex flex-col items-start gap-1 mt-1">
                        <span className="text-[10px] text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 px-2.5 py-0.5 rounded-md font-semibold inline-block" style={{ direction: /[\u0600-\u06FF]/.test(item.desired_exchange) || direction === 'rtl' ? 'rtl' : 'ltr' }}>
                           {t('home.desired_with')}: {item.desired_exchange}
                        </span>
                        {isBoosted && currentUid === item.owner_id && (
                          <div className="pt-0.5">
                            <BoostCountdown boostedUntil={item.boosted_until} ownerId={item.owner_id} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {isBoosted && (
                    <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-[9px] py-1 px-2.5 rounded-lg flex items-center gap-0.5 shadow-sm">
                      <Sparkles className="h-2.5 w-2.5 text-yellow-200 animate-pulse" />
                      <span>{t('details.boost_active')}</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>



      {/* Profile Edit Slide Drawer Overlay panel */}
      {showEditSlider && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="bg-white dark:bg-slate-900 border-t dark:border-slate-800 rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto space-y-4 text-right">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setShowEditSlider(false)}
                className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
              >
                ✖
              </button>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">تعديل ملف الحساب الشخصي</h3>
            </div>

            {editError && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-3.5 rounded-xl flex items-center gap-2.5 text-red-800 dark:text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              
              {/* Profile display name validator checked with minimum 3 chars */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-350 block">الاسم المعروض</label>
                <input
                  type="text"
                  placeholder="الاسم"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full text-right text-xs bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-750 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-600 rounded-xl py-2.5 px-4 outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Bio description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-350 block">نبذة قصيرة عن اهتماماتك</label>
                <textarea
                  rows={3}
                  placeholder="أحب تبادل الأغراض الكلاسيكية مع البائعين..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full text-right text-xs bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-750 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-600 rounded-xl py-2.5 px-4 outline-none resize-none text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Location inputs */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-850 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl text-right">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">نطاق وموقع التبادل</label>
                
                <div className="grid grid-cols-2 gap-2 text-right">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">الدولة</label>
                    <select
                      value={editCountryCode}
                      onChange={(e) => {
                        setEditCountryCode(e.target.value);
                        setEditRegionId('');
                        setEditManualLocation('');
                      }}
                      className="w-full text-right text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-600 rounded-xl py-2 px-2.5 outline-none text-slate-800 dark:text-slate-100"
                    >
                      <option value="">اختر الدولة</option>
                      {ARAB_COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">المنطقة أو المحافظة</label>
                    <select
                      value={editRegionId}
                      onChange={(e) => {
                        setEditRegionId(e.target.value);
                        if (e.target.value !== 'manual') {
                          setEditManualLocation('');
                        }
                      }}
                      disabled={!editCountryCode}
                      className="w-full text-right text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-600 rounded-xl py-2 px-2.5 outline-none disabled:opacity-50 text-slate-800 dark:text-slate-100"
                    >
                      <option value="">الأقاليم / المحافظات</option>
                      {editRegionsList.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {editRegionId === 'manual' && (
                  <div className="space-y-1 mt-2 text-right">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">كتابة اسم منطقتك / مدينتك يدويًا</label>
                    <input
                      type="text"
                      maxLength={100}
                      placeholder="مثال: السلط، حي الزهور، الخ..."
                      value={editManualLocation}
                      onChange={(e) => setEditManualLocation(e.target.value)}
                      className="w-full text-right text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-600 rounded-xl py-2 px-3 outline-none text-slate-800 dark:text-slate-100"
                    />
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">
                      يرجى إدخال اسم المنطقة أو الحي والمدينة بالتفصيل (حرفين على الأقل).
                    </p>
                  </div>
                )}
              </div>

              {/* Profile Image Section */}
              <div className="space-y-3 bg-slate-50/60 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">الصورة الشخصية للحساب</label>
                
                {/* Image Previews & Action buttons */}
                <div className="flex flex-col sm:flex-row-reverse sm:items-center justify-between gap-4">
                  
                  {/* Current Active Preview Circle */}
                  <div className="relative h-20 w-20 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/85 dark:border-slate-700 shadow-md flex-shrink-0 mx-auto sm:mx-0 overflow-hidden group">
                    <img
                      src={selectedAvatar || DEFAULT_AVATAR}
                      alt="avatar-preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Tiny info label */}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] text-center py-0.5">معاينة</div>
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2 text-right">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed font-semibold">
                      حمّل صورة حقيقية لزيادة موثوقية حسابك وتسهيل المقايضات! نقبل صيغ (JPG, PNG, WEBP, HEIC).
                    </p>
                    
                    <div className="flex flex-wrap gap-2 justify-end">
                      {/* Upload Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="bg-emerald-50 dark:bg-emerald-950/25 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/55 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-450 font-bold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 transition-all outline-none cursor-pointer disabled:opacity-50"
                        style={{ minHeight: '36px' }}
                      >
                        <UploadCloud className="h-4 w-4 shrink-0 text-emerald-700" />
                        <span>اختر صورة من جهازك</span>
                      </button>

                      {/* Remove Button if custom image is uploaded */}
                      {selectedAvatar && selectedAvatar !== DEFAULT_AVATAR && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          disabled={uploadingImage}
                          className="bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/45 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 font-bold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 transition-all outline-none cursor-pointer disabled:opacity-50"
                          style={{ minHeight: '36px' }}
                        >
                          <Trash2 className="h-4 w-4 shrink-0" />
                          <span>حذف واستخدام افتراضي</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                {/* Loading State Indicator */}
                {uploadingImage && (
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-2.5 rounded-xl flex items-center gap-2.5 text-emerald-800 dark:text-emerald-450 text-xs animate-pulse">
                    <Loader2 className="h-4 w-4 text-emerald-600 animate-spin shrink-0 animate-pulse" />
                    <span>{imageLoadingMessage || 'جاري معالجة ورفع الصورة...'}</span>
                  </div>
                )}

                {/* Error Banner */}
                {imageError && (
                  <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-2.5 rounded-xl flex items-center gap-2.5 text-rose-800 dark:text-rose-450 text-xs">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span className="flex-1 leading-normal">{imageError}</span>
                    <button type="button" onClick={() => setImageError('')} className="p-0.5 hover:bg-rose-100 rounded text-rose-800">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Success Banner */}
                {imageSuccess && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-2.5 rounded-xl flex items-center gap-2.5 text-emerald-800 dark:text-emerald-450 text-xs text-right">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="flex-1 leading-normal">{imageSuccess}</span>
                    <button type="button" onClick={() => setImageSuccess('')} className="p-0.5 hover:bg-emerald-100 rounded text-emerald-800">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

              </div>

              {/* Action row save submit buttons */}
              <button
                type="submit"
                disabled={savingEdit}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all outline-none"
              >
                {savingEdit ? 'جاري حفظ التعديل...' : 'حفظ التغييرات'}
              </button>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* Settings Modal Slider */}
      {showSettingsModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className={`bg-white dark:bg-slate-900 border-t dark:border-slate-800 rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto space-y-6 ${language === 'ar' ? 'text-right' : 'text-left'}`} style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              {settingsSubView !== 'main' ? (
                <button
                  type="button"
                  onClick={() => setSettingsSubView('main')}
                  className="p-1 px-3 rounded-full bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 font-bold transition-all text-xs"
                >
                  {language === 'ar' ? '← رجوع' : '← Back'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(false);
                    setSettingsSubView('main');
                  }}
                  className="p-1 px-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400 font-bold transition-all text-xs"
                >
                  ✖
                </button>
              )}
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                {settingsSubView === 'main' && t('profile.settings.title')}
                {settingsSubView === 'complaints' && (language === 'ar' ? 'الشكاوى والاقتراحات' : 'Complaints & Suggestions')}
                {settingsSubView === 'report' && (language === 'ar' ? 'الإبلاغ عن مشكلة' : 'Report a Problem')}
                {settingsSubView === 'feature' && (language === 'ar' ? 'اقتراح ميزة جديدة' : 'Request a New Feature')}
                {settingsSubView === 'improvement' && (language === 'ar' ? 'ملاحظات وتطوير التطبيق' : 'App Improvement Feedback')}
                {settingsSubView === 'support' && (language === 'ar' ? 'فريق الدعم' : 'Support Team')}
              </h3>
            </div>

            {settingsSubView === 'main' && (
              <>
                <div className={`space-y-3 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('profile.settings.lang_switch')}
                  </label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage('ar');
                      }}
                      className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                        language === 'ar'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-800 dark:text-emerald-400 font-black'
                          : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      العربية
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage('en');
                      }}
                      className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                        language === 'en'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-800 dark:text-emerald-400 font-black'
                          : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {/* Night Mode & Day Mode Theme Selector */}
                <div className={`space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {language === 'ar' ? 'مظهر التطبيق (الوضع الليلي / النهاري)' : 'App Theme (Night / Day Mode)'}
                  </label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleThemeChange('light')}
                      className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeTheme === 'light'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-800 dark:text-emerald-400 font-black'
                          : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Sun className="h-4 w-4 text-amber-500" />
                      <span>{language === 'ar' ? 'الوضع النهاري' : 'Day Mode'}</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleThemeChange('dark')}
                      className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeTheme === 'dark'
                          ? 'bg-slate-800 dark:bg-slate-950 border-slate-750 dark:border-slate-600 text-amber-450 font-black'
                          : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Moon className="h-4 w-4 text-indigo-400" />
                      <span>{language === 'ar' ? 'الوضع الليلي' : 'Night Mode'}</span>
                    </button>
                  </div>
                </div>

                <div className={`space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {language === 'ar' ? 'البنود القانونية والخصوصية' : 'Legal terms & privacy'}
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsModal(false);
                      onOpenLegal?.();
                    }}
                    className={`w-full bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-xl text-xs border border-slate-100 dark:border-slate-800 transition-all cursor-pointer ${
                      language === 'ar' ? 'text-right' : 'text-left'
                    }`}
                    style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
                  >
                    {language === 'ar' ? 'الشروط والخصوصية لمجتمع بَدِل' : 'BADDIL Terms & Privacy'}
                  </button>
                </div>

                {/* Feedback, Suggestions & Support Section */}
                <div className={`space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {language === 'ar' ? 'الشكاوى والاقتراحات والدعم' : 'Feedback, Suggestions & Support'}
                  </label>

                  {/* Complaints & Suggestions */}
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsSubView('complaints');
                      resetFeedbackForm();
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-xl text-xs flex flex-col border border-slate-100 dark:border-slate-800 transition-all cursor-pointer gap-1"
                    style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
                  >
                    <div className="flex items-center justify-between w-full font-black">
                      <span>{language === 'ar' ? '• الشكاوى والاقتراحات' : '• Complaints & Suggestions'}</span>
                      <span className="text-slate-400 font-black">{language === 'ar' ? '←' : '→'}</span>
                    </div>
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 text-right w-full" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                      {language === 'ar' ? 'أرسل شكوى أو اقتراحًا أو ملاحظة لتحسين تطبيق بدّل.' : 'Send a complaint, suggestion, or feedback to improve BADDIL.'}
                    </span>
                  </button>

                  {/* Support Team */}
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsSubView('support');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-xl text-xs flex flex-col border border-slate-100 dark:border-slate-800 transition-all cursor-pointer gap-1"
                    style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
                  >
                    <div className="flex items-center justify-between w-full font-black">
                      <span>{language === 'ar' ? '• فريق الدعم' : '• Support Team'}</span>
                      <span className="text-slate-400 font-black">{language === 'ar' ? '←' : '→'}</span>
                    </div>
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 text-right w-full" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                      {language === 'ar' ? 'تواصل مع فريق دعم بدّل.' : 'Contact the BADDIL support team.'}
                    </span>
                  </button>
                </div>

                {onLogoutClick && (
                  <div className={`space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {language === 'ar' ? 'إجراءات الحساب' : 'Account Actions'}
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsModal(false);
                        onLogoutClick();
                      }}
                      className="w-full bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-450 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer"
                      style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
                    >
                      <div className="flex items-center gap-2">
                        <LogOut className="h-4 w-4" />
                        <span>{language === 'ar' ? 'تسجيل الخروج من الحساب' : 'Log Out of Account'}</span>
                      </div>
                      <span className="text-rose-400 font-black">{language === 'ar' ? '←' : '→'}</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all mt-4"
                >
                  {t('common.save')}
                </button>
              </>
            )}

            {/* Complaints & Suggestions Form */}
            {settingsSubView === 'complaints' && (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                {feedbackSuccess ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-xl text-center space-y-3">
                    <div className="text-2xl">🎉</div>
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                      {language === 'ar' ? 'تم إرسال شكواك/اقتراحك بنجاح! شكرًا لمساهمتك.' : 'Your complaint/suggestion has been sent successfully! Thank you.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSettingsSubView('main')}
                      className="bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs"
                    >
                      {language === 'ar' ? 'العودة للإعدادات' : 'Back to Settings'}
                    </button>
                  </div>
                ) : (
                  <>
                    {feedbackError && (
                      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-2.5 rounded-xl text-rose-800 dark:text-rose-400 text-xs">
                        {feedbackError}
                      </div>
                    )}

                    <div className="space-y-1 text-right">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                        {language === 'ar' ? 'نوع الطلب' : 'Request Type'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFeedbackType('complaint')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            feedbackType === 'complaint'
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-800 dark:text-emerald-400'
                              : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                          }`}
                        >
                          {language === 'ar' ? 'شكوى' : 'Complaint'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeedbackType('suggestion')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            feedbackType === 'suggestion'
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-800 dark:text-emerald-400'
                              : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                          }`}
                        >
                          {language === 'ar' ? 'اقتراح' : 'Suggestion'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-right">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                        {language === 'ar' ? 'الموضوع' : 'Subject'}
                      </label>
                      <input
                        type="text"
                        required
                        value={feedbackSubject}
                        onChange={(e) => setFeedbackSubject(e.target.value)}
                        placeholder={language === 'ar' ? 'اكتب موضوع الشكوى أو الاقتراح هنا...' : 'Enter the subject...'}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-600 text-slate-800 dark:text-slate-100 text-right"
                        style={{ direction: language === 'ar' ? 'rtl' : 'ltr', textAlign: language === 'ar' ? 'right' : 'left' }}
                      />
                    </div>

                    <div className="space-y-1 text-right">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                        {language === 'ar' ? 'الرسالة' : 'Message'}
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        placeholder={language === 'ar' ? 'اكتب تفاصيل الشكوى أو الاقتراح بالتفصيل لمساعدتنا على خدمتك...' : 'Enter your detailed feedback...'}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-600 text-slate-800 dark:text-slate-100 text-right"
                        style={{ direction: language === 'ar' ? 'rtl' : 'ltr', textAlign: language === 'ar' ? 'right' : 'left' }}
                      />
                    </div>

                    <div className="space-y-1 text-right">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                        {language === 'ar' ? 'ارفاق صورة (اختياري)' : 'Attach Image (Optional)'}
                      </label>
                      <div className="flex items-center gap-2 relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFeedbackFileChange}
                          id="complaint-file-upload"
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                        />
                        <div
                          className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all w-full justify-center"
                        >
                          {feedbackUploading ? (
                            <Loader2 className="h-3.5 w-3.5 text-emerald-600 animate-spin" />
                          ) : (
                            <UploadCloud className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span>
                            {feedbackImgUrl
                              ? (language === 'ar' ? '✓ تم رفع الصورة' : '✓ Image Uploaded')
                              : (language === 'ar' ? 'تحميل صورة' : 'Upload Image')}
                          </span>
                        </div>
                      </div>
                      {feedbackImgUrl && (
                        <div className="mt-2 relative inline-block text-right z-20">
                          <img src={feedbackImgUrl} alt="Attached" className="h-16 w-16 object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
                          <button
                            type="button"
                            onClick={() => setFeedbackImgUrl('')}
                            className="absolute -top-1.5 -left-1.5 bg-rose-500 text-white rounded-full p-0.5 hover:bg-rose-600 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submittingFeedback || feedbackUploading}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition-all mt-4 animate-all"
                    >
                      {submittingFeedback ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (language === 'ar' ? 'إرسال' : 'Submit')}
                    </button>
                  </>
                )}
              </form>
            )}

            {/* Support Team View */}
            {settingsSubView === 'support' && (
              <div className="space-y-4 p-4 text-center bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-450 font-bold rounded-full flex items-center justify-center mx-auto text-lg">
                  ✉
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                    {language === 'ar' ? 'فريق الدعم' : 'Support Team'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                    {language === 'ar'
                      ? 'إذا كنت بحاجة إلى المساعدة أو لديك استفسار أو تواجه مشكلة في التطبيق، يمكنك التواصل معنا عبر البريد الإلكتروني التالي:'
                      : 'If you need assistance, have questions, or experience any issue within the app, please contact us via:'}
                  </p>
                  <div className="pt-2">
                    <a
                      href={`mailto:baddil.support@gmail.com?subject=${encodeURIComponent(language === 'ar' ? 'الدعم الفني - تطبيق بدل' : 'Technical Support - BADDIL App')}`}
                      className="inline-block bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all font-mono"
                    >
                      baddil.support@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}


    </div>
  );
}
