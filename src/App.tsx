import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import Header from './components/Header';
import BottomNav, { TabType } from './components/BottomNav';

// Code Splitting & Lazy Loading of non-essential components to dramatically reduce Total Blocking Time (TBT)
const HomeFeed = lazy(() => import('./components/HomeFeed'));
const SearchPage = lazy(() => import('./components/SearchPage'));
const AddListingPage = lazy(() => import('./components/AddListingPage'));
const ChatsPage = lazy(() => import('./components/ChatsPage'));
const ChatRoomPage = lazy(() => import('./components/ChatRoomPage'));
const ListingDetailsPage = lazy(() => import('./components/ListingDetailsPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const FavoritesPage = lazy(() => import('./components/FavoritesPage'));
const AuthPage = lazy(() => import('./components/AuthPage'));
const VerifyEmailPage = lazy(() => import('./components/VerifyEmailPage'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const LegalPage = lazy(() => import('./components/LegalPage'));
const ConsentBlockingScreen = lazy(() => import('./components/ConsentBlockingScreen'));

import { dbService } from './db/dbService';
import { auth, isMockMode } from './db/firebase';
import { useTranslation } from './components/LanguageContext';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, AlertCircle, Info, X, Landmark, Loader2, Bell, BellRing, Lock } from 'lucide-react';
import { getFCMToken } from './firebaseConfig';

export default function App() {
  const { direction, language, t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Sync and load theme from localStorage
  useEffect(() => {
    const currentTheme = localStorage.getItem('baddil_theme') || 'light';
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const handleThemeChange = () => {
      const theme = localStorage.getItem('baddil_theme') || 'light';
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    window.addEventListener('baddil_theme_change', handleThemeChange);
    return () => {
      window.removeEventListener('baddil_theme_change', handleThemeChange);
    };
  }, []);

  // Request notifications, fetch/print FCM token, and ensure database settings are seeded
  useEffect(() => {
    getFCMToken();
    dbService.queryAdminSettings().catch(err => {
      console.error("Failed to query or seed admin settings on mount:", err);
    });
  }, []);

  const prevChatsRef = useRef<Record<string, { lastMessageAtStr?: string; unreadCount: number }>>({});
  const isFirstRun = useRef(true);
  
  // Custom toast notification system
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  
  // Home search filter navigation category
  const [searchCategory, setSearchCategory] = useState<string | undefined>(undefined);

  // Favorites state list
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userName, setUserName] = useState<string>('');

  // Authentication session states
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [showNotificationReqModal, setShowNotificationReqModal] = useState<boolean>(false);

  // Legal routing and tracking state
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('terms');
  const [legalBackTarget, setLegalBackTarget] = useState<TabType>('home');

  // Auto-request or show prompt if external notification permission is still default
  useEffect(() => {
    if (currentUser) {
      const isSupported = typeof window !== 'undefined' && 'Notification' in window;
      const dismissed = sessionStorage.getItem('dismissed_notification_modal') === 'true';
      if (isSupported && Notification.permission === 'default' && !dismissed) {
        const timer = setTimeout(() => {
          setShowNotificationReqModal(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    } else {
      setShowNotificationReqModal(false);
    }
  }, [currentUser]);

  const handleRequestSystemPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Send instant proof of system push alert
          new Notification(
            language === 'ar' ? "تم تفعيل الإشعارات بنجاح! 🔔" : "Notifications enabled successfully! 🔔",
            {
              body: language === 'ar' 
                ? "ستتلقى تنبيهات فورية هنا عند وصول أي رسائل جديدة خارج التطبيق." 
                : "You will receive instant push notifications when new chat messages arrive.",
              icon: "/favicon.ico"
            }
          );
        }
      } catch (err) {
        console.warn("Could not request browser permission", err);
      }
    }
    setShowNotificationReqModal(false);
    sessionStorage.setItem('dismissed_notification_modal', 'true');
  };
  const [pendingDestination, setPendingDestination] = useState<{
    tab?: TabType;
    listingId?: string | null;
    chatId?: string | null;
    action?: { type: string; payload: any };
  } | null>(null);

  // Subscribe to Authentication sessions
  useEffect(() => {
    // Automatically seed the physical Firestore database if empty when running live
    dbService.ensurePhysicalDatabaseSeeded().catch((err) => {
      console.warn("Physical database auto-seeding bypass/fail:", err);
    });

    const unsubscribe = dbService.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        setUserName(user.display_name || 'مستعمل بَدِل');
      } else {
        setUserName('');
        setFavorites([]);
        setCurrentUserProfile(null);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Fetch and keep active profile reference synchronized
  useEffect(() => {
    if (currentUser?.uid) {
      dbService.getUserProfile(currentUser.uid)
        .then(profile => {
          setCurrentUserProfile(profile);
          if (profile?.display_name) {
            setUserName(profile.display_name);
          }
        })
        .catch(err => {
          console.error("Failed synchronizing log-in user profile details", err);
        });
    } else {
      setCurrentUserProfile(null);
    }
  }, [currentUser]);

  // 1. Dynamic URL Synchronization (State -> URL Path)
  useEffect(() => {
    if (authLoading) return; // Wait until session state finishes checking

    let targetPath = '/';
    if (selectedListingId) {
      targetPath = `/listing/${selectedListingId}`;
    } else if (activeChatId) {
      targetPath = `/chat/${activeChatId}`;
    } else if (activeTab === 'legal') {
      targetPath = `/legal?tab=${legalTab}`;
    } else if (activeTab !== 'home') {
      targetPath = `/${activeTab}`;
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [selectedListingId, activeChatId, activeTab, legalTab, authLoading]);

  // 2. URL -> State Initialization and Back/Forward popstate transitions
  useEffect(() => {
    if (authLoading) return;

    const parseUrlRoute = () => {
      const path = window.location.pathname;
      if (path.startsWith('/legal')) {
        const params = new URLSearchParams(window.location.search);
        const subTab = params.get('tab') === 'privacy' ? 'privacy' : 'terms';
        setLegalTab(subTab);
        setActiveTab('legal');
        setSelectedListingId(null);
        setActiveChatId(null);
      } else if (path.startsWith('/chat/')) {
        const cid = path.split('/chat/')[1];
        if (cid) {
          dbService.getCurrentUserId().then(uid => {
            if (!uid) {
              setPendingDestination({
                tab: 'chats',
                chatId: cid
              });
              setActiveTab('login' as any);
              setActiveChatId(null);
              setSelectedListingId(null);
            } else {
              setActiveChatId(cid);
              setSelectedListingId(null);
            }
          }).catch(() => {
            setActiveChatId(cid);
            setSelectedListingId(null);
          });
        }
      } else if (path.startsWith('/listing/')) {
        const lid = path.split('/listing/')[1];
        if (lid) {
          setSelectedListingId(lid);
          setActiveChatId(null);
        }
      } else if (path !== '/' && path.length > 1) {
        const tab = path.slice(1) as TabType;
        const validTabs: TabType[] = ['home', 'search', 'add_listing', 'chats', 'profile', 'favorites', 'admin' as any, 'login' as any, 'signup' as any, 'legal' as any];
        if (validTabs.includes(tab)) {
          setActiveTab(tab);
        } else {
          setActiveTab('home');
        }
        setSelectedListingId(null);
        setActiveChatId(null);
      } else {
        setActiveTab('home');
        setSelectedListingId(null);
        setActiveChatId(null);
      }
    };

    parseUrlRoute();
    window.addEventListener('popstate', parseUrlRoute);
    return () => window.removeEventListener('popstate', parseUrlRoute);
  }, [authLoading]);

  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Synchronize favorites of the logged-in user
  useEffect(() => {
    async function syncFavs() {
      if (!currentUser) {
        setFavorites([]);
        return;
      }
      try {
        const favs = await dbService.getFavorites();
        setFavorites(favs);
      } catch (err) {
        console.error("Load favorites error", err);
      }
    }
    syncFavs();
  }, [currentUser]);

  // Synchronize unread chats count in real-time and handle browser notifications
  useEffect(() => {
    if (!currentUser) {
      setUnreadCount(0);
      isFirstRun.current = true;
      prevChatsRef.current = {};
      return;
    }
    const unsubscribe = dbService.subscribeToChats((chats) => {
      const uid = currentUser.uid;
      const count = chats.reduce((sum, chat) => sum + (chat.unreadCounts?.[uid] || 0), 0);
      setUnreadCount(count);

      // Notification check preference
      const notificationsEnabled = localStorage.getItem('db_notifications_enabled') !== 'false';
      
      if (isFirstRun.current) {
        // Initial setup - populate state to avoid spam
        const initialMap: Record<string, { lastMessageAtStr?: string; unreadCount: number }> = {};
        chats.forEach(chat => {
          initialMap[chat.id] = {
            lastMessageAtStr: chat.last_message_at || '',
            unreadCount: chat.unreadCounts?.[uid] || 0
          };
        });
        prevChatsRef.current = initialMap;
        isFirstRun.current = false;
        return;
      }

      // Check messages for new arrivals from partners
      chats.forEach(chat => {
        const prev = prevChatsRef.current[chat.id];
        const currentUnread = chat.unreadCounts?.[uid] || 0;
        const prevUnread = prev ? prev.unreadCount : 0;
        
        const isFromOthers = chat.lastMessageSenderId && chat.lastMessageSenderId !== uid;
        const hasNewMsg = isFromOthers && (
          (currentUnread > prevUnread) || 
          (chat.last_message_at !== (prev?.lastMessageAtStr || ''))
        );

        if (hasNewMsg) {
          // If they are actively viewing this chat room, bypass sending push/toast notification
          if (activeChatId === chat.id) return;

          const senderName = chat.participantInfo?.[chat.lastMessageSenderId || '']?.display_name || 'شريك بَدِل';
          const messageText = chat.last_message || 'أرسل لك رسالة جديدة';

          // 1. Browser Native System Notification (Sends external notification directly to the device)
          if (notificationsEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              const notification = new Notification(`رسالة جديدة من ${senderName}`, {
                body: messageText,
                icon: chat.participantInfo?.[chat.lastMessageSenderId || '']?.profile_image_url || '/favicon.ico',
                tag: chat.id,
                renotify: true
              } as any);

              notification.onclick = () => {
                window.focus();
                setActiveChatId(chat.id);
                setSelectedListingId(null);
                setActiveTab('chats');
              };
            } catch (err) {
              console.warn("Could not display native notification", err);
            }
          }
        }
      });

      const updatedMap: Record<string, { lastMessageAtStr?: string; unreadCount: number }> = {};
      chats.forEach(chat => {
        updatedMap[chat.id] = {
          lastMessageAtStr: chat.last_message_at || '',
          unreadCount: chat.unreadCounts?.[uid] || 0
        };
      });
      prevChatsRef.current = updatedMap;
    });
    return () => unsubscribe();
  }, [currentUser, activeChatId]);

  // Intercept state changes for secure tabs
  const handleTabChange = (tab: TabType) => {
    const protectedTabs: TabType[] = ['add_listing', 'chats', 'profile', 'favorites'];
    if (protectedTabs.includes(tab) && !currentUser) {
      showToast("يجب تسجيل الدخول للمتابعة", 'info');
      setPendingDestination({ tab });
      setActiveTab('login' as any);
      setSelectedListingId(null);
      setActiveChatId(null);
      return;
    }

    // Require email verification for sensitive actions (posting a listing or viewing chats)
    const emailSensitiveTabs: TabType[] = ['add_listing', 'chats'];
    const isEmailUnverified = false; // Disabled verification requirements as per user request to bypass account activation/verification code
    if (emailSensitiveTabs.includes(tab) && isEmailUnverified) {
      showToast(language === 'ar' ? "يرجى تفعيل البريد الإلكتروني للمتابعة" : "Please verify your email to continue", 'info');
      setActiveTab('verify_email' as any);
      setSelectedListingId(null);
      setActiveChatId(null);
      return;
    }

    setActiveTab(tab);
    setSelectedListingId(null);
    setActiveChatId(null);
  };

  const handleToggleFavorite = async (id: string) => {
    if (!currentUser) {
      showToast("يجب تسجيل الدخول للمتابعة", 'info');
      setPendingDestination({
        tab: activeTab,
        listingId: selectedListingId,
        chatId: activeChatId,
        action: { type: 'favorite', payload: id }
      });
      setActiveTab('login' as any);
      setSelectedListingId(null);
      setActiveChatId(null);
      return;
    }

    const isCurrentlyFavorited = favorites.includes(id);

    // Optimistically update the UI state immediately
    setFavorites(prev => {
      if (isCurrentlyFavorited) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });

    // Subtly inform user of the optimistic update
    showToast(isCurrentlyFavorited ? "تمت الإزالة من المفضلة..." : "تمت الإضافة للمفضلة...", 'info');

    try {
      const added = await dbService.toggleFavorite(id);
      
      // Reconcile: update with exact server state confirmation
      setFavorites(prev => {
        const hasNow = prev.includes(id);
        if (added && !hasNow) {
          return [...prev, id];
        } else if (!added && hasNow) {
          return prev.filter(item => item !== id);
        }
        return prev;
      });

      showToast(added ? "تمت الإضافة للمفضلة بنجاح!" : "تمت الإزالة من المفضلة بنجاح!", 'success');
    } catch (err) {
      console.error("Toggle favorites fail", err);
      
      // Rollback gracefully to restore previous correct state
      setFavorites(prev => {
        if (isCurrentlyFavorited) {
          if (prev.includes(id)) return prev;
          return [...prev, id];
        } else {
          return prev.filter(item => item !== id);
        }
      });
      
      showToast("عذراً، فشل تحديث المفضلة. تم استعادة الحالة السابقة.", 'error');
    }
  };

  const handleNavigateToSearch = (cat?: string) => {
    setSearchCategory(cat);
    setActiveTab('search');
    setSelectedListingId(null);
    setActiveChatId(null);
  };

  const handleStartChat = async (listingId: string, ownerId: string, cachedChatId?: string) => {
    if (!currentUser) {
      showToast("يجب تسجيل الدخول للمتابعة", 'info');
      setPendingDestination({
        tab: activeTab,
        listingId: selectedListingId,
        chatId: activeChatId,
        action: { type: 'chat', payload: { listingId, ownerId } }
      });
      setActiveTab('login' as any);
      setSelectedListingId(null);
      setActiveChatId(null);
      return;
    }

    // Require email verification to start a chat
    const isEmailUnverified = false; // Disabled verification requirements as per user request to bypass account activation/verification code
    if (isEmailUnverified) {
      showToast(language === 'ar' ? "يرجى تفعيل البريد الإلكتروني لبدء محادثة" : "Please verify your email to start a chat", 'info');
      setActiveTab('verify_email' as any);
      setSelectedListingId(null);
      setActiveChatId(null);
      return;
    }

    try {
      const cid = cachedChatId || await dbService.startOrGetChat(listingId, ownerId);
      if (cid) {
        setActiveChatId(cid);
        setSelectedListingId(null);
      } else {
        showToast("عذراً، فشل في فتح المحادثة. الرجاء المحاولة لاحقاً.", 'error');
      }
    } catch (err) {
      console.error("Initiate chat channel err", err);
      showToast("عذراً، فشل في فتح المحادثة. الرجاء المحاولة لاحقاً.", 'error');
    }
  };

  // Auth wizard completion callback
  const handleAuthSuccess = async (uid: string) => {
    showToast("تم تسجيل الدخول بنجاح! أهلاً بك في حساب بَدِل الخاص بك.", 'success');
    
    // Refresh user profile details
    try {
      const profile = await dbService.getUserProfile(uid);
      if (profile) setUserName(profile.display_name);
    } catch (e) {
      console.error(e);
    }

    // Process pending redirect back to destination
    if (pendingDestination) {
      const dest = pendingDestination;
      setPendingDestination(null);

      if (dest.action) {
        if (dest.action.type === 'favorite') {
          await handleToggleFavorite(dest.action.payload);
        } else if (dest.action.type === 'chat') {
          await handleStartChat(dest.action.payload.listingId, dest.action.payload.ownerId);
          return;
        }
      }

      if (dest.tab) {
        setActiveTab(dest.tab);
      } else {
        setActiveTab('home');
      }

      if (dest.listingId) setSelectedListingId(dest.listingId);
      if (dest.chatId) setActiveChatId(dest.chatId);
    } else {
      setActiveTab('home');
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    setAuthLoading(true);
    try {
      await dbService.logout();
      showToast("تم تسجيل الخروج بنجاح. تتصفح الآن كزائر.", 'info');
      setActiveTab('home');
      setSelectedListingId(null);
      setActiveChatId(null);
      setUserName('');
    } catch (err) {
      console.error(err);
      showToast("عذراً، فشل تسجيل الخروج. يرجى المحاولة لاحقاً.", 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  // Show beautiful centering loading screen for secure session checks
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500" dir={direction}>
        <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 text-white p-4 rounded-3xl shadow-xl shadow-emerald-500/10 mb-4 animate-bounce">
          <Landmark className="h-10 w-10 text-white" />
        </div>
        <p className="text-sm font-black text-slate-700 animate-pulse">جاري التحقق من أمان الجلسة...</p>
      </div>
    );
  }

  if ((activeTab as any) === 'admin') {
    return (
      <AdminDashboard onExit={(targetChatId?: string) => {
        if (targetChatId) {
          setActiveTab('chats');
          setActiveChatId(targetChatId);
        } else {
          setActiveTab('home');
        }
      }} />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" dir={direction}>
      
      {/* Top Brand & Desktop tabs header */}
      {!activeChatId && (
        <Header
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          onOpenFavorites={() => handleTabChange('favorites')}
          favoritesCount={favorites.length}
          userName={userName}
          userEmail={currentUser?.email || currentUserProfile?.email_visible || ''}
          isAdmin={currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'super_admin' || currentUserProfile?.role === 'moderator'}
          onLogout={handleLogoutClick}
        />
      )}

      {/* Main Container body */}
      <main className={`flex-1 max-w-6xl w-full mx-auto flex flex-col ${activeChatId ? 'px-0 py-0' : 'px-4 sm:px-6 py-5'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={
              selectedListingId 
                ? `details_${selectedListingId}` 
                : activeChatId 
                ? `chat_${activeChatId}` 
                : `tab_${activeTab}`
            }
            className={activeChatId ? "flex-1 flex flex-col" : ""}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Suspense placeholder wrapper for Dynamic Code Splitting optimization */}
            <Suspense fallback={
              <div className="flex-1 flex flex-col items-center justify-center py-20 min-h-[350px]" dir="rtl">
                <Loader2 className="h-9 w-9 text-emerald-600 animate-spin mb-3" />
                <p className="text-slate-500 text-xs font-bold">جاري تحميل الصفحة...</p>
              </div>
            }>
              {/* If viewing single Listing details */}
              {selectedListingId ? (
                <ListingDetailsPage
                  listingId={selectedListingId}
                  onBack={() => setSelectedListingId(null)}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onStartChat={handleStartChat}
                />
              ) : activeChatId ? (
                /* If inside chat room discussions */
                <ChatRoomPage
                  chatId={activeChatId}
                  onBack={() => setActiveChatId(null)}
                  onOpenListing={(lid) => {
                    setSelectedListingId(lid);
                    setActiveChatId(null);
                  }}
                />
              ) : (
                /* Standard Router Tab selections */
                <>
                  {/* Email Verification Page */}
                  {((activeTab as any) === 'verify_email') && (
                    <VerifyEmailPage
                      onVerified={() => setActiveTab('home')}
                      onLogout={handleLogoutClick}
                      showToast={showToast}
                    />
                  )}

                  {/* 0. Dedicated Login Page State inside Central Router */}
                  {((activeTab as any) === 'login' || (activeTab as any) === 'signup') && (
                    <AuthPage
                      onSuccess={handleAuthSuccess}
                      initialView={(activeTab as any) === 'signup' ? 'signup' : 'welcome'}
                      onBackToFeed={() => setActiveTab('home')}
                      onOpenLegal={(tab) => {
                        setLegalTab(tab);
                        setLegalBackTarget(activeTab);
                        setActiveTab('legal' as any);
                      }}
                    />
                  )}

                  {activeTab === 'legal' && (
                    <LegalPage
                      initialTab={legalTab}
                      onBack={() => {
                        setActiveTab(legalBackTarget);
                      }}
                    />
                  )}

                  {activeTab === 'home' && (
                    <HomeFeed
                      onSelectListing={setSelectedListingId}
                      onNavigateToSearch={handleNavigateToSearch}
                      favorites={favorites}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  )}

                  {activeTab === 'search' && (
                    <SearchPage
                      initialCategory={searchCategory}
                      onSelectListing={setSelectedListingId}
                      favorites={favorites}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  )}

                  {activeTab === 'add_listing' && (
                    <AddListingPage
                      onSuccess={() => {
                        showToast('🎉 تم نشر إعلان التبادل بنجاح وهو الآن نشط في صفحات البحث!', 'success');
                        setActiveTab('home');
                      }}
                    />
                  )}

                  {activeTab === 'chats' && (
                    <ChatsPage
                      onSelectChat={setActiveChatId}
                    />
                  )}

                  {activeTab === 'profile' && (
                    <ProfilePage
                      onSelectListing={setSelectedListingId}
                      favorites={favorites}
                      onToggleFavorite={handleToggleFavorite}
                      onLogoutClick={handleLogoutClick}
                      onOpenLegal={() => {
                        setLegalTab('terms');
                        setLegalBackTarget('profile');
                        setActiveTab('legal' as any);
                      }}
                    />
                  )}

                  {activeTab === 'favorites' && (
                    <FavoritesPage
                      favorites={favorites}
                      onToggleFavorite={handleToggleFavorite}
                      onSelectListing={setSelectedListingId}
                      onClose={() => setActiveTab('home')}
                    />
                  )}
                </>
              )}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Stick bottom navbar for mobile screens */}
      {!activeChatId && (
        <BottomNav
          activeTab={(activeTab as any) === 'login' || (activeTab as any) === 'signup' ? 'home' : activeTab}
          setActiveTab={handleTabChange}
          unreadCount={unreadCount}
        />
      )}

      {/* Logout Confirmation Modal Overlay */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-right"
              dir="rtl"
            >
              <h3 className="text-lg font-black text-slate-800 mb-2">تأكيد تسجيل الخروج</h3>
              <p className="text-slate-500 text-xs leading-relaxed mb-6">
                هل تريد تسجيل الخروج؟ سيتم حفظ إعلاناتك ومفضلتك وستتمكن من تصفح التطبيق كزائر.
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={confirmLogout}
                  style={{ minHeight: '44px' }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-heavy text-xs rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                >
                  تسجيل الخروج
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{ minHeight: '44px' }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-heavy text-xs rounded-xl cursor-pointer transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* External Native Device Notifications Permission Modal */}
      <AnimatePresence>
        {showNotificationReqModal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4" dir="rtl">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white border border-slate-100 rounded-[32px] p-6 max-w-md w-full shadow-2xl relative text-right overflow-hidden"
            >
              {/* Decorative Background Accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>
              
              <div className="flex items-center gap-3.5 mb-4">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl shrink-0">
                  <BellRing className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">تفعيل الإشعارات الخارجية</h3>
                  <p className="text-[11px] text-slate-400 font-medium">ميزة التنبيهات الفورية الفائقة</p>
                </div>
              </div>

              <div className="space-y-3.5 my-4">
                <p className="text-slate-600 text-[12px] sm:text-xs leading-relaxed">
                  يتطلب تطبيق <strong className="text-slate-800">بَدِل</strong> إذنًا من نظام تشغيل جهازك لإرسال <strong className="text-emerald-700">إشعارات الدفع المنبثقة</strong> عند استلام رسائل مقايضة جديدة.
                </p>
                
                <div className="bg-slate-50 border border-slate-100/80 p-3 rounded-2xl space-y-2">
                  <div className="flex items-start gap-2 text-[11px] text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></div>
                    <span>تصلك التنبيهات حتى وإن كان التطبيق مغلقاً أو المتصفح بالخلفية.</span>
                  </div>
                  <div className="flex items-start gap-2 text-[11px] text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></div>
                    <span>إمكانية السحب والنقر للدخول الفوري للغرفة ومتابعة المقايضة.</span>
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-2xl flex items-start gap-2.5 text-amber-900 text-[10px] sm:text-[11px] leading-relaxed">
                  <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-950 mb-0.5">تنويه لمستخدمي نافذة المعاينة:</span>
                    إصدار إذن الإشعارات يتطلب تشغيل التطبيق في تبويب مستقل (خارج إطار المعاينة iframe). إذا واجهت مشكلة، يرجى فتح المعاينة في صفحة جديدة والضغط على تفعيل.
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={handleRequestSystemPermission}
                  style={{ minHeight: '44px' }}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl cursor-pointer transition-all active:scale-[0.98] shadow-sm shadow-emerald-700/15"
                >
                  سماح وتفعيل الإشعارات
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotificationReqModal(false);
                    sessionStorage.setItem('dismissed_notification_modal', 'true');
                  }}
                  style={{ minHeight: '44px' }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 rounded-xl cursor-pointer transition-all"
                >
                  ليس الآن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating high-quality Toast notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[140] p-4 rounded-2xl shadow-xl flex items-start gap-3 border backdrop-blur-md transition-all text-right"
            style={{
              backgroundColor: toast.type === 'success' ? '#ECFDF5' : toast.type === 'error' ? '#FEF2F2' : '#F0F9FF',
              borderColor: toast.type === 'success' ? '#A7F3D0' : toast.type === 'error' ? '#FCA5A5' : '#BAE6FD',
              color: toast.type === 'success' ? '#065F46' : toast.type === 'error' ? '#991B1B' : '#075985',
              direction: 'rtl'
            }}
          >
            {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />}

            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {toast.message}
            </div>

            <button 
              type="button"
              onClick={() => setToast(null)} 
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-all shrink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-bypassable legal update consent blocking modal for existing accounts */}
      {currentUser && currentUserProfile && !(currentUserProfile.termsAccepted === true && currentUserProfile.legalAccepted === true) && (
        <Suspense fallback={null}>
          <ConsentBlockingScreen
            userId={currentUser.uid}
            onConsentAccepted={(updatedProfile) => {
              setCurrentUserProfile(updatedProfile);
              showToast(language === 'ar' ? "أهلاً بك مجدداً! تم تسجيل موافقتك وحسابك جاهز للاستخدام." : "Welcome back! Your legal consent has been registered and verified.", 'success');
            }}
            onLogout={async () => {
              try {
                await dbService.logout();
                setCurrentUser(null);
                setCurrentUserProfile(null);
                setUserName('');
                setFavorites([]);
                setActiveTab('home');
              } catch (err) {
                console.error(err);
              }
            }}
          />
        </Suspense>
      )}</div>
  );
}
