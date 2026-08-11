import { Heart, Landmark, LogOut, MessageSquare, Plus, Search, ShieldCheck, User } from 'lucide-react';
import { TabType } from './BottomNav';
import { useTranslation } from './LanguageContext';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenFavorites: () => void;
  favoritesCount: number;
  userName?: string;
  userEmail?: string;
  isAdmin?: boolean;
  onLogout?: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  onOpenFavorites,
  favoritesCount,
  userName,
  userEmail,
  isAdmin,
  onLogout
}: HeaderProps) {
  const { t } = useTranslation();

  const isUserAdmin = isAdmin || userEmail?.toLowerCase().trim() === 'vegro09@gmail.com' || userEmail?.toLowerCase().trim() === 'baddil.support@gmail.com';

  return (
    <header className="sticky top-0 bg-white/95 dark:bg-[#151d30]/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 z-40 py-3 px-4 sm:px-6 shadow-sm transition-all duration-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo and Title */}
        <div 
          onClick={() => setActiveTab('home')} 
          className="flex items-center gap-2.5 cursor-pointer selection:bg-transparent"
        >
          <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 text-white p-2 rounded-xl shadow-md shadow-emerald-700/10">
            <Landmark className="h-5 w-5 rotate-3" />
          </div>
          <div className="flex flex-col text-right">
            <h1 className="text-xl font-bold font-sans tracking-tight text-slate-800 dark:text-slate-100">
              {t('brand.title')}
            </h1>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 p-1 rounded-2xl border border-slate-100 dark:border-slate-800/80">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'bg-white dark:bg-slate-800/90 text-emerald-800 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t('nav.home')}
          </button>
          
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-white dark:bg-slate-800/90 text-emerald-800 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t('nav.search')}
          </button>

          <button
            onClick={() => setActiveTab('add_listing')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'add_listing'
                ? 'bg-white dark:bg-slate-800/90 text-emerald-800 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t('nav.add')}
          </button>

          <button
            onClick={() => setActiveTab('chats')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'chats'
                ? 'bg-white dark:bg-slate-800/90 text-emerald-800 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t('nav.chats')}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-slate-800/90 text-emerald-800 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t('nav.profile')}
          </button>

          {isUserAdmin && (
            <button
              onClick={() => setActiveTab('admin' as any)}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                (activeTab as any) === 'admin'
                  ? 'bg-amber-500 text-slate-900 shadow-sm'
                  : 'bg-amber-400/20 text-amber-600 dark:text-amber-400 hover:bg-amber-400/30'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>لوحة الإشراف</span>
            </button>
          )}
        </nav>

        {/* Utility Buttons */}
        <div className="flex items-center gap-2">
          {/* Direct Admin button on mobile or utility area */}
          {isUserAdmin && (
            <button
              onClick={() => setActiveTab('admin' as any)}
              className="md:hidden p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl transition-all relative border border-amber-200 dark:border-amber-800/50 cursor-pointer"
              title="لوحة الإشراف"
            >
              <ShieldCheck className="h-5 w-5" />
            </button>
          )}

          {/* Favorites Button in Header */}
          <button
            onClick={onOpenFavorites}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all relative border border-slate-100 dark:border-slate-800 cursor-pointer"
            title={t('nav.favorites')}
          >
            <Heart className="h-5 w-5" />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-mono font-bold text-[9px] h-4 w-4 rounded-full flex items-center justify-center border border-white dark:border-slate-900">
                {favoritesCount}
              </span>
            )}
          </button>

          {userName && (
            <div className="hidden lg:flex flex-col text-right items-end">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">{t('header.welcome')}</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">{userName}</span>
            </div>
          )}

          {/* Quick Add shortcut for Desktop screens */}
          <button
            onClick={() => setActiveTab('add_listing')}
            className="hidden md:flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold py-2 px-3.5 transition-all shadow-sm shadow-emerald-600/10 hover:shadow-emerald-700/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{t('header.new_ad')}</span>
          </button>
        </div>

      </div>
    </header>
  );
}
