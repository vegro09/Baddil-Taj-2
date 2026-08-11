import { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  Search, 
  MapPin, 
  Sparkles, 
  Clock, 
  Tv, 
  PhoneCall, 
  Home, 
  Shirt, 
  Car, 
  Gamepad, 
  BookOpen, 
  LayoutGrid, 
  Heart,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Listing, isListingBoosted } from '../types';
import { dbService } from '../db/dbService';
import { motion } from 'motion/react';
import { useTranslation } from './LanguageContext';
import BoostCountdown from './BoostCountdown';

interface HomeFeedProps {
  onSelectListing: (id: string) => void;
  onNavigateToSearch: (category?: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

const CATEGORIES = [
  { name: 'الكل', labelKey: 'home.category.all', icon: LayoutGrid, color: 'bg-slate-100 text-slate-700' },
  { name: 'إلكترونيات', labelKey: 'home.category.electronics', icon: Tv, color: 'bg-sky-50 text-sky-700' },
  { name: 'هواتف', labelKey: 'home.category.phones', icon: PhoneCall, color: 'bg-emerald-50 text-emerald-700' },
  { name: 'ألعاب', labelKey: 'home.category.games', icon: Gamepad, color: 'bg-indigo-50 text-indigo-700' },
  { name: 'أثاث', labelKey: 'home.category.furniture', icon: Home, color: 'bg-amber-50 text-amber-700' },
  { name: 'ملابس', labelKey: 'home.category.clothes', icon: Shirt, color: 'bg-rose-50 text-rose-700' },
  { name: 'سيارات وإكسسوارات', labelKey: 'home.category.cars', icon: Car, color: 'bg-purple-50 text-purple-700' },
  { name: 'كتب', labelKey: 'home.category.books', icon: BookOpen, color: 'bg-teal-50 text-teal-700' }
] as const;

export default function HomeFeed({
  onSelectListing,
  onNavigateToSearch,
  favorites,
  onToggleFavorite
}: HomeFeedProps) {
  const { t, language, direction, translateCategory, translateCondition, translateLocation } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>('الكل');
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchVal, setSearchVal] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function fetchInitialListings() {
      setLoading(true);
      setHasMore(true);
      try {
        const data = await dbService.getListings({
          category: activeCategory === 'الكل' ? undefined : activeCategory,
          limitCount: 10
        });
        setListings(data);
        if (data.length < 10) {
          setHasMore(false);
        }
      } catch (err) {
        console.error("Listings load fail", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInitialListings();
  }, [activeCategory]);

  const loadMoreListings = async () => {
    if (loadingMore || !hasMore || listings.length === 0) return;
    setLoadingMore(true);
    try {
      const lastItem = listings[listings.length - 1];
      const data = await dbService.getListings({
        category: activeCategory === 'الكل' ? undefined : activeCategory,
        limitCount: 10,
        lastVisibleId: lastItem.id
      });
      if (data.length < 10) {
        setHasMore(false);
      }
      setListings(prev => [...prev, ...data]);
      console.log(`[BADDIL Lazy Loading] Loaded next 10 items. Total listings: ${listings.length + data.length}`);
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
  }, [hasMore, loading, listings, activeCategory]);

  const handleSearchTrigger = (e: FormEvent) => {
    e.preventDefault();
    onNavigateToSearch(activeCategory === 'الكل' ? undefined : activeCategory);
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Search Widget */}
      <form onSubmit={handleSearchTrigger} className="relative max-w-lg mx-auto mt-2">
        <input
          type="text"
          placeholder={t('home.search_placeholder')}
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          className="w-full text-right bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 rounded-2xl py-3.5 px-5 pr-12 text-sm text-slate-800 transition-all outline-none"
        />
        <button 
          type="submit" 
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 cursor-pointer"
        >
          <Search className="h-5 w-5" />
        </button>
      </form>

      {/* Categories Horizontal Carousel list */}
      <div>
        <div className="flex items-center justify-between mb-3.5 px-1">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <span>{t('home.browse_categories')}</span>
          </h2>
          <button 
            type="button"
            onClick={() => onNavigateToSearch()}
            className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-0.5"
          >
            <span>{t('home.all_ads_btn')}</span>
            {direction === 'rtl' ? (
              <ChevronLeft className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        </div>
        
        {/* Categories Scroller */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
          {CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            const isSel = activeCategory === cat.name;

            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveCategory(cat.name)}
                className={`snap-start flex flex-col items-center gap-2 py-2.5 px-5 rounded-2xl border transition-all duration-300 min-w-[90px] ${
                  isSel
                    ? 'bg-emerald-700 border-emerald-700 text-white shadow-md shadow-emerald-700/10'
                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-xl transition-colors ${
                  isSel ? 'bg-white/20' : cat.color
                }`}>
                  <CatIcon className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold leading-none">{t(cat.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Main Listings Container */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 mb-4 px-1 flex items-center gap-1.5">
          <span>{t('home.latest_title')}</span>
        </h2>

        {loading ? (
          /* Visual Skeleton Loader Skeletons */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((id) => (
              <div key={id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 animate-pulse space-y-3">
                <div className="bg-slate-200 rounded-xl h-36 w-full" />
                <div className="bg-slate-200 rounded-lg h-4 w-3/4" />
                <div className="bg-slate-200 rounded-lg h-3 w-1/2" />
                <div className="bg-slate-200 rounded-lg h-3 w-5/6" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          /* Empty Active state display */
          <div className="bg-slate-50/60 rounded-3xl border border-dashed border-slate-200 py-12 text-center text-slate-500">
            <LayoutGrid className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-sm font-bold leading-normal text-slate-600">
              {t('home.empty_listings')}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {t('home.empty_sub')}
            </p>
          </div>
        ) : (
          /* Actual grid rendering of listings cards */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {listings.filter((_, idx) => idx !== 5).map((item, idx) => {
              const isFav = favorites.includes(item.id);
              const isBoosted = isListingBoosted(item);

              return (
                <motion.div
                  key={item.id}
                  className={`group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative cursor-pointer ${
                    isBoosted ? 'golden-glow-card' : ''
                  }`}
                  onClick={() => onSelectListing(item.id)}
                  whileHover={{ y: -4 }}
                >
                  {/* Image and Header Badges */}
                  <div className="relative aspect-[4/5] bg-slate-50 overflow-hidden">
                    <img
                      src={item.images[0] || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500'}
                      alt=""
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                      loading={idx < 4 ? "eager" : "lazy"}
                      fetchPriority={idx < 4 ? "high" : "auto"}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500';
                      }}
                    />

                    {/* Condition Badge */}
                    <span className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                      {translateCondition(item.condition)}
                    </span>

                    {/* Funding / Boosted Badge */}
                    {isBoosted && (
                      <span className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-lg flex items-center gap-0.5 shadow-sm">
                        <Sparkles className="h-2.5 w-2.5 text-yellow-200 animate-pulse" />
                        <span>{t('details.boost_active')}</span>
                      </span>
                    )}
                  </div>

                  {/* Body Info */}
                  <div className="p-3 text-start space-y-1">
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                      {translateCategory(item.category)}
                    </span>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 mt-1 line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </h3>
                    
                    {/* Location detail */}
                    <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                      <MapPin className="h-3 w-3 shrink-0 text-slate-300 dark:text-slate-600" />
                      <span className="text-[10px] leading-tight line-clamp-1">{translateLocation(item.city) || translateLocation(item.governorate) || t('home.location_general')}، {translateLocation(item.country)}</span>
                    </div>



                    <div className="border-t border-slate-50 dark:border-slate-800/60 mt-1.5 pt-1.5 flex items-center gap-1.5 flex-wrap text-start" style={{ direction }}>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{t('home.desired_with')}:</span>
                      <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/30 px-2 py-0.5 rounded-md truncate max-w-[140px] inline-block" style={{ direction: /[\u0600-\u06FF]/.test(item.desired_exchange) ? 'rtl' : 'ltr' }}>
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
  );
}
