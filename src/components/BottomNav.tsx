import { Home, Search, PlusCircle, MessageSquare, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from './LanguageContext';

export type TabType = 'home' | 'search' | 'add_listing' | 'chats' | 'profile' | 'favorites';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  unreadCount?: number;
}

export default function BottomNav({ activeTab, setActiveTab, unreadCount = 0 }: BottomNavProps) {
  const { t } = useTranslation();
  const navItems: {
    id: TabType;
    label: string;
    icon: any;
    highlight?: boolean;
    badge?: number;
  }[] = [
    { id: 'home', label: t('nav.home'), icon: Home },
    { id: 'search', label: t('nav.search'), icon: Search },
    { id: 'add_listing', label: t('nav.add'), icon: PlusCircle, highlight: true },
    { id: 'chats', label: t('nav.chats'), icon: MessageSquare, badge: unreadCount },
    { id: 'profile', label: t('nav.profile'), icon: User }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#151d30]/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800/80 shadow-xl z-50 py-2 pb-safe-bottom">
      <div className="flex justify-around items-center px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 select-none ${
                item.highlight
                  ? 'text-teal-600 dark:text-teal-400 font-semibold'
                  : isActive
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              style={{ minWidth: '64px' }}
            >
              {/* Highlight background circle for Active tabs */}
              {isActive && !item.highlight && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-x-1 inset-y-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              <div className="relative">
                <Icon
                  id={`nav-icon-${item.id}`}
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isActive ? 'scale-110' : 'scale-100'
                  }`}
                />
                
                {/* Unread message badge counts */}
                {'badge' in item && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white font-mono text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center border-2 border-white dark:border-[#151d30]">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] sm:text-xs mt-1 transition-all duration-200 ${
                isActive ? 'font-medium' : 'font-normal'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
