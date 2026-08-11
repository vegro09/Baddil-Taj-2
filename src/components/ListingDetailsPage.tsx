import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronRight, 
  MapPin, 
  Heart, 
  Share2, 
  MessageSquare, 
  Sparkles, 
  ShieldCheck, 
  Eye, 
  Trash2, 
  Edit, 
  Star, 
  Check, 
  Loader2, 
  Play, 
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X
} from 'lucide-react';
import { Listing, Profile, ListingBoost, formatUserCode, isListingBoosted } from '../types';
import BoostCountdown from './BoostCountdown';
import { dbService } from '../db/dbService';
import { useTranslation } from './LanguageContext';
import { motion, AnimatePresence } from 'motion/react';

interface ListingDetailsPageProps {
  listingId: string;
  onBack: () => void;
  onStartChat: (listingId: string, ownerId: string, chatId?: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onEditListing?: (id: string) => void;
}

export default function ListingDetailsPage({
  listingId,
  onBack,
  onStartChat,
  favorites,
  onToggleFavorite,
  onEditListing
}: ListingDetailsPageProps) {
  const { t, language, direction, translateCategory, translateCondition, translateLocation } = useTranslation();
  const [listing, setListing] = useState<Listing | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingChat, setOpeningChat] = useState(false);
  const [chatError, setChatError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Boost States
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [boostRecord, setBoostRecord] = useState<ListingBoost | null>(null);
  const [activePromotions, setActivePromotions] = useState<ListingBoost[]>([]);
  const [adWatchingState, setAdWatchingState] = useState<'idle' | 'watching_1' | 'watching_2' | 'watching_3' | 'completed_one' | 'completed_two'>('idle');
  const [rewardedAdsRequired, setRewardedAdsRequired] = useState(3);
  const [adSeconds, setAdSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Lightbox Zoom/Pan States
  const [showLightbox, setShowLightbox] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const handleChatClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (openingChat) return;
    if (!listing) return;

    if (!currentUserId) {
      // User is not logged in, delegate to onStartChat which redirects to login page
      onStartChat(listing.id, listing.owner_id);
      return;
    }

    setOpeningChat(true);
    setChatError('');

    try {
      const cid = await dbService.startOrGetChat(listing.id, listing.owner_id);
      if (cid) {
        onStartChat(listing.id, listing.owner_id, cid);
      } else {
        throw new Error("Unable to create/retrieve conversation.");
      }
    } catch (err: any) {
      const errMsg = err?.message || "Failed to start a conversation";
      console.error("[Chat Opening Failure Log]", {
        currentUserId,
        listingId: listing.id,
        ownerId: listing.owner_id,
        error: errMsg
      });
      setChatError(language === 'ar' ? 'فشل فتح المحادثة. الرجاء المحاولة لاحقاً.' : 'Failed to open chat. Please try again later.');
    } finally {
      setOpeningChat(false);
    }
  };

  // Load details
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const uid = await dbService.getCurrentUserId();
        setCurrentUserId(uid);

        const data = await dbService.getListingDetails(listingId);
        if (data) {
          setListing(data);
          const profile = await dbService.getUserProfile(data.owner_id);
          setOwnerProfile(profile);

          const boost = await dbService.getListingBoost(listingId);
          setBoostRecord(boost);

          const boosts = await dbService.getListingBoosts(listingId);
          const activePromos = boosts.filter(b => b.status === 'active' && b.boosted_until && new Date(b.boosted_until).getTime() > Date.now());
          setActivePromotions(activePromos);

          try {
            const settings = await dbService.queryAdminSettings();
            if (settings && settings.rewarded_ads_required) {
              setRewardedAdsRequired(settings.rewarded_ads_required);
            }
          } catch (e) {
            console.error(e);
          }
        }
      } catch (err) {
        console.error("Fetch listing details err", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [listingId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 animate-pulse">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-sm">جاري تحميل تفاصيل السلعة...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-sm font-bold text-slate-600">هذا الإعلان غير متوفر</p>
        <button
          onClick={onBack}
          className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-semibold"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  const isOwnerListing = listing.owner_id === currentUserId;
  const isFav = favorites.includes(listing.id);

  // Handle Share copy
  const triggerShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('تم نسخ رابط الإعلان إلى الحافظة للمشاركة!');
  };

  // Launch simulated ad watcher
  const triggerRewardedAdWatch = (adIndex: 1 | 2 | 3) => {
    setAdWatchingState(adIndex === 1 ? 'watching_1' : adIndex === 2 ? 'watching_2' : 'watching_3');
    setAdSeconds(4); // 4-second mock rewarded ad

    const timer = setInterval(() => {
      setAdSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          completeRewardToken(adIndex);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const openBoostModal = async () => {
    if (!listing) return;
    setErrorMessage('');
    try {
      try {
        const settings = await dbService.queryAdminSettings();
        if (settings && settings.rewarded_ads_required) {
          setRewardedAdsRequired(settings.rewarded_ads_required);
        }
      } catch (e){}

      const liveBoosts = await dbService.getListingBoosts(listing.id);
      const activePromos = liveBoosts.filter(b => b.status === 'active' && b.boosted_until && new Date(b.boosted_until).getTime() > Date.now());
      setActivePromotions(activePromos);
      const pending = liveBoosts.find(b => b.status === 'pending');
      setBoostRecord(pending || null);
    } catch (e) {
      console.error(e);
    }
    setShowBoostModal(true);
  };

  const completeRewardToken = async (adIndex: 1 | 2 | 3) => {
    try {
      const result = await dbService.incrementAdWatchCount(listing!.id);
      
      // Fetch latest states
      const refreshedListing = await dbService.getListingDetails(listing!.id);
      if (refreshedListing) setListing(refreshedListing);

      const refreshedBoost = await dbService.getListingBoost(listing!.id);
      setBoostRecord(refreshedBoost);

      const liveBoosts = await dbService.getListingBoosts(listing!.id);
      const activePromos = liveBoosts.filter(b => b.status === 'active' && b.boosted_until && new Date(b.boosted_until).getTime() > Date.now());
      setActivePromotions(activePromos);

      if (adIndex < rewardedAdsRequired) {
        setAdWatchingState(adIndex === 1 ? 'completed_one' : 'completed_two');
      } else {
        setAdWatchingState('idle');
        alert(`تمت مشاهدة الإعلان الثالث بنجاح! تم تمويل وترويج إعلانك لـ 48 ساعة.`);
        setShowBoostModal(false);
      }
    } catch (err: any) {
      const msg = err?.message || "حدث خطأ أثناء تشغيل الإعلان، حاول مرة أخرى";
      setErrorMessage(msg);
      setAdWatchingState('idle');
    }
  };

  // Handle Delete listing
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await dbService.deleteOrDeactivateListing(listing.id);
      onBack();
    } catch (e) {
      setDeleting(false);
      alert('فشل حذف الإعلان، يرجى إعادة المحاولة.');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24 text-right">
      
      {/* Back navigation header line */}
      <div className="flex items-center justify-between pb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-transparent dark:border-slate-700/50 py-1.5 px-4 rounded-xl text-xs font-semibold cursor-pointer transition-all"
        >
          <span>العودة</span>
          <ChevronRight className="h-4 w-4" />
        </button>

        {listing.status === 'exchanged' && (
          <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-transparent dark:border-amber-900/30 text-[10px] font-bold px-3 py-1 rounded-lg">
            تم إتمام التبادل لهذا الإعلان
          </span>
        )}
      </div>

      {/* Main product gallery carousel */}
      {(() => {
        const mediaItems = [
          ...(listing.images || []).map(url => ({ type: 'image' as const, url })),
          ...(listing.videos || []).map(url => ({ type: 'video' as const, url }))
        ];
        const activeMedia = mediaItems[activeImageIdx] || { type: 'image' as const, url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800' };

        const handleDragEnd = (event: any, info: any) => {
          const swipeThreshold = 55;
          // Dragging left (negative index offset) or right
          if (info.offset.x < -swipeThreshold) {
            // Swipe Left (advance to next attachment)
            if (activeImageIdx < mediaItems.length - 1) {
              setActiveImageIdx(activeImageIdx + 1);
            }
          } else if (info.offset.x > swipeThreshold) {
            // Swipe Right (return to previous attachment)
            if (activeImageIdx > 0) {
              setActiveImageIdx(activeImageIdx - 1);
            }
          }
        };

        const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
          if (zoomScale <= 1) return;
          setIsPanning(true);
          const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
          const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
          setPanStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
        };

        const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
          if (!isPanning || zoomScale <= 1) return;
          const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
          const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
          setPanOffset({
            x: clientX - panStart.x,
            y: clientY - panStart.y
          });
        };

        const handleEnd = () => {
          setIsPanning(false);
        };

        const handleWheel = (e: React.WheelEvent) => {
          const delta = e.deltaY < 0 ? 0.25 : -0.25;
          setZoomScale(prev => {
            const next = Math.min(4, Math.max(1, prev + delta));
            if (next === 1) {
              setPanOffset({ x: 0, y: 0 });
            }
            return next;
          });
        };

        const handleDoubleClick = () => {
          if (zoomScale > 1) {
            setZoomScale(1);
            setPanOffset({ x: 0, y: 0 });
          } else {
            setZoomScale(2.5);
          }
        };

        return (
          <div className="flex flex-col w-full gap-4 items-center">
            {/* Main Interactive Slider Showcase Container */}
            <div className="relative w-full overflow-hidden bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl flex items-center justify-center select-none touch-pan-y border border-slate-100/50 dark:border-slate-800/80 shadow-sm group">
              <motion.div
                key={activeImageIdx}
                initial={{ opacity: 0.85, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0.85, x: -20 }}
                transition={{ duration: 0.25 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={handleDragEnd}
                onTap={() => {
                  if (activeMedia.type === 'image') {
                    setZoomScale(1);
                    setPanOffset({ x: 0, y: 0 });
                    setShowLightbox(true);
                  }
                }}
                className={`w-full h-full flex items-center justify-center py-2 ${activeMedia.type === 'image' ? 'cursor-zoom-in' : 'cursor-grab active:cursor-grabbing'}`}
              >
                {activeMedia.type === 'image' ? (
                  <img
                    src={activeMedia.url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800'}
                    alt=""
                    className="max-w-full w-auto h-auto max-h-[80vh] rounded-2xl shadow-sm block mx-auto pointer-events-none"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800';
                    }}
                  />
                ) : (activeMedia.url.includes('youtube.com') || activeMedia.url.includes('youtu.be') || activeMedia.url.includes('embed')) ? (
                  <div className="w-full max-w-full h-auto aspect-video rounded-2xl overflow-hidden relative">
                    <iframe
                      src={activeMedia.url}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full rounded-2xl shadow-sm mx-auto block"
                    />
                  </div>
                ) : (
                  <video
                    src={activeMedia.url}
                    controls
                    className="max-w-full w-auto h-auto max-h-[80vh] rounded-2xl shadow-sm mx-auto block"
                    playsInline
                  />
                )}
              </motion.div>

              {/* Prev / Next Small buttons (Helpful on desktop) */}
              {mediaItems.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => activeImageIdx > 0 && setActiveImageIdx(activeImageIdx - 1)}
                    disabled={activeImageIdx === 0}
                    className="absolute left-3 bg-white/85 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 p-1.5 rounded-full shadow hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all z-20 border border-transparent dark:border-slate-700"
                  >
                    <ChevronRight className="h-5 w-5 transform rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => activeImageIdx < mediaItems.length - 1 && setActiveImageIdx(activeImageIdx + 1)}
                    disabled={activeImageIdx === mediaItems.length - 1}
                    className="absolute right-3 bg-white/85 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 p-1.5 rounded-full shadow hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all z-20 border border-transparent dark:border-slate-700"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Zoom Action Shortcut Overlay Button */}
              {activeMedia.type === 'image' && (
                <button
                  type="button"
                  onClick={() => {
                    setZoomScale(1);
                    setPanOffset({ x: 0, y: 0 });
                    setShowLightbox(true);
                  }}
                  className="absolute bottom-3 left-3 bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-100 dark:border-slate-700/85 p-2 rounded-xl shadow-md cursor-pointer z-10 flex items-center gap-1.5 text-[10px] font-bold transition-all hover:scale-105"
                >
                  <ZoomIn className="h-4 w-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                  <span>{language === 'ar' ? 'تكبير وفحص السلعة' : 'Zoom & Inspect'}</span>
                </button>
              )}

              {isListingBoosted(listing) && (
                <span className="absolute top-2.5 right-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black text-[10px] py-1 px-3 rounded-lg flex items-center gap-1 shadow-md z-10">
                  <Sparkles className="h-3 w-3 text-white animate-spin" />
                  <span>إعلان ممول</span>
                </span>
              )}

              {/* Favorites shortcut toggle */}
              {!isOwnerListing && (
                <button
                  type="button"
                  onClick={() => onToggleFavorite(listing.id)}
                  className="absolute top-2.5 left-2.5 bg-white/95 dark:bg-slate-800/95 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 border border-slate-100 dark:border-slate-700/80 p-2 rounded-xl shadow-sm cursor-pointer z-10"
                >
                  <Heart className={`h-4.5 w-4.5 ${isFav ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-400'}`} />
                </button>
              )}

              {/* Dot markers at bottom-center of image frame */}
              {mediaItems.length > 1 && (
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex items-center gap-1.5 bg-black/35 px-2.5 py-1 rounded-full z-10" dir="ltr">
                  {mediaItems.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-350 ${
                        activeImageIdx === i ? 'w-3 bg-white' : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbs selection strip - Placed UNDERSIDE */}
            {mediaItems.length > 1 && (
              <div className="flex gap-2.5 p-2 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100/80 dark:border-slate-800/80 rounded-2xl w-full overflow-x-auto justify-center">
                {mediaItems.map((item, i) => (
                  <button
                    type="button"
                    key={item.url + '-' + i}
                    onClick={() => setActiveImageIdx(i)}
                    className={`h-11 w-15 rounded-xl overflow-hidden border-2 transition-all shrink-0 relative ${
                      activeImageIdx === i ? 'border-emerald-600 scale-105 shadow-sm shadow-emerald-600/15' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-750'
                    }`}
                  >
                    {item.type === 'image' ? (
                      <img 
                        src={item.url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'} 
                        alt="" 
                        className="w-full h-full object-cover pointer-events-none" 
                        referrerPolicy="no-referrer" 
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-950 relative flex items-center justify-center">
                        <video src={item.url} className="w-full h-full object-cover opacity-60" muted playsInline />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="h-4.5 w-4.5 text-white drop-shadow fill-white" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Lightbox / Image Zoom Portal Modal */}
            {showLightbox && createPortal(
              <div 
                className="fixed inset-0 bg-slate-950/98 backdrop-blur-md z-[200] flex flex-col justify-between p-4 overflow-hidden select-none"
                style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
              >
                {/* Header Bar */}
                <div className="flex items-center justify-between w-full text-white pb-3 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLightbox(false);
                        setZoomScale(1);
                        setPanOffset({ x: 0, y: 0 });
                      }}
                      className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition-all cursor-pointer"
                      title={language === 'ar' ? 'إغلاق' : 'Close'}
                    >
                      <X className="h-5 w-5" />
                    </button>
                    <span className="text-xs font-bold text-slate-400">
                      {language === 'ar' ? 'معاينة وفحص السلعة' : 'Inspect Product'}
                    </span>
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setZoomScale(prev => Math.min(4, prev + 0.5))}
                      className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                      title={language === 'ar' ? 'تكبير' : 'Zoom In'}
                    >
                      <ZoomIn className="h-4.5 w-4.5" />
                    </button>
                    <span className="text-xs font-mono font-bold px-2 text-slate-300 min-w-[40px] text-center">
                      {Math.round(zoomScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setZoomScale(prev => {
                          const next = Math.max(1, prev - 0.5);
                          if (next === 1) setPanOffset({ x: 0, y: 0 });
                          return next;
                        });
                      }}
                      className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                      title={language === 'ar' ? 'تصغير' : 'Zoom Out'}
                    >
                      <ZoomOut className="h-4.5 w-4.5" />
                    </button>
                    <div className="w-px h-5 bg-slate-800 mx-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setZoomScale(1);
                        setPanOffset({ x: 0, y: 0 });
                      }}
                      className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                      title={language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                    >
                      <RotateCcw className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>

                {/* Interactive Zoom Canvas/Stage */}
                <div 
                  className="flex-1 w-full flex items-center justify-center overflow-hidden relative touch-none cursor-grab active:cursor-grabbing"
                  onMouseDown={handleStart}
                  onMouseMove={handleMove}
                  onMouseUp={handleEnd}
                  onMouseLeave={handleEnd}
                  onTouchStart={handleStart}
                  onTouchMove={handleMove}
                  onTouchEnd={handleEnd}
                  onWheel={handleWheel}
                  onDoubleClick={handleDoubleClick}
                >
                  <img
                    src={mediaItems[activeImageIdx]?.url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800'}
                    alt=""
                    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl transition-transform select-none pointer-events-none"
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                      transition: isPanning ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Footer Instruction Text */}
                <div className="text-center text-[10px] text-slate-500 pb-2">
                  {language === 'ar' ? (
                    <span>
                      💡 اسحب للاستكشاف عند التكبير · انقر مرتين للتكبير السريع · استخدم عجلة الماوس أو الأزرار للتحكم
                    </span>
                  ) : (
                    <span>
                      💡 Drag to explore when zoomed · Double-click to quick zoom · Use mouse wheel or controls
                    </span>
                  )}
                </div>
              </div>,
              document.body
            )}
          </div>
        );
      })()}

      {/* Core variables and desired exchange callouts */}
      <div className="space-y-4">
        
        {/* Category condition badges & action buttons */}
        <div className="flex justify-between items-center">
          <div className="flex gap-1.5">
            <span className="bg-emerald-50 dark:bg-emerald-950/45 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-md border border-transparent dark:border-emerald-900/30">
              {translateCategory(listing.category)}
            </span>
            <span className="bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-md border border-transparent dark:border-slate-700/60">
              {language === 'ar' ? `حالة ${translateCondition(listing.condition)}` : `${translateCondition(listing.condition)} Condition`}
            </span>
          </div>

          <button
            onClick={triggerShareLink}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 bg-white dark:bg-slate-800/40 cursor-pointer transition-all"
            title="مشاركة"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {/* Product Listing title */}
        <h1 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">
          {listing.title}
        </h1>

        {/* DESIRED EXCHANGE Callout box */}
        <div className={`bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 rounded-2xl p-4 flex flex-col justify-start space-y-1 ${direction === 'rtl' ? 'text-right' : 'text-left'}`} style={{ direction }}>
          <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 leading-none">
            {language === 'ar' ? 'يرغب صاحب الإعلان بتبديل السلعة بـ:' : 'The advertiser wants to exchange the item for:'}
          </span>
          <p className="text-sm font-black text-teal-900 dark:text-teal-200 leading-relaxed">
            {listing.desired_exchange}
          </p>
          {listing.exchange_preferences && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal border-t border-teal-100/50 dark:border-teal-900/20 mt-2 pt-2">
              <span className="font-bold text-slate-600 dark:text-slate-300 block">
                {language === 'ar' ? 'شروط التبادل المرفقة:' : 'Attached Exchange Conditions:'}
              </span>
              {listing.exchange_preferences}
            </p>
          )}
        </div>

        {/* Product description text content */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300">وصف وتفاصيل الغرض</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line text-right">
            {listing.description}
          </p>
        </div>

        {/* Location references */}
        <div className="flex items-center gap-1.5 p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
          <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {language === 'ar' ? 'موقع السلعة:' : 'Item Location:'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {listing.city ? `${translateLocation(listing.city)}، ` : ''}
            {listing.governorate ? `${translateLocation(listing.governorate)}، ` : ''}
            {translateLocation(listing.country)}
          </span>
        </div>

        {/* Owner details section card */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-xl flex items-center justify-center overflow-hidden border border-emerald-100 dark:border-emerald-900/30 shadow-sm shrink-0">
              {ownerProfile?.profile_image_url ? (
                <img src={ownerProfile.profile_image_url} alt="profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xs font-bold text-white font-sans">
                  {ownerProfile?.display_name?.slice(0, 2) || 'م'}
                </span>
              )}
            </div>

            <div className="flex flex-col text-start">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 leading-snug">
                {ownerProfile?.display_name || 'صاحب الإعلان'}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-none">
                {ownerProfile?.city ? `${translateLocation(ownerProfile.city)}، ` : ''}
                {ownerProfile?.governorate ? `${translateLocation(ownerProfile.governorate)}، ` : ''}
                {translateLocation(ownerProfile?.country || listing.country || 'الأردن')} · <span className="font-mono text-slate-500 dark:text-slate-400 font-medium">{formatUserCode(ownerProfile?.username, ownerProfile?.id)}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-0.5 text-amber-500">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              <span className="text-xs font-semibold font-mono">{ownerProfile?.average_rating || '5.0'}</span>
            </div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500">({ownerProfile?.ratings_count || '0'} تقييم)</span>
          </div>
        </div>

        {/* Actions panel */}
        <div className="pt-4 flex flex-col gap-2.5 w-full">
          
          {/* Always show the chat/message button as requested */}
          {!isOwnerListing && (
            <div className="w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={handleChatClick}
                disabled={listing.status === 'exchanged' || openingChat}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 dark:disabled:bg-slate-850 disabled:text-slate-500 dark:disabled:text-slate-500 text-white font-bold py-3.5 px-6 rounded-2xl text-xs shadow-md shadow-emerald-700/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {openingChat ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <MessageSquare className="h-4.5 w-4.5" />
                )}
                <span>
                  {openingChat ? (
                    language === 'ar' ? 'جارٍ فتح المحادثة…' : 'Opening chat…'
                  ) : (
                    language === 'ar' ? 'ابدأ المقايضة والمحادثة الفورية' : 'Start Swap & Chat'
                  )}
                </span>
              </button>

              {chatError && (
                <div id="chat-error-message" className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{chatError}</span>
                </div>
              )}
            </div>
          )}

          {/* Listing owned by self: Boost, edit, delete option triggers */}
          {isOwnerListing && (
            <div className="w-full flex flex-col gap-2">
              
              {/* Boost Button */}
              <button
                type="button"
                onClick={openBoostModal}
                disabled={listing.status === 'exchanged'}
                className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-white font-bold py-3 px-5 rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-slate-900/10 border border-transparent dark:border-slate-700"
              >
                <Sparkles className="h-4.5 w-4.5 text-amber-400 animate-spin" />
                {activePromotions.length >= 1 ? (
                  <span>لقد قمت بتمويل هذا الإعلان بالفعل (نشط حالياً)</span>
                ) : (
                  <span>تمويل الإعلان مجاناً (مشاهدة ٣ إعلانات)</span>
                )}
              </button>

              {/* Show countdowns private to listing owner for each active promotion */}
              {isOwnerListing && activePromotions.length > 0 && (
                <div className="py-3 px-4 bg-amber-50/10 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/20 rounded-2xl flex flex-col gap-2">
                  <div className="text-[10px] text-amber-800 dark:text-amber-400 font-bold flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>الترويج المميز النشط للإعلان</span>
                  </div>
                  <div className="space-y-1.5">
                    {activePromotions.map((promo, idx) => (
                      <div key={promo.id} className="flex justify-between items-center bg-white dark:bg-slate-900/80 border border-amber-100 dark:border-amber-900/25 p-2 rounded-xl shadow-sm">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium font-sans">وقت انتهاء التمويل الحالي</span>
                        <BoostCountdown boostedUntil={promo.boosted_until} ownerId={listing.owner_id} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {onEditListing && (
                  <button
                    onClick={() => onEditListing(listing.id)}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Edit className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span>تعديل الإعلان</span>
                  </button>
                )}

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-800 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <Trash2 className="h-4 w-4 text-rose-600" />
                  <span>حذف الإعلان</span>
                </button>
              </div>

            </div>
          )}

        </div>



      </div>

      {/* Delete Confirmation popup overlay Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800/80 rounded-3xl max-w-sm w-full p-5 space-y-4 text-right">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">هل أنت متأكد من حذف هذا الإعلان؟</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
              سيتم التراجع وإزالة الغرض بالكامل من منصة بَدِل بصورة نهائية ولا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2 rounded-xl text-xs cursor-pointer transition-all"
              >
                تراجع
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                {deleting ? 'جاري الحذف...' : 'حذف نهائياً'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Boost Modal details watch simulator matching system guidelines */}
      {showBoostModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800/80 rounded-3xl max-w-sm w-full p-5 space-y-4 text-right relative overflow-hidden">
            
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 animate-spin" />
              <span>تمويل الإعلان مجاناً</span>
            </h3>

            {adWatchingState.startsWith('watching_') ? (
              /* Simulated active video ad player matching security directives */
              <div className="aspect-video bg-black rounded-2xl flex flex-col items-center justify-center text-white relative p-4 overflow-hidden">
                <div className="absolute inset-0 bg-slate-900/20 blur animate-pulse" />
                <Play className="h-10 w-10 text-teal-400 mb-2 animate-ping" />
                <span className="text-xs font-bold font-sans">جاري تشغيل الإعلان الترويجي...</span>
                <span className="bg-slate-800 text-white font-mono text-[10px] py-1 px-3 rounded-xl absolute top-3 left-3">
                  متبقي {adSeconds} ثانية
                </span>
                <span className="absolute bottom-3 right-3 text-[9px] text-slate-500">من فضلك لا تغلق الإعلان قبل الاكتمال لضمان الاحتساب</span>
              </div>
            ) : (
              /* Boost explanations and progress lists */
              <div className="space-y-3.5">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  تمويل الإعلانات مجاني بالكامل! يمكنك تفعيل تمويل واحد نشط للإعلان. شاهد <span className="font-bold text-slate-900 dark:text-slate-200">{rewardedAdsRequired} إعلانات فيديو قصيرة</span> ليرتفع إعلانك في أول تغذية البحث ويتصدر التطبيق لمدة <span className="font-bold text-slate-900 dark:text-slate-200">يومين كاملين (48 ساعة)</span>.
                </p>

                {errorMessage && (
                  <p className="text-xs text-rose-500 font-semibold">{errorMessage}</p>
                )}

                {activePromotions.length >= 1 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-center text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/35 rounded-xl py-3 px-3.5 leading-snug">
                      هذا الإعلان مروج بالفعل حالياً ويظهر في أعلى نتائج البحث.
                      <br />
                      <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 block mt-1">This ad is already boosted.</span>
                    </p>
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block">متبقي على انتهاء التمويل:</span>
                      {activePromotions.map((promo, idx) => (
                        <div key={promo.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-2 rounded-xl">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium font-sans">الترويج النشط</span>
                          <BoostCountdown boostedUntil={promo.boosted_until} ownerId={listing.owner_id} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Counter displays */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">معدل المشاهدة الحالي:</span>
                      <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-3 py-1 rounded-lg">
                        {(boostRecord && boostRecord.status === 'pending') ? boostRecord.ads_watched_count : 0} / {rewardedAdsRequired}
                      </span>
                    </div>

                    {/* Progress bar state */}
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden block">
                      <div 
                        className="h-full bg-emerald-600 transition-all duration-300" 
                        style={{ width: `${(((boostRecord && boostRecord.status === 'pending') ? boostRecord.ads_watched_count : 0) / rewardedAdsRequired) * 100}%` }}
                      />
                    </div>

                    {/* Instructions or watch triggers */}
                    {(!boostRecord || boostRecord.status !== 'pending' || boostRecord.ads_watched_count === 0) && (
                      <button
                        onClick={() => triggerRewardedAdWatch(1)}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl text-xs cursor-pointer shadow-sm text-center"
                      >
                        شاهد الإعلان الأول (0/{rewardedAdsRequired})
                      </button>
                    )}

                    {boostRecord && boostRecord.status === 'pending' && boostRecord.ads_watched_count === 1 && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 py-1 px-2.5 rounded-lg leading-snug">
                           تمت مشاهدة الإعلان الأول بنجاح · باقي إعلانين لتفعيل التمويل
                        </p>
                        <button
                          onClick={() => triggerRewardedAdWatch(2)}
                          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl text-xs cursor-pointer shadow-sm text-center"
                        >
                          شاهد الإعلان الثاني (1/{rewardedAdsRequired})
                        </button>
                      </div>
                    )}

                    {boostRecord && boostRecord.status === 'pending' && boostRecord.ads_watched_count === 2 && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 py-1 px-2.5 rounded-lg leading-snug">
                           تمت مشاهدة الإعلان الثاني بنجاح · بقي إعلان واحد وأخير لتفعيل التمويل
                        </p>
                        <button
                          onClick={() => triggerRewardedAdWatch(3)}
                          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl text-xs cursor-pointer shadow-sm text-center"
                        >
                          شاهد الإعلان الثالث والأخير (2/{rewardedAdsRequired})
                        </button>
                      </div>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setShowBoostModal(false)}
                  className="w-full border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-450 font-semibold py-2.5 rounded-2xl text-xs cursor-pointer text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 mt-1 transition-all"
                >
                  إغلاق
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
