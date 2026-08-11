import { useState, useEffect } from 'react';
import { MessageSquare, Clock, Loader2, Bell, BellRing, BellOff, Check, AlertCircle } from 'lucide-react';
import { Chat, Listing, Profile } from '../types';
import { dbService } from '../db/dbService';
import { motion } from 'motion/react';
import { useTranslation } from './LanguageContext';

interface ChatsPageProps {
  onSelectChat: (chatId: string) => void;
}

interface ChatListItem {
  chat: Chat;
  listing: Listing | null;
  otherUser: Profile | null;
}

export default function ChatsPage({ onSelectChat }: ChatsPageProps) {
  const [items, setItems] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const { t, language } = useTranslation();

  // Notification States
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
        // Dispatch simple instant test notification
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

  useEffect(() => {
    dbService.getCurrentUserId().then(setCurrentUserId);

    // Real-time chat update subscription
    const unsubscribe = dbService.subscribeToChats(async (chats) => {
      setLoading(true);
      try {
        const uid = await dbService.getCurrentUserId();
        const listItems: ChatListItem[] = [];
        
        for (const chat of chats) {
          const otherUserId = chat.participant_one_id === uid 
            ? chat.participant_two_id 
            : chat.participant_one_id;

          let otherUser: Profile | null = null;
          if (chat.participantInfo?.[otherUserId]) {
            otherUser = {
              id: otherUserId,
              display_name: chat.participantInfo[otherUserId].display_name,
              profile_image_url: chat.participantInfo[otherUserId].profile_image_url || null,
              username: chat.participantInfo[otherUserId].username || "",
              created_at: "",
              updated_at: "",
              average_rating: 5,
              ratings_count: 0,
              active_listings_count: 0,
              completed_exchanges_count: 0
            };
          } else {
            otherUser = await dbService.getUserProfile(otherUserId);
          }

          let listing: Listing | null = null;
          if (chat.listingId && chat.listingTitle) {
            listing = {
              id: chat.listingId,
              title: chat.listingTitle,
              images: chat.listingImage ? [chat.listingImage] : [],
              is_active: true,
              status: 'active'
            } as any;
          } else {
            listing = await dbService.getListingDetails(chat.listing_id);
          }

          listItems.push({ chat, listing, otherUser });
        }

        // Sort items so that the newest message is always at the top of the list
        listItems.sort((a, b) => {
          const tA = a.chat.last_message_at ? new Date(a.chat.last_message_at).getTime() : 0;
          const tB = b.chat.last_message_at ? new Date(b.chat.last_message_at).getTime() : 0;
          return tB - tA;
        });

        setItems(listItems);
      } catch (err) {
        console.error("Chats map err", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 animate-pulse">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-sm">{language === 'ar' ? 'جاري مراجعة محادثاتك النشطة...' : 'Retrieving your active chats...'}</p>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto space-y-4 pb-24 text-start">
      
      <div className="border-b border-slate-50 pb-3.5 mb-2 flex items-center justify-between">
        <span></span>
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
          <MessageSquare className="h-5 w-5 text-emerald-600" />
          <span>{t('chats.title')}</span>
        </h2>
      </div>

      {/* Dynamic Browser Push Notifications control center */}
      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 text-right flex-1">
            <div className="p-1.5 bg-emerald-50 rounded-xl text-emerald-700 mt-0.5">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">
                {language === 'ar' ? 'إشعارات الرسائل الفورية' : 'Instant Message Notifications'}
              </h4>
              <p className="text-[10px] sm:text-[11px] text-slate-500 leading-normal mt-0.5">
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
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          )}
        </div>

        {/* 1. If notification permission not requested yet or default */}
        {notificationsSupported && notiPermission === 'default' && (
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-100 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <BellRing className="h-4 w-4 text-emerald-600 animate-bounce shrink-0" />
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
          <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-[11px] ${notiLocalEnabled ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
            {notiLocalEnabled ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="font-bold">
                  {language === 'ar' ? 'مسار الإشعارات نشط: ستتلقى تنبيهات المتصفح فوراً.' : 'Notifications Active: You will receive real-time push alerts.'}
                </span>
              </>
            ) : (
              <>
                <BellOff className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold">
                  {language === 'ar' ? 'تم كتم الإشعارات مؤقتاً من إعدادات التطبيق.' : 'Notifications are paused from app preferences.'}
                </span>
              </>
            )}
          </div>
        )}

        {/* 3. If notification was blocked/denied */}
        {notificationsSupported && notiPermission === 'denied' && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2 text-amber-900 text-[11px]">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
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

        {/* 4. If notifications are NOT supported by current browser */}
        {!notificationsSupported && (
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center gap-2 text-blue-800 text-[11px]">
            <AlertCircle className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="font-medium leading-normal text-right">
              {language === 'ar' 
                ? 'متصفحك الحالي لا يدعم إشعارات الدفع المنبثقة للويب. سنرسل لك تنبيهات فورية داخل التطبيق كبديل دائم.' 
                : 'System push notifications are not supported on this browser. In-app notifications will keep you updated.'}
            </span>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-slate-50/60 rounded-3xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
          <MessageSquare className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-sm font-bold leading-normal text-slate-600">
            {t('chats.empty')}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {t('chats.empty_sub')}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {items.map(({ chat, listing, otherUser }) => {
            if (!otherUser) return null;
            const unreadCount = chat.unreadCounts?.[currentUserId] || 0;

            return (
              <motion.div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className="group bg-white rounded-2xl border border-slate-100 p-4 hover:border-emerald-200 hover:shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-between"
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center gap-3.5">
                  {/* User avatar display */}
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 border border-emerald-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative">
                    {otherUser.profile_image_url ? (
                      <img src={otherUser.profile_image_url} alt="profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-sm font-black text-white font-sans">{otherUser.display_name.slice(0, 2)}</span>
                    )}
                  </div>

                  {/* Descriptions */}
                  <div className="text-start">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-800 leading-snug group-hover:text-emerald-700 transition-colors">
                      {otherUser.display_name}
                    </h3>
                    
                    {listing ? (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-semibold inline-block mb-1.5 mt-0.5">
                         {listing.title}
                       </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 block mb-1">{language === 'ar' ? 'سلعة غير متوفرة' : 'Item unavailable'}</span>
                    )}

                    <p className={`text-xs block line-clamp-1 truncate text-start ${unreadCount > 0 ? "font-bold text-slate-800" : "font-semibold text-slate-400"}`}>
                      {chat.last_message || (language === 'ar' ? 'بداية المحادثة' : 'Conversation started')}
                    </p>
                  </div>
                </div>

                {/* Left side showing Time and Unread counts, and Mini listing thumbnail */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end gap-1.5 font-sans">
                    {chat.last_message_at ? (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(chat.last_message_at).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : null}

                    {unreadCount > 0 && (
                      <span className="bg-emerald-600 text-white font-heavy text-[10px] h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </div>

                  {listing && listing.images && listing.images.length > 0 && (
                    <div className="h-10 w-10 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden shrink-0">
                      <img 
                        src={listing.images[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100';
                        }}
                      />
                    </div>
                  )}
                </div>

              </motion.div>
            );
          })}
        </div>
      )}

    </div>
  );
}
