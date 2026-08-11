import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, SlidersHorizontal, RefreshCw, Sparkles, Filter, X, Loader2 } from 'lucide-react';
import { ARAB_COUNTRIES, SelectionRegion, SelectionCity } from '../data/locations';
import { Listing, ListingCondition, isListingBoosted } from '../types';
import { dbService } from '../db/dbService';
import { motion } from 'motion/react';
import { useTranslation } from './LanguageContext';
import BoostCountdown from './BoostCountdown';

interface SearchPageProps {
  initialCategory?: string;
  onSelectListing: (id: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export default function SearchPage({
  initialCategory,
  onSelectListing,
  favorites,
  onToggleFavorite
}: SearchPageProps) {
  const { t, language, direction, translateCategory, translateCondition, translateLocation } = useTranslation();
  // Filters state config
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'all');
  const [selectedCondition, setSelectedCondition] = useState<string>('');

  // Dropdown options based on stable identifiers
  const [regions, setRegions] = useState<SelectionRegion[]>([]);
  const [cities, setCities] = useState<SelectionCity[]>([]);

  // Results state
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // Sync initialCategory
  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  // Load regions when Country changes
  useEffect(() => {
    if (selectedCountryCode) {
      const countryObj = ARAB_COUNTRIES.find(c => c.code === selectedCountryCode);
      setRegions(countryObj?.regions || []);
    } else {
      setRegions([]);
    }
    setSelectedRegionId('');
    setSelectedCityId('');
  }, [selectedCountryCode]);

  // Load cities when Region changes
  useEffect(() => {
    if (selectedRegionId) {
      const regionObj = regions.find(r => r.id === selectedRegionId);
      setCities(regionObj?.cities || []);
    } else {
      setCities([]);
    }
    setSelectedCityId('');
  }, [selectedRegionId, regions]);

  // Command listing searches on parameter updates
  useEffect(() => {
    async function executeQuery() {
      setLoading(true);
      setHasMore(true);
      try {
        const countryObj = ARAB_COUNTRIES.find(c => c.code === selectedCountryCode);
        const regionObj = regions.find(r => r.id === selectedRegionId);
        const cityObj = cities.find(c => c.id === selectedCityId);

        const fetched = await dbService.getListings({
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          condition: selectedCondition || undefined,
          country: countryObj?.name || undefined,
          governorate: regionObj?.name || undefined,
          city: cityObj?.name || undefined,
          searchTerm: searchTerm || undefined,
          limitCount: 10
        });
        setListings(fetched);
        if (fetched.length < 10) {
          setHasMore(false);
        }
      } catch (err) {
        console.error("Listing query fail", err);
      } finally {
        setLoading(false);
      }
    }
    executeQuery();
  }, [
    searchTerm,
    selectedCountryCode,
    selectedRegionId,
    selectedCityId,
    selectedCategory,
    selectedCondition,
    regions,
    cities
  ]);

  const loadMoreListings = async () => {
    if (loadingMore || !hasMore || listings.length === 0) return;
    setLoadingMore(true);
    try {
      const countryObj = ARAB_COUNTRIES.find(c => c.code === selectedCountryCode);
      const regionObj = regions.find(r => r.id === selectedRegionId);
      const cityObj = cities.find(c => c.id === selectedCityId);
      const lastItem = listings[listings.length - 1];

      const data = await dbService.getListings({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        condition: selectedCondition || undefined,
        country: countryObj?.name || undefined,
        governorate: regionObj?.name || undefined,
        city: cityObj?.name || undefined,
        searchTerm: searchTerm || undefined,
        limitCount: 10,
        lastVisibleId: lastItem.id
      });
      if (data.length < 10) {
        setHasMore(false);
      }
      setListings(prev => [...prev, ...data]);
      console.log(`[BADDIL Search Pagination] Loaded next 10 items. Total listings: ${listings.length + data.length}`);
    } catch (err) {
      console.error("Failed to load more listings", err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMoreListings();
      }
    }, { threshold: 0.1 });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [
    hasMore,
    loading,
    listings,
    searchTerm,
    selectedCountryCode,
    selectedRegionId,
    selectedCityId,
    selectedCategory,
    selectedCondition
  ]);

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCountryCode('');
    setSelectedRegionId('');
    setSelectedCityId('');
    setSelectedCategory('all');
    setSelectedCondition('');
  };

  const CATEGORIES_OPTIONS = [
    { value: 'all', label: 'الكل' },
    { value: 'إلكترونيات', label: 'إلكترونيات' },
    { value: 'هواتف', label: 'هواتف' },
    { value: 'أجهزة منزلية', label: 'أجهزة منزلية' },
    { value: 'أثاث', label: 'أثاث' },
    { value: 'ملابس', label: 'ملابس' },
    { value: 'سيارات وإكسسوارات', label: 'سيارات وإكسسوارات' },
    { value: 'ألعاب', label: 'ألعاب' },
    { value: 'كتب', label: 'كتب' },
    { value: 'أخرى', label: 'أخرى' }
  ];

  const CONDITIONS: ListingCondition[] = ['جديد', 'شبه جديد', 'مستعمل بحالة جيدة', 'مستعمل', 'يحتاج صيانة'];

  const FilterPanel = () => (
    <div className={`space-y-4 p-4 sm:p-5 bg-white rounded-2xl border border-slate-100 shadow-sm ${direction === 'rtl' ? 'text-right' : 'text-left'}`} style={{ direction }}>
      <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-2">
        <button
          type="button"
          onClick={clearAllFilters}
          className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{language === 'ar' ? 'إعادة ضبط' : 'Reset'}</span>
        </button>
        <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-emerald-600" />
          <span>{language === 'ar' ? 'تصفية مخصصة' : 'Custom Filters'}</span>
        </span>
      </div>

      {/* Country selection (RTL check) */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-600 block">{t('search.filter.country')}</label>
        <select
          value={selectedCountryCode}
          onChange={(e) => setSelectedCountryCode(e.target.value)}
          className={`w-full text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3 transition-all outline-none ${direction === 'rtl' ? 'text-right' : 'text-left'}`}
        >
          <option value="">{language === 'ar' ? 'كل البلدان العربية' : 'All Arab Countries'}</option>
          {ARAB_COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Dependent Region selection */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-600 block">{t('search.filter.governorate')}</label>
        <select
          value={selectedRegionId}
          onChange={(e) => setSelectedRegionId(e.target.value)}
          disabled={!selectedCountryCode}
          className={`w-full text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3 transition-all outline-none disabled:opacity-50 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}
        >
          <option value="">{language === 'ar' ? 'كل المحافظات' : 'All Governorates'}</option>
          {regions.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Dependent City selection */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-600 block">{t('search.filter.city')}</label>
        <select
          value={selectedCityId}
          onChange={(e) => setSelectedCityId(e.target.value)}
          disabled={!selectedRegionId}
          className={`w-full text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3 transition-all outline-none disabled:opacity-50 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}
        >
          <option value="">{language === 'ar' ? 'كل المناطق' : 'All Cities'}</option>
          {cities.map(ct => (
            <option key={ct.id} value={ct.id}>{ct.name}</option>
          ))}
        </select>
      </div>

      {/* Category Selection */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-600 block">{t('search.filter.category')}</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className={`w-full text-xs bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3 transition-all outline-none ${direction === 'rtl' ? 'text-right' : 'text-left'}`}
        >
          {CATEGORIES_OPTIONS.map(co => (
            <option key={co.value} value={co.value}>
              {co.value === 'all' ? t('home.category.all') : translateCategory(co.value)}
            </option>
          ))}
        </select>
      </div>

      {/* Item Condition list selection */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-600 block">{t('add.label.condition')}</label>
        <div className={`flex flex-wrap gap-1.5 ${direction === 'rtl' ? 'justify-start' : 'justify-start'}`}>
          {CONDITIONS.map(cond => {
            const isSel = selectedCondition === cond;
            return (
              <button
                key={cond}
                type="button"
                onClick={() => setSelectedCondition(isSel ? '' : cond)}
                className={`text-[10px] font-semibold py-1.5 px-3.5 rounded-xl border transition-all ${
                  isSel
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cond}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Search inputs and controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Term Input */}
        <div className="relative flex-1" style={{ direction }}>
          <input
            type="text"
            placeholder={language === 'ar' ? "ابحث باسم الغرض أو الكلمة الدلالية..." : "Search by item name or keyword..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-2xl py-3 px-5 text-xs sm:text-sm text-slate-800 transition-all outline-none ${
              direction === 'rtl' ? 'text-right pr-11' : 'text-left pl-11'
            }`}
          />
          <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5 ${
            direction === 'rtl' ? 'right-4' : 'left-4'
          }`} />
        </div>

        {/* Mobile Filter Sheet Activator Button */}
        <button
          type="button"
          onClick={() => setShowMobileFilters(true)}
          className="sm:hidden flex items-center justify-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold py-3 px-5 rounded-2xl text-xs"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>
            {language === 'ar' ? 'تصفية' : 'Filter'} ({selectedCountryCode ? 1 : 0 + (selectedCategory !== 'all' ? 1 : 0) + (selectedCondition ? 1 : 0)})
          </span>
        </button>
      </div>

      {/* Main filter panel + Listings catalog grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 items-start">
        
        {/* Laptop / Desktop Filters */}
        <div className="hidden sm:block sm:col-span-1">
          <FilterPanel />
        </div>

        {/* Catalog Grid output cards */}
        <div className="sm:col-span-3">
          {loading ? (
            /* skeleton grids */
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((v) => (
                <div key={v} className="bg-slate-50 rounded-2xl h-60 animate-pulse" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            /* Empty state results */
            <div className="bg-slate-50/65 rounded-3xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
              <Search className="mx-auto h-12 w-12 text-slate-300 mb-2.5" />
              <p className="text-sm font-bold leading-normal text-slate-600">
                لا توجد نتائج مطابقة لبحثك
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                جرب تغيير تصنيفات البحث، أو إلغاء تحديد المحافظة أو كتابة مسمى عام كـ "هاتف" أو "لعبة".
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-5 rounded-xl shadow-sm transition-all"
              >
                مسح كل المرشحات
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((item) => {
                const isFav = favorites.includes(item.id);
                const isBoosted = isListingBoosted(item);
                return (
                  <motion.div
                    key={item.id}
                    className={`group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer text-right ${
                      isBoosted ? 'golden-glow-card' : ''
                    }`}
                    onClick={() => onSelectListing(item.id)}
                    whileHover={{ y: -3 }}
                  >
                    <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
                      <img
                        src={item.images[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500'}
                        alt=""
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500';
                        }}
                      />
                      
                      {/* Conditions tag */}
                      <span className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                        {translateCondition(item.condition)}
                      </span>

                      {/* Boost rating */}
                      {isBoosted && (
                        <span className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-lg flex items-center gap-0.5 shadow-sm">
                          <Sparkles className="h-2.5 w-2.5 text-yellow-200 animate-pulse" />
                          <span>{t('details.boost_active')}</span>
                        </span>
                      )}

                      {/* Favorite lock */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(item.id);
                        }}
                        className="absolute top-2 left-2 bg-white/95 backdrop-blur-md hover:bg-slate-100 text-slate-400 hover:text-rose-500 h-6.5 w-6.5 rounded-full flex items-center justify-center border border-slate-100 shadow-sm"
                      >
                        <span className={`h-4 w-4 ${isFav ? 'text-rose-500' : 'text-slate-400'}`}>❤</span>
                      </button>
                    </div>

                    <div className="p-3">
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                        {translateCategory(item.category)}
                      </span>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 mt-1 line-clamp-1 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                        {item.title}
                      </h3>
                      
                      <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 mt-1.5 mb-2.5">
                        <MapPin className="h-3 w-3 text-slate-300 dark:text-slate-600 font-medium" />
                        <span className="text-[10px] leading-tight truncate">{translateLocation(item.city) || translateLocation(item.governorate) || t('home.location_general')}، {translateLocation(item.country)}</span>
                      </div>

                      <div className="border-t border-slate-50 dark:border-slate-800/60 pt-2 flex items-center gap-1.5 flex-wrap text-start" style={{ direction }}>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{t('home.desired_with')}:</span>
                        <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 px-2 py-0.5 rounded-md truncate max-w-[150px] inline-block" style={{ direction: /[\u0600-\u06FF]/.test(item.desired_exchange) ? 'rtl' : 'ltr' }}>
                          {item.desired_exchange}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          {/* Infinite Scroll Loader Anchor */}
          <div ref={loaderRef} className="h-14 flex items-center justify-center mt-6">
            {loadingMore && (
              <div className="flex items-center gap-2 text-emerald-700 font-medium text-xs">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري تحميل المزيد من العروض...</span>
              </div>
            )}
            {!hasMore && listings.length > 0 && (
              <p className="text-xs text-slate-400">لقد وصلت لنهاية النتائج ✨</p>
            )}
          </div>
        </div>

      </div>

      {/* Mobile filters Sheet drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm sm:hidden flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setShowMobileFilters(false)}
                className="p-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="text-sm font-bold text-slate-800">تصفية البحث</h3>
            </div>
            
            <FilterPanel />

            <button
              type="button"
              onClick={() => setShowMobileFilters(false)}
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-2xl text-xs shadow-md mt-4"
            >
              عرض النتائج
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
