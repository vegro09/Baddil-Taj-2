import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { 
  Plus, 
  Trash2, 
  MapPin, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Check, 
  Loader2, 
  Sparkles, 
  AlertCircle 
} from 'lucide-react';
import { ARAB_COUNTRIES, SelectionRegion, SelectionCity } from '../data/locations';
import { ListingCondition } from '../types';
import { dbService } from '../db/dbService';
import { compressImageToWebP } from '../utils/imageCompressor';
import { motion } from 'motion/react';
import { useTranslation } from './LanguageContext';

const CATEGORIES = [
  'إلكترونيات',
  'هواتف',
  'أجهزة منزلية',
  'أثاث',
  'ملابس',
  'سيارات وإكسسوارات',
  'ألعاب',
  'كتب',
  'رياضة',
  'أدوات',
  'مقتنيات',
  'أخرى'
];

const CONDITIONS: ListingCondition[] = [
  'جديد',
  'شبه جديد',
  'مستعمل بحالة جيدة',
  'مستعمل',
  'يحتاج صيانة'
];

interface AddListingPageProps {
  onSuccess: () => void;
}

interface UploadingFile {
  id: string;
  file?: File;
  name: string;
  type: 'image' | 'video';
  previewUrl: string;
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
}

export default function AddListingPage({ onSuccess }: AddListingPageProps) {
  const { t, language, translateCategory, translateCondition } = useTranslation();
  // Fields state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('إلكترونيات');
  const [condition, setCondition] = useState<ListingCondition>('جديد');
  const [desiredExchange, setDesiredExchange] = useState('');
  const [exchangePreferences, setExchangePreferences] = useState('');
  const [policyConfirmed, setPolicyConfirmed] = useState(false);

  // Location hierarchy state
  const [countryCode, setCountryCode] = useState('');
  const [regionId, setRegionId] = useState('');
  const [cityId, setCityId] = useState('');
  const [regions, setRegions] = useState<SelectionRegion[]>([]);
  const [cities, setCities] = useState<SelectionCity[]>([]);
  const [customRegionName, setCustomRegionName] = useState('');
  const [customCityName, setCustomCityName] = useState('');

  // Media files states
  const [mediaList, setMediaList] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation & Error states
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');

  // Sync Regions when Country Code changes
  useEffect(() => {
    if (countryCode) {
      const countryObj = ARAB_COUNTRIES.find(c => c.code === countryCode);
      const list = countryObj ? [...countryObj.regions] : [];
      // append "other" region option
      const withOther = [...list, { id: 'other', name: 'لم أجد منطقتي — كتابة الموقع يدويًا', cities: [] }];
      setRegions(withOther);
    } else {
      setRegions([]);
    }
    setRegionId('');
    setCityId('');
    setCustomRegionName('');
    setCustomCityName('');
  }, [countryCode]);

  // Sync Cities when Region changes
  useEffect(() => {
    if (regionId) {
      if (regionId === 'other') {
        const withOther = [{ id: 'other', name: 'لم أجد منطقتي — كتابة الموقع يدويًا' }];
        setCities(withOther);
        setCityId('other'); // automatically pre-select other city when other region is chosen
      } else {
        const regionObj = regions.find(r => r.id === regionId);
        const list = regionObj ? [...regionObj.cities] : [];
        const withOther = [...list, { id: 'other', name: 'لم أجد منطقتي — كتابة الموقع يدويًا' }];
        setCities(withOther);
      }
    } else {
      setCities([]);
    }
    if (regionId !== 'other') {
      setCityId('');
    }
    setCustomCityName('');
  }, [regionId, regions]);

  // Helper to compress image on client-side and convert to WebP before saving to Firestore/Local Storage
  const compressImage = async (base64Str: string): Promise<string> => {
    try {
      const result = await compressImageToWebP(base64Str, 0.6);
      console.log(`[BADDIL Image Optimizer] Compressed to WebP. Size: ${result.sizeInKb.toFixed(1)} KB (Target: <500KB)`);
      return result.base64;
    } catch (err) {
      console.warn("[BADDIL Image Optimizer] Failed to convert to WebP, fallback to raw", err);
      return base64Str;
    }
  };

  // Convert File to preview and simulate progressive upload
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newUploads: UploadingFile[] = [];

    (Array.from(files) as File[]).forEach((file) => {
      // Validate formats with fallback to extension check to support all platforms
      const fileExt = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '';
      const isImg = file.type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'].includes(fileExt);
      const isVid = file.type.startsWith('video/') || ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.3gp', '.3gpp'].includes(fileExt);

      if (!isImg && !isVid) {
        setGlobalError(`صيغة الملف "${file.name}" غير مدعومة! مسموح بالصور ومقاطع الفيديو فقط.`);
        return;
      }

      // Check file size for video to prevent Firestore post failure (Firestore doc max limit is 1MB)
      if (isVid) {
        const MAX_VIDEO_SIZE = 1 * 1024 * 1024; // 1MB
        if (file.size > MAX_VIDEO_SIZE) {
          setGlobalError(
            language === 'ar'
              ? `عذراً، حجم ملف الفيديو "${file.name}" كبير جداً. يرجى اختيار فيديو بحجم أقل من 1 ميجابايت للتخزين بنجاح.`
              : `Sorry, the video file "${file.name}" is too large. Please select a video under 1MB for successful storage.`
          );
          return;
        }
      } else {
        // High quality images can also be limited up to 10MB before client-side compress
        if (file.size > 10 * 1024 * 1024) {
          setGlobalError(`الملف "${file.name}" يتجاوز الحد المسموح للصور (10 ميجابايت).`);
          return;
        }
      }

      const id = 'media_' + Math.random().toString(36).substring(2, 9) + Date.now();
      const tempPreview = URL.createObjectURL(file);

      const fRecord: UploadingFile = {
        id,
        file,
        name: file.name,
        type: isImg ? 'image' : 'video',
        previewUrl: tempPreview,
        progress: 0,
        status: 'uploading'
      };

      newUploads.push(fRecord);

      // Start reader for persistent Base64 conversion
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const rawBase64 = reader.result as string;
          let finalBase64 = rawBase64;

          if (isImg) {
            finalBase64 = await compressImage(rawBase64);
          }

          // Revoke temporary blob URL
          try {
            URL.revokeObjectURL(tempPreview);
          } catch (revokeErr) {}

          simulateFileUpload(id, finalBase64);
        } catch (err) {
          console.error("Error processing file encoding", err);
          simulateFileUpload(id, tempPreview);
        }
      };
      reader.onerror = () => {
        simulateFileUpload(id, tempPreview);
      };
      reader.readAsDataURL(file);
    });

    setMediaList((prev) => [...prev, ...newUploads]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Visual progressive feedback of files uploading
  const simulateFileUpload = (id: string, finalUrl?: string) => {
    let prog = 0;
    const interval = setInterval(() => {
      prog += Math.floor(Math.random() * 25) + 15;
      if (prog >= 100) {
        prog = 100;
        clearInterval(interval);
        setMediaList((prev) => 
          prev.map((item) => 
            item.id === id 
              ? { 
                  ...item, 
                  progress: 100, 
                  status: 'completed', 
                  previewUrl: finalUrl || item.previewUrl 
                } 
              : item
          )
        );
      } else {
        setMediaList((prev) => 
          prev.map((item) => 
            item.id === id ? { ...item, progress: Math.min(prog, 95) } : item
          )
        );
      }
    }, 150);
  };

  const cancelOrRemoveUpload = (id: string) => {
    setMediaList((prev) => {
      const target = prev.find(item => item.id === id);
      if (target && target.previewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch (e) {}
      }
      return prev.filter(item => item.id !== id);
    });
  };

  // Submission handles
  const handlePublish = async (e: FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setGlobalError('');

    const errors: Record<string, string> = {};

    // Mandatory RTL Validations matching strict length guidelines
    if (!title || title.trim().length < 3) {
      errors.title = 'يجب أن يكون اسم الإعلان 3 أحرف على الأقل';
    }

    if (!description || description.trim().length < 10) {
      errors.description = 'يجب أن يكون وصف الإعلان 10 أحرف على الأقل';
    }

    if (!countryCode) {
      errors.country = 'يرجى اختيار بلد التبادل';
    }

    if (!regionId) {
      errors.region = 'يرجى اختيار المحافظة أو الولاية';
    } else if (regionId === 'other' && (!customRegionName.trim() || customRegionName.trim().length < 2)) {
      errors.region = 'يرجى كتابة اسم الموقع بالتفصيل (حرفين على الأقل)';
    }

    if (!cityId) {
      errors.city = 'يرجى اختيار المنطقة أو المدينة';
    } else if (cityId === 'other' && (!customCityName.trim() || customCityName.trim().length < 2)) {
      errors.city = 'يرجى كتابة اسم المدينة أو المنطقة بالتفصيل (حرفين على الأقل)';
    }

    if (!desiredExchange || desiredExchange.trim().length === 0) {
      errors.desiredExchange = 'يرجى تحديد ما ترغب به في المقابل';
    }

    if (!policyConfirmed) {
      errors.policy = 'يجب الموافقة وتأكيد الامتثال لسياسة النشر والتبادل للمتابعة';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const firstError = Object.values(errors)[0];
      setGlobalError(`يرجى تصحيح الأخطاء: ${firstError}`);
      return;
    }

    setSubmitting(true);

    try {
      // Find location strings
      const countryObj = ARAB_COUNTRIES.find(c => c.code === countryCode);
      const regionObj = regions.find(r => r.id === regionId);
      const cityObj = cities.find(c => c.id === cityId);

      const resolvedRegion = regionId === 'other' ? customRegionName.trim() : (regionObj?.name || '');
      const resolvedCity = cityId === 'other' ? customCityName.trim() : (cityObj?.name || '');

      const resolvedImages = mediaList
        .filter(m => m.status === 'completed' && m.type === 'image')
        .map(m => m.previewUrl); // Using fallback preallocated previews or direct urls

      // If no image uploaded, provide standard high-quality generic category placeholder
      const imagesPayload = resolvedImages.length > 0 
        ? resolvedImages 
        : ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=600'];

      const resolvedVideos = mediaList
        .filter(m => m.status === 'completed' && m.type === 'video')
        .map(m => m.previewUrl);

      await dbService.createListing({
        title,
        description,
        category,
        condition,
        country: countryObj?.name || '',
        governorate: resolvedRegion,
        city: resolvedCity,
        images: imagesPayload,
        videos: resolvedVideos,
        desired_exchange: desiredExchange,
        exchange_preferences: exchangePreferences,
        listingPolicyConfirmed: true,
        listingPolicyConfirmedAt: new Date().toISOString(),
        listingPolicyVersion: "1.0"
      });

      // Clear fields
      setTitle('');
      setDescription('');
      setDesiredExchange('');
      setExchangePreferences('');
      setMediaList([]);
      setPolicyConfirmed(false);
      
      onSuccess();
    } catch (err) {
      console.error("Publish listing error", err);
      setGlobalError('تعذر نشر الإعلان، يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24 text-right">
      
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          <span>{t('add.title')}</span>
        </h2>
        <span></span>
      </div>

      {globalError && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 flex items-center gap-3 text-red-800 dark:text-red-350 text-xs text-right">
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      <form onSubmit={handlePublish} className="space-y-4">
        
        {/* Title */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600">
            <label>{t('add.label.title')}</label>
            <span className="text-[10px] text-slate-400 font-mono">{title.length}/100</span>
          </div>
          <input
            type="text"
            maxLength={100}
            placeholder={t('add.placeholder.title')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full text-xs text-slate-800 dark:text-slate-100 bg-slate-50 border rounded-xl py-3 px-4 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 ${
              validationErrors.title ? 'border-red-500 focus:ring-red-100 focus:bg-white' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900'
            }`}
          />
          {validationErrors.title && (
            <p className="text-[11px] text-red-500 font-semibold">{validationErrors.title}</p>
          )}
        </div>

        {/* Desired Exchange */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600 block">{t('add.label.desired')}</label>
          <input
            type="text"
            placeholder={t('add.placeholder.desired')}
            value={desiredExchange}
            onChange={(e) => setDesiredExchange(e.target.value)}
            className={`w-full text-xs text-slate-800 dark:text-slate-100 bg-slate-50 border rounded-xl py-3 px-4 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 ${
              validationErrors.desiredExchange ? 'border-red-500 focus:ring-red-100 focus:bg-white' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900'
            }`}
          />
          {validationErrors.desiredExchange && (
            <p className="text-[11px] text-red-500 font-semibold">{validationErrors.desiredExchange}</p>
          )}
        </div>

        {/* Selection categories & condition splits */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 block">{t('add.label.category')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs text-slate-800 dark:text-slate-100 bg-slate-50 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl py-2.5 px-3 transition-all outline-none"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{translateCategory(cat)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 block">{t('add.label.condition')}</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as ListingCondition)}
              className="w-full text-xs text-slate-800 dark:text-slate-100 bg-slate-50 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl py-2.5 px-3 transition-all outline-none"
            >
              {CONDITIONS.map(cond => (
                <option key={cond} value={cond}>{translateCondition(cond)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600">
            <label>{t('add.label.description')}</label>
            <span className="text-[10px] text-slate-400 font-mono">{description.length}/1000</span>
          </div>
          <textarea
            maxLength={1000}
            rows={4}
            placeholder={t('add.placeholder.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full text-xs text-slate-800 dark:text-slate-100 bg-slate-50 border rounded-xl py-3 px-4 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 ${
              validationErrors.description ? 'border-red-500 focus:ring-red-100 focus:bg-white' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900'
            }`}
          />
          {validationErrors.description && (
            <p className="text-[11px] text-red-500 font-semibold">{validationErrors.description}</p>
          )}
        </div>

        {/* Media Select Grid */}
        <div className="space-y-2 pb-1">
          <label className="text-xs font-bold text-slate-600 block">{t('add.label.media')}</label>
          <div className="grid grid-cols-4 gap-2">
            {mediaList.map((item) => (
              <div 
                key={item.id} 
                className="relative aspect-square border border-slate-100 bg-slate-50 rounded-xl overflow-hidden shadow-sm"
              >
                {item.type === 'image' ? (
                  <img src={item.previewUrl} alt="up preview" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                ) : (
                  <video src={item.previewUrl} className="object-cover w-full h-full bg-black cursor-pointer" muted playsInline />
                )}

                {/* Simulated file progress wrapper */}
                {item.status === 'uploading' && (
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center text-white p-1">
                    <Loader2 className="p-0.5 h-4 w-4 animate-spin mb-1 text-teal-400" />
                    <span className="text-[9px] font-mono">{item.progress}%</span>
                  </div>
                )}

                {/* Complete verification */}
                {item.status === 'completed' && (
                  <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow">
                    <Check className="h-2.5 w-2.5" />
                  </div>
                )}

                {/* Cancel or remove button */}
                <button
                  type="button"
                  onClick={() => cancelOrRemoveUpload(item.id)}
                  className="absolute bottom-1 left-1 bg-white/95 text-rose-500 hover:bg-slate-100 p-1 rounded-lg border border-slate-100 shadow transition-all"
                  title={language === 'ar' ? 'حذف' : 'Delete'}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Empty clickable insert trigger card */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex flex-col items-center justify-center rounded-xl cursor-pointer text-slate-400 dark:text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all shadow-sm"
            >
              <Plus className="h-5 w-5 mb-1 text-slate-400 dark:text-slate-500" />
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{language === 'ar' ? 'إضافة ملف' : 'Add File'}</span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
            {language === 'ar' 
              ? 'تلميح: يدعم صيغ JPG، PNG و WEBP للصور، و MP4 للفيديو. الحجم الأقصى للملف 30 ميجا بايت.'
              : 'Hint: Supports JPG, PNG and WEBP for images, and MP4 for videos. Maximum file size is 30MB.'}
          </p>
        </div>

        {/* Location Selection Hierarchy Group */}
        <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t('add.location.title')}</span>
          </h3>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{t('auth.country')}</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className={`w-full text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border rounded-xl py-2 px-2.5 outline-none ${
                  validationErrors.country ? 'border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'
                }`}
              >
                <option value="" className="dark:bg-slate-900">{t('auth.select_country')}</option>
                {ARAB_COUNTRIES.map(c => (
                  <option key={c.code} value={c.code} className="dark:bg-slate-900">
                    {language === 'ar' ? c.name : (c.code === 'JO' ? 'Jordan' : c.code === 'SA' ? 'Saudi Arabia' : c.code === 'AE' ? 'UAE' : c.code === 'EG' ? 'Egypt' : c.code === 'OM' ? 'Oman' : c.name)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{t('auth.governorate')}</label>
              <select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                disabled={!countryCode}
                className={`w-full text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border rounded-xl py-2 px-2.5 outline-none disabled:opacity-50 ${
                  validationErrors.region ? 'border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'
                }`}
              >
                <option value="" className="dark:bg-slate-900">{t('auth.select_governorate')}</option>
                {regions.map(r => (
                  <option key={r.id} value={r.id} className="dark:bg-slate-900">
                    {r.id === 'other' ? (language === 'ar' ? 'لم أجد منطقتي — كتابة الموقع يدويًا' : 'My region is not listed — enter physically') : r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{t('auth.city')}</label>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                disabled={!regionId}
                className={`w-full text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border rounded-xl py-2 px-2.5 outline-none disabled:opacity-50 ${
                  validationErrors.city ? 'border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'
                }`}
              >
                <option value="" className="dark:bg-slate-900">{t('auth.select_city')}</option>
                {cities.map(ct => (
                  <option key={ct.id} value={ct.id} className="dark:bg-slate-900">
                    {ct.id === 'other' ? (language === 'ar' ? 'لم أجد منطقتي — كتابة الموقع يدويًا' : 'My region is not listed — enter physically') : ct.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Custom Location Inputs */}
          {(regionId === 'other' || cityId === 'other') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              {regionId === 'other' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">
                    {language === 'ar' ? 'اكتب اسم المحافظة / الولاية' : 'Enter state / governorate name'}
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder={language === 'ar' ? 'مثال: البلقاء، الشارقة، الباطنة' : 'e.g. Al Balqa, Sharjah, Al Batinah'}
                    value={customRegionName}
                    onChange={(e) => setCustomRegionName(e.target.value)}
                    className={`w-full text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border rounded-xl py-2 px-3 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 ${
                      validationErrors.region ? 'border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'
                    }`}
                  />
                  {validationErrors.region && (
                    <p className="text-[10px] text-red-500 font-semibold">{validationErrors.region}</p>
                  )}
                </div>
              )}

              {cityId === 'other' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">
                    {language === 'ar' ? 'اكتب اسم المدينة / المنطقة / الحي' : 'Enter city / area / neighborhood'}
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder={language === 'ar' ? 'مثال: الفحيص، دبا الحصن، نزوى' : 'e.g., Fuheis, Dibba Al Hesn, Nizwa'}
                    value={customCityName}
                    onChange={(e) => setCustomCityName(e.target.value)}
                    className={`w-full text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border rounded-xl py-2 px-3 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 ${
                      validationErrors.city ? 'border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'
                    }`}
                  />
                  {validationErrors.city && (
                    <p className="text-[10px] text-red-500 font-semibold">{validationErrors.city}</p>
                  )}
                </div>
              )}
            </div>
          )}


        </div>

        {/* Exchange Preferences */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">{t('add.label.preferences')}</label>
          <input
            type="text"
            placeholder={t('add.placeholder.preferences')}
            value={exchangePreferences}
            onChange={(e) => setExchangePreferences(e.target.value)}
            className="w-full text-xs text-slate-800 dark:text-slate-100 bg-slate-50 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl py-3 px-4 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        {/* Listing Policy Confirmation Checkbox */}
        <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
          <div className="flex items-start gap-2.5 justify-end text-right" dir="rtl">
            <input
              id="chk_list_policy"
              type="checkbox"
              checked={policyConfirmed}
              onChange={() => setPolicyConfirmed(!policyConfirmed)}
              className="rounded accent-emerald-600 h-4.5 w-4.5 shrink-0 mt-0.5 cursor-pointer animate-pulse"
            />
            <label htmlFor="chk_list_policy" className="text-[11px] text-slate-500 font-bold select-none cursor-pointer leading-relaxed text-right flex-1">
              {language === 'ar' ? (
                <>
                  أؤكد بأن الإعلان يتوافق تماماً مع{' '}
                  <strong className="text-emerald-700 font-black">سياسة النشر لمجتمع بَدِل</strong> المحددة في الشروط والأحكام، وبخاصة خلوّه من أي سلع مقرصنة، منشطة، سارقة، أو أسلحة ومحظورات قانونية.
                </>
              ) : (
                <>
                  I confirm that this listing fully complies with BADDIL’s{' '}
                  <strong className="text-emerald-700 font-black">Publication Safety Policy</strong>, guaranteeing it contains no stolen or counterfeit goods, weapons, drugs, or illegal items.
                </>
              )}
            </label>
          </div>
          {validationErrors.policy && <p className="text-[10px] text-rose-500 font-bold text-right leading-none mt-1">{validationErrors.policy}</p>}
        </div>

        {/* Action Triggers */}
        <div className="pt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !policyConfirmed}
            className={`flex-1 ${
              (!policyConfirmed || submitting) ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/10'
            } font-bold py-3 px-6 rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2`}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>{language === 'ar' ? 'جاري النشر...' : 'Publishing...'}</span>
              </>
            ) : (
              <span>{t('add.btn_publish')}</span>
            )}
          </button>
        </div>

      </form>

    </div>
  );
}
