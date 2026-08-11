import { useState, useEffect } from 'react';
import { Heart, X, Trash2, MapPin, Sparkles, Loader2 } from 'lucide-react';
import { Listing } from '../types';
import { dbService } from '../db/dbService';
import { motion } from 'motion/react';
import { useTranslation } from './LanguageContext';

interface FavoritesPageProps {
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSelectListing: (id: string) => void;
  onClose: () => void;
}

export default function FavoritesPage({
  favorites,
  onToggleFavorite,
  onSelectListing,
  onClose
}: FavoritesPageProps) {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, language, direction, translateCategory, translateCondition, translateLocation } = useTranslation();

  useEffect(() => {
    async function fetchFavorites() {
      setLoading(true);
      try {
        const fetched: Listing[] = [];
        for (const fid of favorites) {
          const detail = await dbService.getListingDetails(fid);
          if (detail) fetched.push(detail);
        }
        setItems(fetched);
      } catch (err) {
        console.error("Fetch favorites error", err);
      } finally {
        setLoading(false);
      }
    }
    fetchFavorites();
  }, [favorites]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 animate-pulse">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600 dark:text-emerald-400 mb-4" />
        <p className="text-sm">{language === 'ar' ? 'جاري مراجعة ممتلكاتك المفضلة...' : 'Retrieving your favorites...'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-24 text-start">
      
      <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3 flex items-center justify-between select-none" dir={direction}>
        {/* Title */}
        <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
          <span>{t('fav.title')}</span>
        </h2>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-1.5 px-3.5 rounded-xl cursor-pointer transition-all duration-200"
        >
          {language === 'ar' ? 'إغلاق' : 'Close'}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-slate-50/60 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-850 py-16 text-center text-slate-500 dark:text-slate-400">
          <Heart className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-normal">
            {t('fav.empty')}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
            {t('fav.empty_sub')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <motion.div
              key={item.id}
              onClick={() => onSelectListing(item.id)}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3 hover:border-emerald-100 dark:hover:border-emerald-900/55 transition-all duration-200 flex items-center justify-between cursor-pointer shadow-sm relative overflow-hidden"
              whileHover={{ y: -2 }}
            >
              
               {/* Media preview and conditions */}
              <div className="flex items-center gap-3.5">
                <div className="h-14 w-18 bg-slate-50 dark:bg-slate-800/80 rounded-xl overflow-hidden shadow-sm shrink-0">
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
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/45 px-2 py-0.5 rounded-md">
                    {translateCategory(item.category)} · {translateCondition(item.condition)}
                  </span>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 line-clamp-1 truncate mt-0.5">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    <MapPin className="h-3 w-3 text-slate-300 dark:text-slate-600" />
                    <span>{translateLocation(item.city) || translateLocation(item.governorate) || t('home.location_general')}، {translateLocation(item.country)}</span>
                  </div>
                </div>
              </div>

              {/* Action Delete hearts triggers */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(item.id);
                }}
                className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-100 dark:border-slate-800/80 rounded-xl transition-all cursor-pointer shadow-sm"
                title={language === 'ar' ? 'إزالة من المفضلة' : 'Remove from Favorites'}
              >
                <Trash2 className="h-4 w-4" />
              </button>

            </motion.div>
          ))}
        </div>
      )}

    </div>
  );
}
