import { useState, useEffect, useMemo } from 'react';
import { dbService } from '../db/dbService';
import FlutterCodeViewer from './FlutterCodeViewer';
import { useTranslation } from './LanguageContext';
import {
  Users,
  LayoutGrid,
  FileText,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  XCircle,
  Shield,
  Landmark,
  HelpCircle,
  Settings,
  Bell,
  Star,
  Search,
  Filter,
  Eye,
  Trash2,
  Lock,
  Calendar,
  Layers,
  MapPin,
  TrendingUp,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Activity,
  Plus,
  Edit2,
  RefreshCw,
  LogOut,
  Sliders,
  Check,
  Megaphone,
  UserCheck,
  AlertCircle,
  Terminal,
  Code
} from 'lucide-react';
import { formatUserCode } from '../types';

export default function AdminDashboard({ onExit }: { onExit: (targetChatId?: string) => void }) {
  const { language, direction, t } = useTranslation();
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [adminRole, setAdminRole] = useState<'user' | 'moderator' | 'admin' | 'super_admin'>('user');
  const [isLoading, setIsLoading] = useState(true);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [activePanel, setActivePanel] = useState<string>('overview');

  // Lists & State
  const [users, setUsers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [boosts, setBoosts] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<any>(null);

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals & Details Selected elements
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userModalAction, setUserModalAction] = useState<'suspend' | 'ban' | 'role' | 'note' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [suspensionDuration, setSuspensionDuration] = useState('24'); // hours
  const [selectedRole, setSelectedRole] = useState<'user' | 'moderator' | 'admin' | 'super_admin'>('user');

  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [listingModalAction, setListingModalAction] = useState<'hide' | 'remove' | 'boost_cancel' | 'note' | null>(null);

  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showChatProtectionNotice, setShowChatProtectionNotice] = useState(false);
  const [isViewingChatLogs, setIsViewingChatLogs] = useState(false);
  const [reportActionType, setReportActionType] = useState<'resolved' | 'rejected' | 'escalated' | null>(null);

  const [selectedExchange, setSelectedExchange] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketReply, setTicketReply] = useState('');

  // Date Filters
  const [selectedIndicator, setSelectedIndicator] = useState<'users' | 'listings' | 'exchanges' | 'reports'>('users');
  const [dateRangeFilter, setDateRangeFilter] = useState<'today' | '7days' | '30days' | 'all_time'>('7days');

  // App Settings Inputs
  const [settingsName, setSettingsName] = useState('');
  const [settingsEmail, setSettingsEmail] = useState('');
  const [settingsAdsCount, setSettingsAdsCount] = useState(2);
  const [settingsMaintenance, setSettingsMaintenance] = useState(false);

  // Feedback specific states
  const [feedbackSubmissions, setFeedbackSubmissions] = useState<any[]>([]);
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackFilterType, setFeedbackFilterType] = useState('all');
  const [feedbackFilterStatus, setFeedbackFilterStatus] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);

  // New Data Modals
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCatAr, setNewCatAr] = useState('');
  const [newCatEn, setNewCatEn] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('LayoutGrid');

  const [showNewLocationModal, setShowNewLocationModal] = useState(false);
  const [newLocCountry, setNewLocCountry] = useState('JO');
  const [newLocGov, setNewLocGov] = useState('');
  const [newLocCity, setNewLocCity] = useState('');

  const [showNewNoticeModal, setShowNewNoticeModal] = useState(false);
  const [noticeTitleAr, setNoticeTitleAr] = useState('');
  const [noticeTitleEn, setNoticeTitleEn] = useState('');
  const [noticeMsgAr, setNoticeMsgAr] = useState('');
  const [noticeMsgEn, setNoticeMsgEn] = useState('');
  const [noticeAudience, setNoticeAudience] = useState<'all' | 'listing_owners'>('all');

  const [toaster, setToaster] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToaster({ message, type });
    setTimeout(() => setToaster(null), 3000);
  };

  // Fetch initial collections
  const loadStatsAndData = async () => {
    setIsLoading(true);
    try {
      const uid = await dbService.getCurrentUserId();
      if (!uid) {
        showToast("الرجاء تسجيل الدخول أولاً", 'error');
        onExit();
        return;
      }

      const email = await dbService.getCurrentUserEmail();
      let role = await dbService.getCurrentUserRole();

      // Ensure vegro09@gmail.com and baddil.support@gmail.com always have full super_admin access
      const isVerifiedEmail = email.toLowerCase().trim() === 'baddil.support@gmail.com' || email.toLowerCase().trim() === 'vegro09@gmail.com';
      if (isVerifiedEmail && role !== 'super_admin') {
        try {
          await dbService.updateUserRoleAndStatus(uid, 'super_admin', 'active', 'Auto-elevation for Baddil Super Admin Account');
        } catch (e) {
          console.warn("Auto-elevation warning:", e);
        }
        role = 'super_admin';
      }

      const isAuthorized = isVerifiedEmail || role === 'admin' || role === 'super_admin' || role === 'moderator';

      if (!isAuthorized) {
        setIsAccessDenied(true);
        setIsLoading(false);
        return;
      }

      setAdminRole(role);
      const profile = await dbService.getUserProfile(uid);
      setCurrentAdmin(profile);

      // Load all lists
      const [
        allUsers,
        allListings,
        allReports,
        allExchanges,
        allBoosts,
        allRatings,
        allTickets,
        allLogs,
        allAnnouncements,
        allSettings,
        allFeedbacks
      ] = await Promise.all([
        dbService.queryUsersList(),
        dbService.queryListingsList(),
        dbService.queryReportsList(),
        dbService.queryExchangesList(),
        dbService.queryBoostsList(),
        dbService.queryRatingsList(),
        dbService.querySupportTickets(),
        dbService.getAuditLogs(),
        dbService.queryAnnouncementsList(),
        dbService.queryAdminSettings(),
        dbService.getFeedbacks()
      ]);

      setUsers(allUsers);
      setListings(allListings);
      setReports(allReports);
      setExchanges(allExchanges);
      setBoosts(allBoosts);
      setRatings(allRatings);
      setSupportTickets(allTickets);
      setAuditLogs(allLogs);
      setAnnouncements(allAnnouncements);
      setAppSettings(allSettings);
      setFeedbackSubmissions(allFeedbacks);

      if (allSettings) {
        setSettingsName(allSettings.app_name);
        setSettingsEmail(allSettings.support_email);
        setSettingsAdsCount(allSettings.rewarded_ads_required);
        setSettingsMaintenance(allSettings.maintenance_mode);
      }

    } catch (err: any) {
      console.error(err);
      showToast("فشل في تحميل بيانات لوحة التحكم", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatsAndData();
  }, []);

  // Filter application dates helper
  const filteredByDate = (items: any[], dateField: string = 'created_at') => {
    const now = Date.now();
    return items.filter(item => {
      const itemDate = new Date(item[dateField]).getTime();
      if (isNaN(itemDate)) return true;

      if (dateRangeFilter === 'today') {
        return now - itemDate <= 1000 * 60 * 60 * 24;
      } else if (dateRangeFilter === '7days') {
        return now - itemDate <= 1000 * 60 * 60 * 24 * 7;
      } else if (dateRangeFilter === '30days') {
        return now - itemDate <= 1000 * 60 * 60 * 24 * 30;
      } else if (dateRangeFilter === 'all_time') {
        return true;
      }
      return true;
    });
  };

  // Statistics calculation
  const stats = useMemo(() => {
    const todayCutoff = Date.now() - 1000 * 60 * 60 * 24;
    const weekCutoff = Date.now() - 1000 * 60 * 60 * 24 * 7;

    return {
      totalUsers: users.length,
      newUsersToday: users.filter(u => new Date(u.created_at).getTime() >= todayCutoff).length,
      newUsersThisWeek: users.filter(u => new Date(u.created_at).getTime() >= weekCutoff).length,
      activeUsers: users.filter(u => u.status === 'active' || !u.status).length,
      suspendedUsers: users.filter(u => u.status === 'suspended').length,
      bannedUsers: users.filter(u => u.status === 'banned').length,

      totalListings: listings.length,
      activeListings: listings.filter(l => l.status === 'active' || l.is_active).length,
      boostedListings: listings.filter(l => l.is_boosted).length,
      exchangedListings: listings.filter(l => l.status === 'exchanged').length,
      reportedListings: listings.filter(l => l.status === 'reported' || reports.some(r => r.target_type === 'listing' && r.target_id === l.id && r.status === 'open')).length,

      totalExchanges: exchanges.length,
      completedExchanges: exchanges.filter(e => e.status === 'completed').length,
      pendingExchanges: exchanges.filter(e => e.status === 'pending').length,

      totalReports: reports.length,
      openReports: reports.filter(r => r.status === 'open').length,
      resolvedReports: reports.filter(r => r.status === 'resolved').length,

      totalRatings: ratings.length,
      totalTickets: supportTickets.length,
      openTickets: supportTickets.filter(t => t.status === 'open').length,
      totalFeedbacks: feedbackSubmissions.length,
      pendingFeedbacks: feedbackSubmissions.filter(f => f.status === 'pending').length,
    };
  }, [users, listings, reports, exchanges, ratings, supportTickets, feedbackSubmissions]);

  // Dynamic live statistics based on selected time period
  const liveStats = useMemo(() => {
    const now = Date.now();
    const getCutoff = () => {
      if (dateRangeFilter === 'today') return now - 1000 * 60 * 60 * 24;
      if (dateRangeFilter === '7days') return now - 1000 * 60 * 60 * 24 * 7;
      if (dateRangeFilter === '30days') return now - 1000 * 60 * 60 * 24 * 30;
      return 0; // all time
    };
    const cutoff = getCutoff();

    const getItemTime = (item: any) => {
      const d = item.created_at || item.createdAt || item.joinedAt;
      if (!d) return 0;
      if (typeof d === 'object' && d !== null && 'seconds' in d) {
        return d.seconds * 1000;
      }
      if (typeof d?.toDate === 'function') {
        return d.toDate().getTime();
      }
      const t = new Date(d).getTime();
      return isNaN(t) ? 0 : t;
    };

    const filterByCutoff = (items: any[]) => {
      if (cutoff === 0) return items;
      return items.filter(item => getItemTime(item) >= cutoff);
    };

    const periodUsers = filterByCutoff(users);
    const periodListings = filterByCutoff(listings);
    const periodExchanges = filterByCutoff(exchanges);
    const periodReports = filterByCutoff(reports);

    // Sub-metrics within the period
    const activeUsers = periodUsers.filter(u => u.status === 'active' || !u.status).length;
    const activeListings = periodListings.filter(l => l.status === 'active' || l.is_active).length;
    const completedExchanges = periodExchanges.filter(e => e.status === 'completed').length;
    const openReports = periodReports.filter(r => r.status === 'open').length;

    // Subtexts
    let usersSubtext = "";
    let listingsSubtext = "";
    let exchangesSubtext = "";
    let reportsSubtext = "";

    if (dateRangeFilter === 'today') {
      usersSubtext = `منهم ${activeUsers} حساب نشط حالياً اليوم`;
      listingsSubtext = `منها ${activeListings} إعلان نشط مضاف اليوم`;
      exchangesSubtext = `تكللت بالنجاح ${completedExchanges} صفقة مبرمة اليوم`;
      reportsSubtext = `منها ${openReports} شكوى جديدة مفتوحة اليوم`;
    } else if (dateRangeFilter === '7days') {
      usersSubtext = `ينضم ${periodUsers.length} عضو خلال آخر 7 أيام`;
      listingsSubtext = `منها ${activeListings} إعلان نشط آخر 7 أيام`;
      exchangesSubtext = `تكللت بالنجاح ${completedExchanges} صفقة هذا الأسبوع`;
      reportsSubtext = `منها ${openReports} شكوى مفتوحة هذا الأسبوع`;
    } else if (dateRangeFilter === '30days') {
      usersSubtext = `ينضم ${periodUsers.length} عضو خلال آخر 30 يوم`;
      listingsSubtext = `منها ${activeListings} إعلان نشط آخر 30 يوم`;
      exchangesSubtext = `تكللت بالنجاح ${completedExchanges} صفقة هذا الشهر`;
      reportsSubtext = `منها ${openReports} شكوى مفتوحة هذا الشهر`;
    } else {
      // all_time
      usersSubtext = `الحسابات النشطة إجمالاً: ${users.filter(u => u.status === 'active' || !u.status).length}`;
      listingsSubtext = `العروض النشطة المتاحة للجميع: ${listings.filter(l => l.status === 'active' || l.is_active).length}`;
      exchangesSubtext = `الصفقات التي تمت بنجاح مبرم: ${exchanges.filter(e => e.status === 'completed').length}`;
      reportsSubtext = `بلاغات المراقبة المفتوحة حالياً: ${reports.filter(r => r.status === 'open').length}`;
    }

    return {
      usersCount: periodUsers.length,
      listingsCount: periodListings.length,
      exchangesCount: periodExchanges.length,
      reportsCount: periodReports.length,
      usersSubtext,
      listingsSubtext,
      exchangesSubtext,
      reportsSubtext,
    };
  }, [users, listings, exchanges, reports, dateRangeFilter]);

  const filteredFeedbacks = useMemo(() => {
    return feedbackSubmissions.filter(fb => {
      const searchStr = `${fb.username || fb.usernameCode || ''} ${fb.email || ''} ${fb.subject || ''} ${fb.message || ''}`.toLowerCase();
      const matchSearch = searchStr.includes(feedbackSearch.toLowerCase());
      
      const matchType = feedbackFilterType === 'all' ? true : fb.type === feedbackFilterType;
      const matchStatus = feedbackFilterStatus === 'all' ? true : fb.status === feedbackFilterStatus;
      
      return matchSearch && matchType && matchStatus;
    });
  }, [feedbackSubmissions, feedbackSearch, feedbackFilterType, feedbackFilterStatus]);

  const activityChartData = useMemo(() => {
    const data = [
      { day: '01', daysAgoStart: 1,  daysAgoEnd: 0,  users: 0, posts: 0 },
      { day: '05', daysAgoStart: 5,  daysAgoEnd: 2,  users: 0, posts: 0 },
      { day: '10', daysAgoStart: 10, daysAgoEnd: 6,  users: 0, posts: 0 },
      { day: '15', daysAgoStart: 15, daysAgoEnd: 11, users: 0, posts: 0 },
      { day: '20', daysAgoStart: 20, daysAgoEnd: 16, users: 0, posts: 0 },
      { day: '25', daysAgoStart: 25, daysAgoEnd: 21, users: 0, posts: 0 },
      { day: '30', daysAgoStart: 30, daysAgoEnd: 26, users: 0, posts: 0 }
    ];

    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const getDaysAgo = (dateValue: any) => {
      if (!dateValue) return 999;
      let d: Date;
      if (typeof dateValue === 'object' && dateValue !== null && 'seconds' in dateValue) {
        d = new Date((dateValue as any).seconds * 1000);
      } else if (typeof dateValue?.toDate === 'function') {
        d = dateValue.toDate();
      } else {
        d = new Date(dateValue);
      }
      if (isNaN(d.getTime())) return 999;
      const diffTime = now.getTime() - d.getTime();
      return Math.floor(diffTime / oneDayMs);
    };

    users.forEach(u => {
      const dateVal = u.created_at || u.createdAt || u.joinedAt;
      const daysAgo = getDaysAgo(dateVal);
      const item = data.find(d => daysAgo >= d.daysAgoEnd && daysAgo <= d.daysAgoStart);
      if (item) {
        item.users++;
      }
    });

    listings.forEach(l => {
      const dateVal = l.created_at || l.createdAt;
      const daysAgo = getDaysAgo(dateVal);
      const item = data.find(d => daysAgo >= d.daysAgoEnd && daysAgo <= d.daysAgoStart);
      if (item) {
        item.posts++;
      }
    });

    const maxVal = Math.max(...data.map(d => Math.max(d.users, d.posts)), 1);

    return {
      items: data,
      maxVal
    };
  }, [users, listings]);

  // Dynamic Cumulative Growth Trend calculations for each metric
  const trendData = useMemo(() => {
    const getItemTime = (item: any) => {
      const d = item.created_at || item.createdAt || item.joinedAt;
      if (!d) return 0;
      if (typeof d === 'object' && d !== null && 'seconds' in d) {
        return d.seconds * 1000;
      }
      if (typeof d?.toDate === 'function') {
        return d.toDate().getTime();
      }
      const t = new Date(d).getTime();
      return isNaN(t) ? 0 : t;
    };

    const getCumulativeTrend = (items: any[]) => {
      const now = Date.now();
      let markers = [30, 25, 20, 15, 10, 5, 0];
      let unitMs = 24 * 60 * 60 * 1000;
      let startCutoff = now - 30 * 24 * 60 * 60 * 1000;

      if (dateRangeFilter === 'today') {
        markers = [24, 20, 16, 12, 8, 4, 0];
        unitMs = 60 * 60 * 1000;
        startCutoff = now - 24 * 60 * 60 * 1000;
      } else if (dateRangeFilter === '7days') {
        markers = [6, 5, 4, 3, 2, 1, 0];
        unitMs = 24 * 60 * 60 * 1000;
        startCutoff = now - 7 * 24 * 60 * 60 * 1000;
      } else if (dateRangeFilter === '30days') {
        markers = [30, 25, 20, 15, 10, 5, 0];
        unitMs = 24 * 60 * 60 * 1000;
        startCutoff = now - 30 * 24 * 60 * 60 * 1000;
      } else {
        // all_time (last 6 months)
        markers = [180, 150, 120, 90, 60, 30, 0];
        unitMs = 24 * 60 * 60 * 1000;
        startCutoff = 0; // all time
      }

      // Filter items to only those created in the selected period (or all if all_time)
      const periodItems = items.filter(item => {
        const t = getItemTime(item);
        return t >= startCutoff;
      });

      // Now map markers to cumulative counts within this period
      const realTrend = markers.map(val => {
        const markerTime = now - val * unitMs;
        return periodItems.filter(item => {
          const t = getItemTime(item);
          return t <= markerTime;
        }).length;
      });

      return realTrend;
    };

    const usersTr = getCumulativeTrend(users);
    const listingsTr = getCumulativeTrend(listings);
    const exchangesTr = getCumulativeTrend(exchanges);
    const reportsTr = getCumulativeTrend(reports);

    return {
      users: usersTr,
      listings: listingsTr,
      exchanges: exchangesTr,
      reports: reportsTr,
    };
  }, [users, listings, exchanges, reports, dateRangeFilter]);

  // Timeline labels for X-axis
  const chartTimelineLabels = useMemo(() => {
    if (dateRangeFilter === 'today') {
      return ["24س", "20س", "16س", "12س", "8س", "4س", "الآن"];
    }
    if (dateRangeFilter === '7days') {
      return ["قبل 6 أيام", "قبل 5 أيام", "قبل 4 أيام", "قبل 3 أيام", "قبل يومين", "أمس", "اليوم"];
    }
    if (dateRangeFilter === '30days') {
      return ["01", "05", "10", "15", "20", "25", "30"];
    }
    return ["6 أشهر", "5 أشهر", "4 أشهر", "3 أشهر", "شهرين", "الشهر الماضي", "الآن"];
  }, [dateRangeFilter]);

  const activeTrendPoints = useMemo(() => {
    const activeTrend = selectedIndicator === 'users' ? trendData.users
                    : selectedIndicator === 'listings' ? trendData.listings
                    : selectedIndicator === 'exchanges' ? trendData.exchanges
                    : trendData.reports;

    const maxVal = Math.max(...activeTrend, 1);
    
    const X_COORDS = [100, 240, 380, 520, 660, 800, 940];
    
    const pts = activeTrend.map((val, idx) => {
      // Y coordinates: Y=200 is 0%, Y=40 is 100%
      const y = 200 - (val / maxVal) * 150; 
      return { x: X_COORDS[idx], y, value: val };
    });

    const getBezierPath = (pointsArray: typeof pts) => {
      if (pointsArray.length === 0) return '';
      let d = `M ${pointsArray[0].x},${pointsArray[0].y}`;
      for (let i = 0; i < pointsArray.length - 1; i++) {
        const curr = pointsArray[i];
        const next = pointsArray[i + 1];
        const cpX1 = curr.x + (next.x - curr.x) / 3;
        const cpY1 = curr.y;
        const cpX2 = curr.x + 2 * (next.x - curr.x) / 3;
        const cpY2 = next.y;
        d += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${next.x},${next.y}`;
      }
      return d;
    };

    const linePath = getBezierPath(pts);
    const areaPath = pts.length > 0 ? `${linePath} L ${pts[pts.length - 1].x},200 L ${pts[0].x},200 Z` : '';

    return {
      pts,
      linePath,
      areaPath,
      maxVal
    };
  }, [selectedIndicator, trendData]);

  const indicatorConfig = useMemo(() => {
    const config = {
      users: {
        color: '#3b82f6',
        fillId: 'grad-blue-fill',
        strokeWidth: 4.5,
        dashArray: '',
        label: 'إجمالي الأعضاء الرقميين',
        unit: 'عضو'
      },
      listings: {
        color: '#10b981',
        fillId: 'grad-emerald-fill',
        strokeWidth: 4,
        dashArray: '8,5',
        label: 'إعلانات المقايضة المعروضة',
        unit: 'إعلان'
      },
      exchanges: {
        color: '#a855f7',
        fillId: 'grad-purple-fill',
        strokeWidth: 4,
        dashArray: '2,4',
        label: 'المقايضات والصفقات المعالجة',
        unit: 'صفقة'
      },
      reports: {
        color: '#f43f5e',
        fillId: 'grad-rose-fill',
        strokeWidth: 3.5,
        dashArray: '14,4,3,4',
        label: 'الشكاوى وبلاغات المراقبة المعلقة',
        unit: 'بلاغ'
      }
    };
    return config[selectedIndicator];
  }, [selectedIndicator]);

  const handleUpdateFeedbackStatus = async (id: string, status: 'pending' | 'under_review' | 'resolved' | 'rejected') => {
    try {
      await dbService.updateFeedbackStatus(id, status);
      showToast("تم تحديث حالة الشكوى/الاقتراح بنجاح", 'success');
      setSelectedFeedback((prev: any) => prev ? { ...prev, status } : null);
      await loadStatsAndData();
    } catch (e) {
      showToast("فشل في تحديث حالة الشكوى/الاقتراح", 'error');
    }
  };

  // Handle User Action
  const handleUserActionSubmit = async () => {
    if (!selectedUser || !userModalAction) return;
    if (!actionReason.trim()) {
      showToast("يرجى ذكر سبب الإجراء الإشرافي", 'error');
      return;
    }

    try {
      if (userModalAction === 'suspend') {
        const hoursObj = parseInt(suspensionDuration, 10) || 24;
        await dbService.updateUserRoleAndStatus(selectedUser.id, selectedUser.role || 'user', 'suspended', actionReason, hoursObj);
        showToast("تم تطبيق تعليق الحساب المؤقت بنجاح", 'success');
      } else if (userModalAction === 'ban') {
        await dbService.updateUserRoleAndStatus(selectedUser.id, selectedUser.role || 'user', 'banned', actionReason);
        showToast("تم حظر الحساب نهائياً بنجاح", 'success');
      } else if (userModalAction === 'role') {
        if (adminRole !== 'admin' && adminRole !== 'super_admin') {
          showToast("عذراً، فقط المدير يحمل صلاحية تعديل الرتب الإدارية", 'error');
          return;
        }
        await dbService.updateUserRoleAndStatus(selectedUser.id, selectedRole, selectedUser.status || 'active', actionReason);
        showToast("تم تعديل الصلاحية الإدارية بنجاح", 'success');
      } else if (userModalAction === 'note') {
        await dbService.addAdminNote(currentAdmin.id, currentAdmin.display_name, 'user', selectedUser.id, actionReason);
        showToast("تم تسجيل الملاحظة الإدارية بنجاح", 'success');
      }

      setUserModalAction(null);
      setActionReason('');
      setSelectedUser(null);
      await loadStatsAndData(); // refresh
    } catch (e) {
      showToast("فشلت العملية، يرجى المحاولة لاحقاً", 'error');
    }
  };

  // Remove Suspension / Restore User
  const handleRestoreUser = async (user: any) => {
    if (!window.confirm("هل أنت متأكد من إلغاء تعليق الحساب الحذر وإرجاعه للوضع النشط؟")) return;
    try {
      await dbService.updateUserRoleAndStatus(user.id, user.role || 'user', 'active', "إلغاء حظر يدوي من المشرف");
      showToast("تمت إعادة تنشيط الحساب بنجاح", 'success');
      await loadStatsAndData();
    } catch (e) {
      showToast("فشل التنشيط", 'error');
    }
  };

  // Handle Listing moderation action
  const handleListingActionSubmit = async () => {
    if (!selectedListing || !listingModalAction) return;
    if (!actionReason.trim()) {
      showToast("يرجى تدوين سبب تفعيل هذا الإجراء الإشرافي لحفظ الحقوق بالأرشيف", 'error');
      return;
    }

    try {
      if (listingModalAction === 'hide') {
        await dbService.updateListingModeration(selectedListing.id, 'hidden_by_admin', actionReason);
        showToast("تم حجب الإعلان بنجاح للجمهور", 'success');
      } else if (listingModalAction === 'remove') {
        await dbService.updateListingModeration(selectedListing.id, 'removed', actionReason);
        showToast("تم إزالة الإعلان بنجاح وتحويله للأرشيف المقفل", 'success');
      } else if (listingModalAction === 'boost_cancel') {
        await dbService.cancelListingBoostAdmin(selectedListing.id, actionReason);
        showToast("تم إلغاء التمويل المميز لهذا الإعلان بنجاح وإرجاعه للمستوى العادي", 'success');
      } else if (listingModalAction === 'note') {
        await dbService.addAdminNote(currentAdmin.id, currentAdmin.display_name, 'listing', selectedListing.id, actionReason);
        showToast("تمت إضافة ملاحظة الإشراف والرقابة بنجاح", 'success');
      }

      setListingModalAction(null);
      setActionReason('');
      setSelectedListing(null);
      await loadStatsAndData();
    } catch (e) {
      showToast("فشلت العملية", 'error');
    }
  };

  const handleRestoreListing = async (listing: any) => {
    if (!window.confirm("هل ترغب في إعادة تنشيط الإعلان للاكتشاف العام مجدداً؟")) return;
    try {
      await dbService.updateListingModeration(listing.id, 'active', "تنشيط يدوي من الإدارة");
      showToast("تمت إعادة تنشيط الإعلان للعموم بنجاح", 'success');
      await loadStatsAndData();
    } catch (e) {
      showToast("فشل التنشيط", 'error');
    }
  };

  // Handle Report actions
  const handleReportActionSubmit = async (status: 'resolved' | 'rejected' | 'escalated') => {
    if (!selectedReport) return;
    if (!actionReason.trim()) {
      showToast("يرجى كتابة تبرير الإشراف لحماية النزاهة في التدقيق", 'error');
      return;
    }

    try {
      await dbService.updateReportStatus(selectedReport.id, status, actionReason, currentAdmin.id);
      showToast(`تم تحديث التقرير بنجاح وتبديله إلى حالة: ${status === 'resolved' ? 'تم الحل والتدخل' : status === 'rejected' ? 'مرفوض كإبلاغ كيدي' : 'مصعد للقيادة العليا'}`, 'success');
      setSelectedReport(null);
      setReportActionType(null);
      setActionReason('');
      await loadStatsAndData();
    } catch (e) {
      showToast("فشل إجراء التحديث للتقرير", 'error');
    }
  };

  // Start a private chat with the reporter/complainant of a report
  const handleStartReportChat = async (rep: any) => {
    try {
      showToast("جاري إنشاء المحادثة مع مقدم البلاغ...", "info");
      const reasonLabel = rep.reason === 'fraud_or_scam' ? 'احتيال/محتوى احتيالي' : rep.reason === 'fake' ? 'إعلان زائف' : rep.reason === 'harassment' ? 'مضايقة وشماتة' : rep.reason;
      const cid = await dbService.startOrGetChat(
        'report_' + rep.id, 
        rep.reporter_user_id, 
        `متابعة بلاغ: ${reasonLabel}`
      );
      showToast("تم فتح المحادثة بنجاح، جاري التحويل...", "success");
      onExit(cid);
    } catch (e: any) {
      console.error(e);
      showToast(`فشل في فتح المحادثة: ${e.message || String(e)}`, "error");
    }
  };

  // Start a private chat with the user who submitted feedback/suggestion
  const handleStartFeedbackChat = async (fb: any) => {
    try {
      showToast("جاري إنشاء المحادثة مع مقدم الطلب...", "info");
      const cid = await dbService.startOrGetChat(
        'feedback_' + fb.id, 
        fb.userId, 
        `متابعة طلب: ${fb.subject}`
      );
      showToast("تم فتح المحادثة بنجاح، جاري التحويل...", "success");
      onExit(cid);
    } catch (e: any) {
      console.error(e);
      showToast(`فشل في فتح المحادثة: ${e.message || String(e)}`, "error");
    }
  };

  // Start a direct private chat with any user from the users table
  const handleStartDirectUserChat = async (user: any) => {
    try {
      showToast("جاري إنشاء المحادثة المباشرة مع العضو...", "info");
      const cid = await dbService.startOrGetChat(
        'admin_chat_' + user.id, 
        user.id, 
        `تواصل إشرافي مباشر مع الإدارة`
      );
      showToast("تم فتح المحادثة بنجاح، جاري التحويل...", "success");
      onExit(cid);
    } catch (e: any) {
      console.error(e);
      showToast(`فشل في فتح المحادثة المباشرة: ${e.message || String(e)}`, "error");
    }
  };

  // Safe Chat logs auditor tracking
  const handleViewProtectedReportChat = async () => {
    if (!selectedReport) return;
    setIsViewingChatLogs(true);
    setShowChatProtectionNotice(false);

    // Write an instant audit logs entry for maximum security of private conversation access checks
    try {
      await dbService.createAuditLog(
        currentAdmin.id,
        currentAdmin.display_name,
        'view_private_chat_logs',
        'report',
        selectedReport.id,
        null,
        { reason: `تفتيش رسائل المحادثة المرتبطة بالتقرير رقم ${selectedReport.id}` },
        "مراجعة إشرافية إلزامية لتدقيق البلاغ أو الخلاف الثنائي"
      );
      showToast("🔒 تم تسجيل وصولك لرسائل المحادثة في أرشيف الحماية للمنصة", 'info');
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Ticket Replies
  const handleTicketReplySubmit = async () => {
    if (!selectedTicket || !ticketReply.trim()) return;
    try {
      await dbService.replySupportTicket(selectedTicket.id, ticketReply);
      showToast("تم إرسال رد الإدارة إلى العميل بنجاح", 'success');
      setTicketReply('');
      setSelectedTicket(null);
      await loadStatsAndData();
    } catch (e) {
      showToast("فشل إرسال الرد", 'error');
    }
  };

  // App Settings Save Toggle (Admins/Managers ONLY)
  const handleSaveSettings = async () => {
    if (adminRole !== 'admin' && adminRole !== 'super_admin') {
      showToast("عذراً، يحق فقط للمدير تغيير الإعدادات العالمية للمنصة", 'error');
      return;
    }
    try {
      await dbService.updateAdminSettings({
        app_name: settingsName,
        support_email: settingsEmail,
        rewarded_ads_required: parseInt(settingsAdsCount as any, 10) || 3,
        maintenance_mode: settingsMaintenance
      });
      showToast("تم تحديث إعدادات تطبيق البديل وبنية الخادم العالمية بنجاح", 'success');
      await loadStatsAndData();
    } catch (e) {
      showToast("فشل الحفظ", 'error');
    }
  };

  // Category Creators Setup
  const handleAddCategorySubmit = async () => {
    if (!newCatAr.trim() || !newCatEn.trim()) {
      showToast("يرجى كتابة اسم التصنيف باللغتين العربية والانجليزية", 'error');
      return;
    }
    try {
      // In this system structure, custom category additions compile smoothly setting custom nodes in Admin settings. Let's record the audit log and append to settings config
      const appConf = await dbService.queryAdminSettings();
      const updatedList = [...(appConf as any).custom_categories || [], { ar: newCatAr, en: newCatEn, icon: newCatIcon }];
      await dbService.updateAdminSettings({ custom_categories: updatedList } as any);
      showToast("تم إضافة التصنيف الجديد بنجاح", 'success');
      setShowNewCategoryModal(false);
      setNewCatAr('');
      setNewCatEn('');
      await loadStatsAndData();
    } catch (e) {
      showToast("فشلت العملية", 'error');
    }
  };

  // Location Creators Setup
  const handleAddLocationSubmit = async () => {
    if (!newLocGov.trim() || !newLocCity.trim()) {
      showToast("يرجى ملء كافة تفاصيل المحافظة والمدينة الجغرافية", 'error');
      return;
    }
    try {
      const appConf = await dbService.queryAdminSettings();
      const updatedLocs = [...(appConf as any).custom_locations || [], { country: newLocCountry, governorate: newLocGov, city: newLocCity }];
      await dbService.updateAdminSettings({ custom_locations: updatedLocs } as any);
      showToast("تم تسجيل النطاق الجغرافي وبطاقات المدن بنجاح", 'success');
      setShowNewLocationModal(false);
      setNewLocGov('');
      setNewLocCity('');
      await loadStatsAndData();
    } catch (e) {
      showToast("فشل التسجيل الجغرافي", 'error');
    }
  };

  // Custom System Announcement Sender
  const handleSendNoticeSubmit = async () => {
    if (!noticeTitleAr.trim() || !noticeMsgAr.trim()) {
      showToast("يرجى ملء العنوان والنص التوجيهي بالعربية على الأقل للعموم", 'error');
      return;
    }
    try {
      await dbService.createAnnouncement({
        title_ar: noticeTitleAr,
        title_en: noticeTitleEn || noticeTitleAr,
        message_ar: noticeMsgAr,
        message_en: noticeMsgEn || noticeMsgAr,
        audience: noticeAudience,
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 week
        status: 'active'
      });
      showToast("📢 تم تسجيل وبث التنويه العام بنجاح للمنصة", 'success');
      setShowNewNoticeModal(false);
      setNoticeTitleAr('');
      setNoticeMsgAr('');
      await loadStatsAndData();
    } catch (e) {
      showToast("فشل بث التوجيه", 'error');
    }
  };


  // Custom Filters & Searches Applied
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const searchableStr = `${u.display_name} ${formatUserCode(u.username, u.id)} ${u.email_visible || ''} ${u.country || ''} ${u.city || ''}`.toLowerCase();
      const matchSearch = searchableStr.includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === 'all' ? true : u.status === filterStatus;
      const matchRole = filterRole === 'all' 
        ? true 
        : filterRole === 'admin'
          ? (u.role === 'admin' || u.role === 'super_admin' || u.role === 'moderator')
          : u.role === filterRole;
      return matchSearch && matchStatus && matchRole;
    });
  }, [users, searchQuery, filterStatus, filterRole]);

  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      const searchableStr = `${l.title} ${l.id} ${l.category} ${l.country || ''} ${l.city || ''}`.toLowerCase();
      const matchSearch = searchableStr.includes(searchQuery.toLowerCase());
      const matchCategory = filterCategory === 'all' ? true : l.category === filterCategory;
      const matchStatus = filterStatus === 'all' ? true : l.status === filterStatus;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [listings, searchQuery, filterCategory, filterStatus]);

  const reportedTimeline = useMemo(() => {
    return reports.filter(r => {
      if (filterStatus === 'all') return true;
      return r.status === filterStatus;
    });
  }, [reports, filterStatus]);


  // Pagination Calculators
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredListings.slice(start, start + itemsPerPage);
  }, [filteredListings, currentPage]);


  // Helper translator role badge
  const renderRoleBadge = (role: string) => {
    if (role === 'admin' || role === 'super_admin' || role === 'moderator') {
      return (
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          مدير
        </span>
      );
    }
    return (
      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
        عضو طبيعي
      </span>
    );
  };

  const renderStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      'active': { label: 'نشط آمن', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
      'suspended': { label: 'معلق مؤقتاً', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
      'banned': { label: 'محظور نهائياً', cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
      'deleted': { label: 'محذوف سوفت', cls: 'bg-slate-105 text-slate-500 border border-slate-200' },
    };
    const target = map[status] || map['active'];
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${target.cls}`}>
        {target.label}
      </span>
    );
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center items-center font-sans space-y-4">
        <RefreshCw className="h-10 w-10 text-emerald-600 animate-spin" />
        <p className="text-sm font-black text-slate-500 animate-pulse">جاري فحص تصاريح الحماية وتجميع سجلات الإشراف...</p>
      </div>
    );
  }

  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center items-center font-sans p-6 text-center space-y-6" dir="rtl">
        <div className="h-20 w-20 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 text-3xl animate-pulse">
          <Shield className="h-10 w-10 text-rose-500" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-xl font-black text-slate-800">
            {language === 'ar' ? 'عذراً، تم رفض الوصول!' : 'Access Denied!'}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {language === 'ar' 
              ? 'تتطلب لوحة تحكم بَدِل الإدارية صلاحيات مسؤول خادم نشطة ومطابقة شروط أمان الخصوصية. يقتصر الوصول على البريد الإلكتروني المعتمد والرتبة المطلوبة.' 
              : 'The BADDIL Admin Panel requires active server administrator permissions and privacy compliance. Access is strictly limited to the authorized email address and role.'}
          </p>
          <div className="bg-white border border-slate-100 p-4 rounded-2xl text-xs font-mono text-slate-500 space-y-1.5 text-right shadow-sm" dir="rtl">
            <div>• البريد الإلكتروني المطلوب: <span className="text-slate-800 font-bold">baddil.support@gmail.com</span></div>
            <div>• الرتبة المطلوبة: <span className="text-rose-600 font-bold">admin</span></div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onExit}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-6 rounded-xl transition cursor-pointer shadow-sm"
          >
            {language === 'ar' ? 'العودة للتطبيق' : 'Back to App'}
          </button>
          <button
            onClick={async () => {
              await dbService.logout();
              onExit();
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition cursor-pointer shadow-sm"
          >
            {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased admin-light-mode-container" dir="rtl">
      
      <style>{`
        /* Overrides to force pristine light mode styling in Admin Dashboard */
        .admin-light-mode-container input, 
        .admin-light-mode-container select, 
        .admin-light-mode-container textarea {
          background-color: #ffffff !important;
          color: #1e293b !important;
          border-color: #f1f5f9 !important;
        }
        .admin-light-mode-container table {
          color: #334155 !important;
        }
        .admin-light-mode-container th {
          background-color: #f8fafc !important;
          color: #64748b !important;
          border-bottom-color: #f1f5f9 !important;
        }
        .admin-light-mode-container tr {
          border-bottom-color: #f1f5f9 !important;
        }
        .admin-light-mode-container tr:hover {
          background-color: #f8fafc !important;
        }
        .admin-light-mode-container .bg-slate-950 {
          background-color: #ffffff !important;
          color: #1e293b !important;
          border-color: #f1f5f9 !important;
        }
        .admin-light-mode-container .bg-slate-900 {
          background-color: #f8fafc !important;
          color: #1e293b !important;
          border-color: #f1f5f9 !important;
        }
        .admin-light-mode-container .border-slate-800 {
          border-color: #f1f5f9 !important;
        }
        .admin-light-mode-container .text-white {
          color: #1e293b !important;
        }
        .admin-light-mode-container .text-slate-100 {
          color: #1e293b !important;
        }
        .admin-light-mode-container .text-slate-200 {
          color: #334155 !important;
        }
        .admin-light-mode-container .text-slate-300 {
          color: #475569 !important;
        }
        .admin-light-mode-container .text-slate-400 {
          color: #64748b !important;
        }
        .admin-light-mode-container .text-slate-450 {
          color: #64748b !important;
        }
        .admin-light-mode-container .text-rose-400 {
          color: #e11d48 !important;
        }
        .admin-light-mode-container .bg-rose-955 {
          background-color: #ffe4e6 !important;
        }
        .admin-light-mode-container .bg-rose-955\/40 {
          background-color: #fff1f2 !important;
        }
        .admin-light-mode-container .text-emerald-400 {
          color: #059669 !important;
        }
        .admin-light-mode-container .bg-emerald-950\/40 {
          background-color: #ecfdf5 !important;
        }
        .admin-light-mode-container .bg-blue-950\/40 {
          background-color: #eff6ff !important;
        }
        .admin-light-mode-container .bg-purple-950\/40 {
          background-color: #faf5ff !important;
        }
        .admin-light-mode-container .text-blue-400 {
          color: #2563eb !important;
        }
        .admin-light-mode-container .text-purple-400 {
          color: #9333ea !important;
        }
      `}</style>
      
      {/* Toast Notification System */}
      {toaster && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-slate-100 p-4 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <AlertCircle className={`h-5 w-5 ${toaster.type === 'error' ? 'text-rose-500' : 'text-emerald-500'}`} />
          <span className="text-xs font-black text-slate-800">{toaster.message}</span>
        </div>
      )}

      {/* Top Professional Admin Navbar */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex flex-wrap gap-4 items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 text-white p-2 rounded-xl shadow-md shadow-emerald-700/10">
            <Landmark className="h-5 w-5 rotate-3" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-800 flex items-center gap-1.5">
              <span>{t('brand.title')}</span>
              <span className="text-[10px] uppercase font-mono tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded font-black">لوحة الإشراف</span>
            </h1>
            <p className="text-[10px] text-slate-500">
              مرحباً بك، <span className="font-bold text-slate-700">{currentAdmin?.display_name}</span> ({renderRoleBadge(adminRole)})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (window.confirm("الرجاء تشغيل وضع تصفية الحسابات بشكل يدوي؟")) {
                loadStatsAndData();
              }
            }}
            className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition"
            title="تحديث البيانات"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            onClick={onExit}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm shadow-emerald-600/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>العودة للتطبيق</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Collapsible/Scrollable Sidebar Content */}
        <aside className="w-full md:w-64 bg-white border-l border-slate-100 p-4 shrink-0 flex flex-col space-y-1 shadow-sm">
          
          <div className="text-[10px] uppercase tracking-wider text-slate-450 text-slate-400 font-bold mb-3 px-3">
            الأقسام والإشراف
          </div>

          {[
            { id: 'overview', label: 'لوحة التحكم والعدادات', icon: Activity },
            { id: 'users', label: 'المستخدمين والأعضاء', icon: Users },
            { id: 'listings', label: 'السلع والإعلانات المعروضة', icon: LayoutGrid },
            { id: 'reports', label: 'بلاغات الشكاوى والنزاهة', icon: AlertTriangle, badgeCount: stats.openReports },
            { id: 'boosts', label: 'التمويلات المميزة', icon: TrendingUp },
            { id: 'ratings', label: 'تقييمات النجوم والموثوقية', icon: Star },
            { id: 'feedback_submissions', label: 'الشكاوى والاقتراحات والدعم', icon: HelpCircle, badgeCount: stats.pendingFeedbacks },
            { id: 'settings', label: 'إعدادات النظام العامة', icon: Settings },
            { id: 'flutter_source_code', label: 'كود تطبيق فلاتر الإداري 👑', icon: Code },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => {
                setActivePanel(p.id);
                setCurrentPage(1);
                setSearchQuery('');
                setFilterStatus('all');
                setFilterRole('all');
              }}
              className={`flex items-center justify-between text-xs font-bold py-2.5 px-4 rounded-xl transition ${
                activePanel === p.id 
                  ? 'bg-emerald-50 text-emerald-800 border-r-4 border-emerald-500 font-bold' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <p.icon className={`h-4 w-4 ${activePanel === p.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{p.label}</span>
              </div>
              {p.badgeCount && p.badgeCount > 0 ? (
                <span className="bg-rose-500 text-white rounded-full text-[9px] font-black tracking-tighter px-1.5 py-0.5">
                  {p.badgeCount}
                </span>
              ) : null}
            </button>
          ))}
        </aside>

        {/* Dynamic Panel Content Stage */}
        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* Active Navigation Panel Renderer */}

          {activePanel === 'overview' && (
            <div className="space-y-6">
              
              {/* Stats Grid Matrix */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                <button
                  onClick={() => setSelectedIndicator('users')}
                  className={`bg-white border p-5 rounded-3xl space-y-2 hover:shadow-md transition shadow-sm text-right w-full block duration-300 relative overflow-hidden ${
                    selectedIndicator === 'users' 
                      ? 'border-blue-500 ring-4 ring-blue-100 bg-blue-50/20 scale-[1.02] shadow-md' 
                      : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50/30'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500">إجمالي الأعضاء الرقميين</span>
                    <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600 border border-blue-100">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-xl font-black text-slate-800">{liveStats.usersCount}</div>
                  <div className="text-[10px] text-slate-500">
                    {liveStats.usersSubtext}
                  </div>
                  {selectedIndicator === 'users' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>
                  )}
                </button>

                <button
                  onClick={() => setSelectedIndicator('listings')}
                  className={`bg-white border p-5 rounded-3xl space-y-2 hover:shadow-md transition shadow-sm text-right w-full block duration-300 relative overflow-hidden ${
                    selectedIndicator === 'listings' 
                      ? 'border-emerald-500 ring-4 ring-emerald-100 bg-emerald-50/20 scale-[1.02] shadow-md' 
                      : 'border-slate-100 hover:border-emerald-200 hover:bg-slate-50/30'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500">إعلانات المقايضة المعروضة</span>
                    <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600 border border-emerald-100">
                      <LayoutGrid className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-xl font-black text-slate-800">{liveStats.listingsCount}</div>
                  <div className="text-[10px] text-slate-500">
                    {liveStats.listingsSubtext}
                  </div>
                  {selectedIndicator === 'listings' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
                  )}
                </button>

                <button
                  onClick={() => setSelectedIndicator('exchanges')}
                  className={`bg-white border p-5 rounded-3xl space-y-2 hover:shadow-md transition shadow-sm text-right w-full block duration-300 relative overflow-hidden ${
                    selectedIndicator === 'exchanges' 
                      ? 'border-purple-500 ring-4 ring-purple-100 bg-purple-50/20 scale-[1.02] shadow-md' 
                      : 'border-slate-100 hover:border-purple-200 hover:bg-slate-50/30'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500">المقايضات والصفقات</span>
                    <div className="bg-purple-50 p-1.5 rounded-lg text-purple-600 border border-purple-100">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-xl font-black text-slate-800">{liveStats.exchangesCount}</div>
                  <div className="text-[10px] text-slate-500">
                    {liveStats.exchangesSubtext}
                  </div>
                  {selectedIndicator === 'exchanges' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500"></div>
                  )}
                </button>

                <button
                  onClick={() => setSelectedIndicator('reports')}
                  className={`bg-white border p-5 rounded-3xl space-y-2 hover:shadow-md transition shadow-sm text-right w-full block duration-300 relative overflow-hidden ${
                    selectedIndicator === 'reports' 
                      ? 'border-rose-500 ring-4 ring-rose-100 bg-rose-50/20 scale-[1.02] shadow-md' 
                      : 'border-slate-100 hover:border-rose-200 hover:bg-slate-50/30'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500">شكاوى وبلاغات المراقبة</span>
                    <div className="bg-rose-50 p-1.5 rounded-lg text-rose-600 border border-rose-100">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-xl font-black text-slate-800">{liveStats.reportsCount}</div>
                  <div className="text-[10px] text-slate-500">
                    {liveStats.reportsSubtext}
                  </div>
                  {selectedIndicator === 'reports' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500"></div>
                  )}
                </button>

              </div>
              
              {/* Unified Analytics Panel & Custom Visual Charts */}
              <div className="space-y-6">
                
                {/* Visual Custom Chart for Database Trends - Wide Unified Panel */}
                <div id="unified-growth-analytics" className="bg-white border border-slate-100 p-6 rounded-3xl space-y-6 shadow-sm w-full animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 id="growth-chart-title" className="text-sm font-black text-slate-800 flex items-center gap-2 flex-wrap">
                        <span>مؤشر نمو الأداء:</span>
                        <span 
                          className="px-2.5 py-0.5 rounded-xl text-xs font-black border shadow-sm transition-colors duration-300"
                          style={{
                            color: indicatorConfig.color,
                            backgroundColor: `${indicatorConfig.color}10`,
                            borderColor: `${indicatorConfig.color}30`
                          }}
                        >
                          {indicatorConfig.label}
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {dateRangeFilter === 'today' && "تتبع تصاعدي تفاعلي لنمو مؤشرات المنصة الرئيسية خلال الـ 24 ساعة الماضية (الملخص اليومي)"}
                        {dateRangeFilter === '7days' && "تتبع تصاعدي تفاعلي لنمو مؤشرات المنصة الرئيسية خلال الـ 7 أيام الماضية"}
                        {dateRangeFilter === '30days' && "تتبع تصاعدي تفاعلي لنمو مؤشرات المنصة الرئيسية خلال الـ 30 يوماً الماضية"}
                        {dateRangeFilter === 'all_time' && "تتبع تصاعدي تفاعلي لنمو مؤشرات المنصة الرئيسية لجميع الأوقات الموثقة"}
                      </p>
                    </div>
                    
                    {/* Arabic Text Legend with Custom Theme color indicators */}
                    <div id="chart-legend" className="flex flex-wrap gap-2 items-center text-[10px] sm:text-[11px] font-black">
                      <button
                        onClick={() => setSelectedIndicator('users')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-300 ${
                          selectedIndicator === 'users'
                            ? 'text-blue-800 bg-blue-50 border-blue-200 shadow-sm scale-105 font-black'
                            : 'text-slate-400 bg-slate-50/50 border-slate-100 hover:text-slate-600 hover:bg-slate-100/50'
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                        الأعضاء <span className="text-blue-600 font-bold">↗</span>
                      </button>
                      <button
                        onClick={() => setSelectedIndicator('listings')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-300 ${
                          selectedIndicator === 'listings'
                            ? 'text-emerald-800 bg-emerald-50 border-emerald-200 shadow-sm scale-105 font-black'
                            : 'text-slate-400 bg-slate-50/50 border-slate-100 hover:text-slate-600 hover:bg-slate-100/50'
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        إعلانات المقايضة <span className="text-emerald-600 font-bold">↗</span>
                      </button>
                      <button
                        onClick={() => setSelectedIndicator('exchanges')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-300 ${
                          selectedIndicator === 'exchanges'
                            ? 'text-purple-800 bg-purple-50 border-purple-200 shadow-sm scale-105 font-black'
                            : 'text-slate-400 bg-slate-50/50 border-slate-100 hover:text-slate-600 hover:bg-slate-100/50'
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                        المقايضات <span className="text-purple-600 font-bold">↗</span>
                      </button>
                      <button
                        onClick={() => setSelectedIndicator('reports')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-300 ${
                          selectedIndicator === 'reports'
                            ? 'text-rose-800 bg-rose-50 border-rose-200 shadow-sm scale-105 font-black'
                            : 'text-slate-400 bg-slate-50/50 border-slate-100 hover:text-slate-600 hover:bg-slate-100/50'
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                        الشكاوى وبلاغات <span className="text-rose-600 font-bold">↗</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* High-Fidelity SVG Dynamic Trend Line Growth Chart */}
                  <div className="h-64 sm:h-72 w-full bg-slate-50/40 border border-slate-100 rounded-2xl relative p-4 flex items-center justify-center">
                    <svg viewBox="0 0 1000 240" className="w-full h-full" dir="ltr" preserveAspectRatio="none">
                      <defs>
                        {/* Dynamic Gradients */}
                        <linearGradient id="grad-blue-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
                        </linearGradient>
                        <linearGradient id="grad-emerald-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                        </linearGradient>
                        <linearGradient id="grad-purple-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.00" />
                        </linearGradient>
                        <linearGradient id="grad-rose-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.00" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      <line x1="60" y1="40" x2="960" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4,4" />
                      <line x1="60" y1="80" x2="960" y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4,4" />
                      <line x1="60" y1="120" x2="960" y2="120" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4,4" />
                      <line x1="60" y1="160" x2="960" y2="160" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4,4" />
                      <line x1="60" y1="200" x2="960" y2="200" stroke="#e2e8f0" strokeWidth="1.5" />

                      {/* Y-Axis Labels - Dynamic Real Values */}
                      <text x="45" y="44" className="text-[10px] font-mono fill-slate-400 font-bold" textAnchor="end">{activeTrendPoints.maxVal}</text>
                      <text x="45" y="84" className="text-[10px] font-mono fill-slate-400 font-bold" textAnchor="end">{Math.round(activeTrendPoints.maxVal * 0.75)}</text>
                      <text x="45" y="124" className="text-[10px] font-mono fill-slate-400 font-bold" textAnchor="end">{Math.round(activeTrendPoints.maxVal * 0.5)}</text>
                      <text x="45" y="164" className="text-[10px] font-mono fill-slate-400 font-bold" textAnchor="end">{Math.round(activeTrendPoints.maxVal * 0.25)}</text>
                      <text x="45" y="204" className="text-[10px] font-mono fill-slate-400 font-bold" textAnchor="end">0</text>

                      {/* X-Axis Labels (Timeline) */}
                      <text x="100" y="222" className="text-[10px] font-sans fill-slate-400 font-bold" textAnchor="middle">{chartTimelineLabels[0]}</text>
                      <text x="243" y="222" className="text-[10px] font-sans fill-slate-400 font-bold" textAnchor="middle">{chartTimelineLabels[1]}</text>
                      <text x="386" y="222" className="text-[10px] font-sans fill-slate-400 font-bold" textAnchor="middle">{chartTimelineLabels[2]}</text>
                      <text x="529" y="222" className="text-[10px] font-sans fill-slate-400 font-bold" textAnchor="middle">{chartTimelineLabels[3]}</text>
                      <text x="672" y="222" className="text-[10px] font-sans fill-slate-400 font-bold" textAnchor="middle">{chartTimelineLabels[4]}</text>
                      <text x="815" y="222" className="text-[10px] font-sans fill-slate-400 font-bold" textAnchor="middle">{chartTimelineLabels[5]}</text>
                      <text x="940" y="222" className="text-[10px] font-sans fill-slate-400 font-bold" textAnchor="middle">{chartTimelineLabels[6]}</text>

                      {/* Filled Area for Active Indicator */}
                      {activeTrendPoints.areaPath && (
                        <path d={activeTrendPoints.areaPath} fill={`url(#${indicatorConfig.fillId})`} className="transition-all duration-500" />
                      )}

                      {/* Active Indicator Trend Curve Line */}
                      {activeTrendPoints.linePath && (
                        <path
                          d={activeTrendPoints.linePath}
                          fill="none"
                          stroke={indicatorConfig.color}
                          strokeWidth={indicatorConfig.strokeWidth}
                          strokeDasharray={indicatorConfig.dashArray}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="transition-all duration-500"
                        />
                      )}

                      {/* High-Fidelity Data Points on Hover/Display with Floating Value Tag */}
                      {activeTrendPoints.pts.map((p, idx) => (
                        <g key={idx} className="group cursor-pointer">
                          {/* Pulsing indicator ring */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="10"
                            fill={indicatorConfig.color}
                            className="opacity-0 group-hover:opacity-20 transition-all duration-300"
                          />
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="5"
                            fill={indicatorConfig.color}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            className="shadow-sm transition-all duration-300 group-hover:r-6"
                          />
                          
                          {/* Always-visible Floating Tag with background card */}
                          <rect
                            x={p.x - 25}
                            y={p.y - 32}
                            width="50"
                            height="18"
                            rx="5"
                            fill="#1e293b"
                            className="opacity-95 shadow-sm"
                          />
                          <text
                            x={p.x}
                            y={p.y - 20}
                            className="text-[9px] font-sans fill-white font-black"
                            textAnchor="middle"
                          >
                            {p.value} {indicatorConfig.unit}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>

                  {/* Bottom Time Period Selector */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-black text-slate-700">المدى الزمني للنمو والإحصائيات الحية:</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { id: 'today', label: 'الملخص اليومي' },
                        { id: '7days', label: 'آخر 7 أيام' },
                        { id: '30days', label: 'آخر 30 يوم' },
                        { id: 'all_time', label: 'جميع الأوقات' },
                      ].map(df => (
                        <button
                          key={df.id}
                          onClick={() => setDateRangeFilter(df.id as any)}
                          className={`text-[11px] font-black py-1.5 px-3 rounded-xl border transition-all duration-300 ${
                            dateRangeFilter === df.id 
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-600/10 scale-105' 
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {df.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Indicator-Specific Live Data List Section */}
                <div id="live-indicator-details" className="bg-white border border-slate-100 p-6 rounded-3xl space-y-4 shadow-sm w-full transition-all duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span className="p-1 rounded bg-slate-100 text-slate-600">
                          {selectedIndicator === 'users' && <Users className="h-3.5 w-3.5" />}
                          {selectedIndicator === 'listings' && <LayoutGrid className="h-3.5 w-3.5" />}
                          {selectedIndicator === 'exchanges' && <CheckCircle className="h-3.5 w-3.5" />}
                          {selectedIndicator === 'reports' && <AlertTriangle className="h-3.5 w-3.5" />}
                        </span>
                        <span>السجلات الفورية للمؤشر: {indicatorConfig.label}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">أحدث البيانات الفورية المخزنة حالياً والمقترنة مباشرة بهذا المؤشر من المصدر</p>
                    </div>
                    <button
                      onClick={() => setActivePanel(selectedIndicator)}
                      className="text-[10px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-100 transition shadow-sm"
                    >
                      إدارة كافة {selectedIndicator === 'users' ? 'الأعضاء' : selectedIndicator === 'listings' ? 'الإعلانات' : selectedIndicator === 'exchanges' ? 'المقايضات' : 'البلاغات'} ←
                    </button>
                  </div>

                  {/* List Content */}
                  <div className="overflow-x-auto">
                    {selectedIndicator === 'users' && (
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="p-3 font-black">العضو</th>
                            <th className="p-3 font-black">الكود التعريفي</th>
                            <th className="p-3 font-black">الموقع الجغرافي</th>
                            <th className="p-3 font-black">الرتبة</th>
                            <th className="p-3 font-black">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {users.slice(0, 5).map(user => (
                            <tr key={user.id} className="hover:bg-slate-50/50 transition">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-[10px] text-slate-600">
                                    {user.profile_image_url ? (
                                      <img src={user.profile_image_url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                                    ) : user.display_name?.charAt(0)}
                                  </div>
                                  <span className="font-bold text-slate-700">{user.display_name}</span>
                                </div>
                              </td>
                              <td className="p-3 font-mono text-slate-500 text-[10px]">{formatUserCode(user.username, user.id)}</td>
                              <td className="p-3 text-slate-500 text-[10px]">{user.country || 'غير محدد'} - {user.city}</td>
                              <td className="p-3">{renderRoleBadge(user.role || 'user')}</td>
                              <td className="p-3">{renderStatusBadge(user.status || 'active')}</td>
                            </tr>
                          ))}
                          {users.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center p-6 text-slate-400 font-bold">لا يوجد مستخدمون في قاعدة البيانات</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}

                    {selectedIndicator === 'listings' && (
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="p-3 font-black">الإعلان</th>
                            <th className="p-3 font-black">القسم</th>
                            <th className="p-3 font-black">الحالة الفنية</th>
                            <th className="p-3 font-black">الموقع</th>
                            <th className="p-3 font-black">حالة العرض</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {listings.slice(0, 5).map(list => (
                            <tr key={list.id} className="hover:bg-slate-50/50 transition">
                              <td className="p-3">
                                <div className="flex items-center gap-2 max-w-xs">
                                  {list.images && list.images[0] ? (
                                    <img src={list.images[0]} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded object-cover border border-slate-200" />
                                  ) : (
                                    <div className="h-7 w-7 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-[8px] text-slate-400">بدون</div>
                                  )}
                                  <span className="font-bold text-slate-700 truncate">{list.title}</span>
                                </div>
                              </td>
                              <td className="p-3 text-slate-500">{list.category}</td>
                              <td className="p-3 text-slate-500">{list.condition}</td>
                              <td className="p-3 text-slate-500 text-[10px]">{list.country} - {list.city}</td>
                              <td className="p-3">
                                {list.status === 'active' || list.is_active ? (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold">نشط</span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">{list.status}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {listings.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center p-6 text-slate-400 font-bold">لا توجد إعلانات معروضة</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}

                    {selectedIndicator === 'exchanges' && (
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="p-3 font-black">رقم الصفقة</th>
                            <th className="p-3 font-black">أطراف المقايضة</th>
                            <th className="p-3 font-black">حالة الاتفاق</th>
                            <th className="p-3 font-black">التاريخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {exchanges.slice(0, 5).map(ex => (
                            <tr key={ex.id} className="hover:bg-slate-50/50 transition">
                              <td className="p-3 font-mono text-slate-600 font-bold text-[10px]">#{ex.id.substring(0, 10)}</td>
                              <td className="p-3 text-slate-600">
                                <span>صاحب الإعلان: {ex.owner_code || '---'}</span>
                                <span className="mx-1 text-slate-300">|</span>
                                <span>المقايِض: {ex.proposer_code || '---'}</span>
                              </td>
                              <td className="p-3">
                                {ex.status === 'completed' ? (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold">مكتملة ومبرمة</span>
                                ) : ex.status === 'pending' ? (
                                  <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded text-[10px] font-bold">قيد التفاوض</span>
                                ) : (
                                  <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded text-[10px] font-bold">ملغاة</span>
                                )}
                              </td>
                              <td className="p-3 text-slate-400 text-[10px]">{new Date(ex.created_at || ex.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                          {exchanges.length === 0 && (
                            <tr>
                              <td colSpan={4} className="text-center p-6 text-slate-400 font-bold">لا توجد مقايضات مسجلة</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}

                    {selectedIndicator === 'reports' && (
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="p-3 font-black">المستهدف</th>
                            <th className="p-3 font-black">مقدم البلاغ</th>
                            <th className="p-3 font-black">سبب الشكوى</th>
                            <th className="p-3 font-black">حالة الشكوى</th>
                            <th className="p-3 font-black">التاريخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {reports.slice(0, 5).map(rep => (
                            <tr key={rep.id} className="hover:bg-slate-50/50 transition">
                              <td className="p-3 font-bold text-slate-700 text-[10px]">
                                {rep.target_type === 'listing' ? 'إعلان مقايضة' : rep.target_type === 'user' ? 'ملف مستخدم' : 'محادثة شات'}
                              </td>
                              <td className="p-3 text-slate-500 text-[10px]">{formatUserCode(rep.reporter_code, rep.reporter_id)}</td>
                              <td className="p-3 text-slate-600 truncate max-w-xs">{rep.reason}</td>
                              <td className="p-3">
                                {rep.status === 'resolved' ? (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold">تم حلها</span>
                                ) : (
                                  <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded text-[10px] font-bold">مفتوحة للتحقيق</span>
                                )}
                              </td>
                              <td className="p-3 text-slate-400 text-[10px]">{new Date(rep.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                          {reports.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center p-6 text-slate-400 font-bold">لا توجد شكاوى أو بلاغات مسجلة</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Audit Logs Ticker - Premium Horizontal Grid Ticker */}
                <div id="audit-logs-ticker" className="bg-white border border-slate-100 p-6 rounded-3xl space-y-4 shadow-sm w-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-800">نبض تدقيق العمليات الإدارية الفورية</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">آخر خمس إجراءات تقنية وإدارية تم تسجيلها من قبل طاقم الإدارة لضمان النزاهة والشفافية</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 font-mono">
                      {auditLogs.length} سجلات كلياً
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {auditLogs.slice(0, 5).map(log => (
                      <div key={log.id} className="text-[11px] p-3 bg-slate-50/50 rounded-2xl space-y-2 border border-slate-100 hover:border-slate-200 transition flex flex-col justify-between">
                        <div className="flex justify-between items-center font-bold text-slate-700">
                          <span className="truncate max-w-[80px]">{log.admin_name}</span>
                          <span className="text-slate-400 text-[9px] font-mono">{new Date(log.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-500 text-[10px] leading-tight">الإجراء الحركي:</p>
                          <span className="inline-block text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg text-[9px] font-bold border border-emerald-100/50">
                            {log.action}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-400 truncate mt-1">
                          المستهدف: {log.target_id.substring(0, 8)}...
                        </div>
                      </div>
                    ))}
                    {auditLogs.length === 0 && (
                      <div className="col-span-5 text-[10px] text-slate-400 text-center py-6 bg-slate-50/40 rounded-2xl border border-dashed border-slate-100">
                        لا توجد سجلات تدقيق حتى اللحظة
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}


          {activePanel === 'users' && (
            <div className="space-y-4">
              
              {/* Filters Box */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 w-full sm:w-auto">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، كود المستخدم، البلد أو المدينة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-xs text-white border-none outline-none w-full sm:w-64"
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-950 text-xs text-white p-2 border border-slate-800 rounded-xl"
                  >
                    <option value="all">كل حالات الحسابات</option>
                    <option value="active">نشط</option>
                    <option value="suspended">معلق</option>
                    <option value="banned">محظور حذيف</option>
                  </select>

                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="bg-slate-950 text-xs text-white p-2 border border-slate-800 rounded-xl"
                  >
                    <option value="all">كل الأعضاء والرتب</option>
                    <option value="user">عضو عادي</option>
                    <option value="admin">مدير</option>
                  </select>
                </div>
              </div>

              {/* Users Master Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-4">العضو</th>
                      <th className="p-4">الكود التعريفي</th>
                      <th className="p-4">الموقع الجغرافي</th>
                      <th className="p-4">الامتياز الحالي</th>
                      <th className="p-4">الحالة</th>
                      <th className="p-4 text-center">عمليات إشرافية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map(user => (
                      <tr key={user.id} className="border-b border-slate-800/65 hover:bg-slate-900/40 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center font-bold">
                              {user.profile_image_url ? (
                                <img src={user.profile_image_url} alt="" className="h-full w-full object-cover" />
                              ) : user.display_name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-white leading-normal">{user.display_name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{user.id.substring(0, 12)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-300">{formatUserCode(user.username, user.id)}</td>
                        <td className="p-4">
                          <div className="text-slate-200">{user.country || 'غير محدد'}</div>
                          <div className="text-[10px] text-slate-500">{user.governorate} - {user.city}</div>
                        </td>
                        <td className="p-4">{renderRoleBadge(user.role || 'user')}</td>
                        <td className="p-4">
                          {renderStatusBadge(user.status || 'active')}
                          {user.suspension_until && new Date(user.suspension_until).getTime() > Date.now() && (
                            <div className="text-[9px] text-amber-500 font-black mt-1">
                              موقوف حتى: {new Date(user.suspension_until).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1.5 justify-center">
                            
                            <button
                              onClick={() => handleStartDirectUserChat(user)}
                              className="text-[10px] font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 p-1.5 rounded-lg border border-blue-500/20"
                              title="مراسلة إشرافية مباشرة"
                            >
                              مراسلة
                            </button>

                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setUserModalAction('note');
                              }}
                              className="text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 p-1.5 rounded-lg border border-slate-800"
                              title="ملاحظة إشرافية داخلية"
                            >
                              ملاحظة
                            </button>

                            {user.status === 'suspended' || user.status === 'banned' ? (
                              <button
                                onClick={() => handleRestoreUser(user)}
                                className="flex items-center gap-0.5 text-[10px] bg-emerald-950 hover:bg-emerald-900 text-emerald-400 font-bold p-1.5 rounded-lg border border-emerald-900/30"
                              >
                                <UserCheck className="h-3 w-3" />
                                <span>فك الحجب</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setUserModalAction('suspend');
                                  }}
                                  className="text-[10px] font-bold bg-amber-955 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 p-1.5 rounded-lg border border-amber-500/20"
                                >
                                  تعليق
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setUserModalAction('ban');
                                  }}
                                  className="text-[10px] font-bold bg-rose-955 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 p-1.5 rounded-lg border border-rose-500/20"
                                >
                                  حظر
                                </button>
                              </>
                            )}

                            {(adminRole === 'admin' || adminRole === 'super_admin') && (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setSelectedRole(user.role || 'user');
                                  setUserModalAction('role');
                                }}
                                className="text-[10px] font-bold bg-purple-955 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 p-1.5 rounded-lg border border-purple-500/20"
                              >
                                رتبة
                              </button>
                            )}

                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-slate-500 font-bold">لا يوجد أعضاء مطابقون لبحث الفلترة</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Simple Pagination Buttons */}
                <div className="p-4 bg-slate-900 flex justify-between items-center border-t border-slate-800">
                  <div className="text-xs text-slate-400">
                    يعرض <span className="font-bold text-white">{filteredUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> إلى <span className="font-bold text-white">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> من إجمالي <span className="font-bold text-white">{filteredUsers.length}</span> عضو
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 bg-slate-950 border border-slate-850 rounded hover:bg-slate-800 text-slate-354 disabled:opacity-30 disabled:hover:bg-slate-950 transition"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={currentPage >= Math.ceil(filteredUsers.length / itemsPerPage)}
                      className="p-1.5 bg-slate-950 border border-slate-850 rounded hover:bg-slate-800 text-slate-354 disabled:opacity-30 disabled:hover:bg-slate-950 transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}


          {activePanel === 'listings' && (
            <div className="space-y-4">
              
              {/* Listings Filters Header */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 w-full sm:w-auto">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث بعنوان الإعلان، المعرف، اسم المالك..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-xs text-white border-none outline-none w-full sm:w-64"
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-slate-950 text-xs text-white p-2 border border-slate-800 rounded-xl"
                  >
                    <option value="all">كل التصنيفات المعتمدة</option>
                    <option value="إلكترونيات">إلكترونيات</option>
                    <option value="هواتف">هواتف</option>
                    <option value="ألعاب">ألعاب</option>
                    <option value="أثاث">أثاث</option>
                    <option value="ملابس">ملابس</option>
                    <option value="سيارات وإكسسوارات">سيارات وإكسسوارات</option>
                    <option value="كتب">كتب</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-950 text-xs text-white p-2 border border-slate-800 rounded-xl"
                  >
                    <option value="all">كل حالات الإعلانات</option>
                    <option value="active">نشط ومتاح للعامة</option>
                    <option value="hidden_by_admin">محجوب بالمشرف</option>
                    <option value="removed">منزوع مفسوخ</option>
                    <option value="exchanged">مكتمل الصفقة</option>
                  </select>
                </div>
              </div>

              {/* Listings Matrix Grid */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-4">السلعة</th>
                      <th className="p-4">المالك</th>
                      <th className="p-4">التصنيف</th>
                      <th className="p-4">الموقع الجغرافي</th>
                      <th className="p-4">الحالة</th>
                      <th className="p-4 text-center">أدوات تعديل ورقابة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedListings.map(listing => (
                      <tr key={listing.id} className="border-b border-slate-800/65 hover:bg-slate-900/40 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                              {listing.images && listing.images[0] ? (
                                <img src={listing.images[0]} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center font-bold">بدل</div>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white text-xs leading-normal">{listing.title}</div>
                              {listing.is_boosted && (
                                <span className="bg-emerald-900/60 text-emerald-300 border border-emerald-800 text-[8px] font-black tracking-widest px-1 py-0.2 rounded mt-1 inline-block uppercase">
                                  إعلان ممول
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300">{listing.owner_id.substring(0, 10)}...</td>
                        <td className="p-4 text-slate-300">{listing.category}</td>
                        <td className="p-4 text-slate-300">{listing.country} - {listing.city}</td>
                        <td className="p-4">
                          {listing.status === 'active' || listing.is_active ? (
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-900/40">نشط</span>
                          ) : (
                            <span className="text-[10px] text-rose-400 font-bold bg-rose-955 px-2 py-0.5 rounded-full border border-rose-900/40">{listing.status}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1.5 justify-center">
                            
                            <button
                              onClick={() => {
                                setSelectedListing(listing);
                                setListingModalAction('note');
                              }}
                              className="text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 p-1.5 rounded-lg border border-slate-800"
                            >
                              ملاحظة
                            </button>

                            {listing.status === 'hidden_by_admin' || listing.status === 'removed' ? (
                              <button
                                onClick={() => handleRestoreListing(listing)}
                                className="text-[10px] bg-emerald-950 hover:bg-emerald-900 text-emerald-400 font-bold p-1.5 rounded-lg border border-emerald-900/30"
                              >
                                تفعيل تنشيط
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedListing(listing);
                                    setListingModalAction('hide');
                                  }}
                                  className="text-[10px] font-bold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 p-1.5 rounded-lg border border-amber-500/20"
                                >
                                  حجب المنشور
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedListing(listing);
                                    setListingModalAction('remove');
                                  }}
                                  className="text-[10px] font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 p-1.5 rounded-lg border border-rose-500/20"
                                >
                                  إزالة نهائية
                                </button>
                              </>
                            )}

                            {listing.is_boosted && (
                              <button
                                onClick={() => {
                                  setSelectedListing(listing);
                                  setListingModalAction('boost_cancel');
                                }}
                                className="text-[10px] bg-rose-955 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 p-1.5 rounded-lg"
                                title="إلغاء ترويج كاذب"
                              >
                                إلغاء تمويل
                              </button>
                            )}

                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredListings.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-slate-500 font-bold">لا يوجد سلع معروضة حالياً مع خيارات الفلترة المذكورة</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Listings Pagination */}
                <div className="p-4 bg-slate-900 flex justify-between items-center border-t border-slate-800">
                  <div className="text-xs text-slate-400">
                    يعرض <span className="font-bold text-white">{filteredListings.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> إلى <span className="font-bold text-white">{Math.min(currentPage * itemsPerPage, filteredListings.length)}</span> من إجمالي <span className="font-bold text-white">{filteredListings.length}</span> إعلان متاح
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 bg-slate-950 border border-slate-850 rounded hover:bg-slate-800 text-slate-354 disabled:opacity-30 disabled:hover:bg-slate-950 transition"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={currentPage >= Math.ceil(filteredListings.length / itemsPerPage)}
                      className="p-1.5 bg-slate-950 border border-slate-850 rounded hover:bg-slate-800 text-slate-354 disabled:opacity-30 disabled:hover:bg-slate-950 transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}


          {activePanel === 'reports' && (
            <div className="space-y-4">
              
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
                <span className="text-xs font-black">بلاغات الشكاوى وأمان السلع المتداولة</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-950 text-xs text-white p-2 border border-slate-800 rounded-xl"
                >
                  <option value="all">كل بلاغات الباب</option>
                  <option value="open">مفتوح ومعلق المراجعة</option>
                  <option value="under_review">تحت التحقيق والتقصي</option>
                  <option value="resolved">تم التسوية والإغلاق</option>
                  <option value="rejected">مرفوض وبلاغ كيدي</option>
                </select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {reportedTimeline.map(rep => (
                  <div key={rep.id} className="bg-slate-950 border border-slate-800 p-5 rounded-3xl space-y-3 relative hover:border-slate-700 transition">
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-2 py-0.5 border border-slate-800 rounded-md">بلاغ: #{rep.id.substring(0,8)}</span>
                        <h4 className="text-xs font-black text-white mt-1.5">سبب البلاغ: 
                          <span className="text-rose-400 mr-1">
                            {rep.reason === 'fraud_or_scam' ? 'احتيال/محتوى احتيالي' : rep.reason === 'fake' ? 'إعلان زائف' : rep.reason === 'harassment' ? 'مضايقة وشماتة' : rep.reason}
                          </span>
                        </h4>
                      </div>
                      <div className="text-left space-y-1">
                        <span className={`text-[9px] font-bold uppercase rounded-md px-2 py-0.5 border ${
                          rep.priority === 'high' || rep.priority === 'critical' 
                            ? 'bg-rose-955 text-rose-300 border-rose-900/60' 
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}>
                          أولوية {rep.priority}
                        </span>
                        <div className="text-[10px] text-slate-500">{new Date(rep.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 bg-slate-900/50 p-3 rounded-xl border border-slate-900 font-serif">
                      "{rep.description}"
                    </p>

                    <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                      <span>الراسل: <strong className="text-white font-mono">{rep.reporter_user_id.substring(0,10)}...</strong></span>
                      <span>•</span>
                      <span>الكائن المُبلغ عنه: <strong className="text-slate-300 font-mono">{rep.target_type} ({rep.target_id.substring(0,10)}...)</strong></span>
                    </div>

                    {/* Report Status indicator */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">حالة التقرير:</span>
                        <span className={`text-[10px] font-bold ${
                          rep.status === 'open' ? 'text-amber-400' : rep.status === 'resolved' ? 'text-emerald-400' : 'text-slate-400'
                        }`}>{rep.status}</span>
                      </div>

                      <div className="flex gap-1.5">
                        {rep.target_type === 'chat_message' && (
                          <button
                            onClick={() => {
                              setSelectedReport(rep);
                              setShowChatProtectionNotice(true);
                              setIsViewingChatLogs(false);
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] py-1 px-2.5 rounded-lg"
                          >
                            مراجعة المحادثة 🔒
                          </button>
                        )}

                        <button
                          onClick={() => handleStartReportChat(rep)}
                          className="bg-emerald-900 hover:bg-emerald-800 text-emerald-200 border border-emerald-800 text-[10px] py-1 px-2.5 rounded-lg flex items-center gap-1"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>تواصل مع الشاكي 💬</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedReport(rep);
                            setReportActionType('resolved');
                          }}
                          className="bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-900/30 text-[10px] py-1 px-2.5 rounded-lg"
                        >
                          تأكيد تسوية البلاغ
                        </button>

                        <button
                          onClick={() => {
                            setSelectedReport(rep);
                            setReportActionType('rejected');
                          }}
                          className="bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800 text-[10px] py-1 px-2.5 rounded-lg"
                        >
                          رفض كبلاغ كيدي
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
                {reportedTimeline.length === 0 && (
                  <div className="lg:col-span-2 text-center p-8 text-slate-650 bg-slate-950 border border-slate-850 rounded-2xl font-bold">كل الأرجاء نظيفة خالية من الشكاوى النشطة</div>
                )}
              </div>

            </div>
          )}


          {activePanel === 'exchanges' && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-white">جلسات المقايضة والصفقات الآمنة</h3>
              
              <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden text-xs">
                <table className="w-full text-right">
                  <header className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    {/* header */}
                  </header>
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="p-4">رقم المقايضة</th>
                      <th className="p-4">كود الإعلان كائن التبادل</th>
                      <th className="p-4">المالك الأصلي للسلعة</th>
                      <th className="p-4">المستفيد المقايض الثاني</th>
                      <th className="p-4">الحالة</th>
                      <th className="p-4 text-center">التحكم والنزاعات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exchanges.map(exc => (
                      <tr key={exc.id} className="border-b border-slate-800/65 hover:bg-slate-900/40 transition">
                        <td className="p-4 font-mono font-bold text-rose-300">#{exc.id.substring(0,8)}</td>
                        <td className="p-4 font-mono text-slate-300">{exc.listing_id.substring(0,10)}...</td>
                        <td className="p-4 font-mono text-slate-300">{exc.owner_id.substring(0,10)}...</td>
                        <td className="p-4 font-mono text-slate-300">{exc.exchanged_with_user_id.substring(0,10)}...</td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            exc.status === 'completed' 
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' 
                              : exc.status === 'pending' 
                              ? 'bg-amber-955 text-amber-300 border border-amber-900' 
                              : 'bg-slate-900 text-slate-500'
                          }`}>
                            {exc.status === 'completed' ? 'تكللت بالنجاح' : exc.status === 'pending' ? 'انتظار التأكيد' : 'تراجع تصفير'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => {
                                if (window.confirm("تحذير: هل تود إلغاء صفقة المقايضة وإيقاف التفاوض وإرجاع السلع للوضع العادي بالكامل؟ لا يمكن التراجع مالم يوافق الأعضاء.")) {
                                  dbService.updateExchangeStatusAdmin(exc.id, 'rejected', "إبطال قسري من لجنة المراقبة والنزاهة للتطبيق").then(() => {
                                    showToast("تم إبطال صفقة المبادلة بنجاح وإغلاق الجلسة", 'success');
                                    loadStatsAndData();
                                  });
                                }
                              }}
                              className="text-[10px] bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 px-2 py-1 rounded"
                            >
                              إبطال الصفقة
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {exchanges.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-600 font-bold">لم تجر صفقات تسوية مسجلة بسجلات التقصي الحية حتى الآن</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}


          {activePanel === 'boosts' && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-white">ترويج وفحص عمليات تسييل التمويل</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {boosts.map(bst => (
                  <div key={bst.id} className="bg-slate-950 border border-slate-800 p-5 rounded-3xl flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">السجل: #{bst.id.substring(0,8)}</span>
                      <h4 className="text-xs font-bold text-white mt-1">كود المنشور: {bst.listing_id.substring(0,10)}...</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">صاحب العرض: {bst.user_id.substring(0,10)}...</p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-slate-400">إحصاء إعلانات الفيديو المشاهدة:</span>
                        <span className="bg-slate-900 border border-slate-800 text-xs px-2 py-0.5 rounded text-yellow-500 font-black">
                          {bst.ads_watched_count || 0}/{appSettings?.rewarded_ads_required || 3} مشاهدات مصادقة
                        </span>
                      </div>
                    </div>

                    <div className="text-left space-y-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full block text-center ${
                        bst.status === 'active' 
                          ? 'bg-emerald-950 text-emerald-350 border border-emerald-900/60 text-emerald-400' 
                          : 'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}>
                        {bst.status}
                      </span>

                      {bst.status === 'active' && (
                        <button
                          onClick={() => {
                            if (window.confirm("هل أنت متأكد من إلغاء تسييل التمويل المميز لهذا الإعلان للاشتباه بنشاط روبوتات مشاهدة كاذبة؟")) {
                              dbService.cancelListingBoostAdmin(bst.id, "إلغاء مشرف لوجود اشتباه ببرمجيات نقر على الإعلانات الروبوتية").then(() => {
                                showToast("تم إلغاء التمويل وتوجيه الإنذار للعميل", 'success');
                                loadStatsAndData();
                              });
                            }
                          }}
                          className="bg-rose-955 hover:bg-rose-950 text-rose-300 border border-rose-900/50 text-[10px] block w-full py-1 rounded-lg"
                        >
                          إلغاء قسري
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {boosts.length === 0 && (
                  <div className="lg:col-span-2 text-center p-8 bg-slate-950 border border-slate-850 rounded-2xl text-slate-600 font-bold">لا يوجد سجل تمويل مميز نشط على لوحات المزايدة للإعلانات</div>
                )}
              </div>

            </div>
          )}


          {activePanel === 'ratings' && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-white">الاعتمادات وتقييمات الأعضاء المتبادلة</h3>
              
              <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden text-xs">
                <table className="w-full text-right text-slate-200">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="p-4">العضو المُقَيّم</th>
                      <th className="p-4">العضو المُتلقي للتقييم</th>
                      <th className="p-4">قيمة النجوم</th>
                      <th className="p-4">الوصف والتعليقات</th>
                      <th className="p-4 text-center">المحافظة الإشرافية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratings.map(rt => (
                      <tr key={rt.id} className="border-b border-slate-800 hover:bg-slate-900/30 transition">
                        <td className="p-4 text-slate-350 font-mono">{rt.reviewer_user_id.substring(0,10)}...</td>
                        <td className="p-4 text-slate-350 font-mono">{rt.reviewed_user_id.substring(0,10)}...</td>
                        <td className="p-4">
                          <div className="flex items-center gap-0.5 text-yellow-500 font-black">
                            <Star className="h-3.5 w-3.5 fill-yellow-500" />
                            <span>{rt.rating_value}/5 نجوم</span>
                          </div>
                        </td>
                        <td className="p-4 italic text-slate-300 font-serif">"{rt.review_text || 'لا تتوفر تعليقات نصية مكتوبة'}"</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm("تحذير: هل أنت متأكد من حذف وتقييد هذا التقييم النصي من الظهور العام للأعضاء لانتهاكه ثقة الأدبيات والتعامل الأخلاقي؟")) {
                                dbService.deleteRatingAdmin(rt.id, "مخالفة سلوك الأدبيات العامة للتقييم والمقايضات").then(() => {
                                  showToast("تم إخفاء التقييم المتنازع عليه بنجاح وتحديث معدل الموثوقية", 'success');
                                  loadStatsAndData();
                                });
                              }
                            }}
                            className="bg-rose-955 hover:bg-rose-950 text-rose-300 border border-rose-900/60 p-1 rounded-md text-[10px]"
                          >
                            إخفاء مراجعة سيئة
                          </button>
                        </td>
                      </tr>
                    ))}
                    {ratings.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-slate-600 font-bold">لا تتوفر تقييمات مكتوبة مسبقاً لمراجعة الرقابة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}


          {activePanel === 'categories_locations' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Categories Management Box */}
                <div className="bg-slate-950 border border-slate-850 p-5 rounded-3xl border-slate-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-white">تصنيفات المنتجات والمعروضات المعتمدة</h3>
                    <button
                      onClick={() => setShowNewCategoryModal(true)}
                      className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>إضافة تصنيف جديد</span>
                    </button>
                  </div>

                  {/* Seed classifications */}
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {[
                      { icon: LayoutGrid, ar: 'إلكترونيات', en: 'Electronics', count: 1 },
                      { icon: LayoutGrid, ar: 'هواتف', en: 'Phones', count: 2 },
                      { icon: LayoutGrid, ar: 'ألعاب', en: 'Games', count: 3 },
                      { icon: LayoutGrid, ar: 'أثاث', en: 'Furniture', count: 4 },
                      { icon: LayoutGrid, ar: 'ملابس', en: 'Clothes', count: 5 },
                      { icon: LayoutGrid, ar: 'سيارات وإكسسوارات', en: 'Cars & Accessories', count: 6 },
                      { icon: LayoutGrid, ar: 'كتب', en: 'Books', count: 7 },
                    ].map((catObj, idx) => (
                      <div key={idx} className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="bg-rose-955 text-rose-300 p-2 rounded-xl">
                            <catObj.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{catObj.ar}</div>
                            <div className="text-[10px] text-slate-550 text-slate-500 font-mono">{catObj.en}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-400">الترتيب: {catObj.count}</span>
                          <span className="text-[10px] text-emerald-500 font-black">نشط ومفعل</span>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Locations Management Box */}
                <div className="bg-slate-950 border border-slate-850 p-5 rounded-3xl border-slate-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-white">المواقع والمحافظات الجغرافية المعتمدة</h3>
                    <button
                      onClick={() => setShowNewLocationModal(true)}
                      className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>إضافة موقع جغرافي</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {[
                      { country: 'الأردن', gov: 'عمان', city: 'غرب عمان' },
                      { country: 'فلسطين', gov: 'القدس', city: 'البلدة القديمة' },
                      { country: 'مصر', gov: 'القاهرة', city: 'التجمع الخامس' },
                      { country: 'الجزائر', gov: 'الجزائر العاصمة', city: 'دالي إبراهيم' },
                      { country: 'المملكة العربية السعودية', gov: 'الرياض', city: 'حي العليا' },
                    ].map((loc, idx) => (
                      <div key={idx} className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">{loc.city}</div>
                          <div className="text-[10px] text-slate-500">{loc.country} - {loc.gov}</div>
                        </div>
                        <span className="text-[10px] text-emerald-500 font-black">جاهز للعموم</span>
                      </div>
                    ))}
                  </div>

                </div>

              </div>

            </div>
          )}


          {activePanel === 'support' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Tickets list */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-3xl lg:col-span-1 space-y-4">
                <h3 className="text-xs font-black text-white">تذاكر الدعم الفني المفتوحة</h3>
                
                <div className="space-y-3">
                  {supportTickets.map(tk => (
                    <button
                      key={tk.id}
                      onClick={() => setSelectedTicket(tk)}
                      className={`w-full text-right p-3 rounded-2xl border transition ${
                        selectedTicket?.id === tk.id 
                          ? 'bg-rose-955/20 border-rose-500/40 text-white' 
                          : 'bg-slate-900 hover:bg-slate-900/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span>جلسة: {tk.id.substring(0,8)}</span>
                        <span>{new Date(tk.created_at).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white leading-normal mt-1">{tk.subject}</h4>
                      <p className="text-[10px] text-slate-400 truncate mt-1">{tk.message}</p>
                      
                      <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-800/60">
                        <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">{tk.status}</span>
                        <span className="text-[9px] font-bold text-slate-400">الأولوية: {tk.priority}</span>
                      </div>
                    </button>
                  ))}
                  {supportTickets.length === 0 && (
                    <div className="text-center py-10 text-xs text-slate-500 font-bold">كل التذاكر مغلقة أو مستلمة بمزود الكلاود</div>
                  )}
                </div>
              </div>

              {/* Replier View Screen */}
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl lg:col-span-2 space-y-4">
                {selectedTicket ? (
                  <div className="space-y-4">
                    <div className="border-b border-slate-800 pb-3">
                      <span className="text-[10px] font-mono text-slate-500">المعرف اللفظي: #{selectedTicket.id}</span>
                      <h3 className="text-sm font-black text-white mt-1">العنوان: {selectedTicket.subject}</h3>
                      <p className="text-xs text-slate-400 mt-2 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                        الرسالة الأصلية للعميل:<br />
                        <strong className="text-white mt-1 block">"{selectedTicket.message}"</strong>
                      </p>
                    </div>

                    {/* Replies list */}
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {selectedTicket.replies?.map((rep: any) => (
                        <div key={rep.id} className="text-xs p-3 bg-slate-900 rounded-2xl border border-slate-800 leading-relaxed">
                          <div className="flex justify-between text-slate-400 text-[10px] mb-1">
                            <span className="font-bold text-emerald-400">{rep.sender_name}</span>
                            <span>{new Date(rep.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-white">"{rep.message}"</p>
                        </div>
                      ))}
                      {(!selectedTicket.replies || selectedTicket.replies.length === 0) && (
                        <div className="text-[10px] text-slate-500 text-center py-4">لا توجد ردود إدارية مسجلة على هذه التذكرة</div>
                      )}
                    </div>

                    {/* Submit Replier draft */}
                    <div className="space-y-2 pt-3 border-t border-slate-800">
                      <label className="text-[11px] font-black text-rose-300">رد صياغة الإشراف والدعم الموجه للمكتشفين:</label>
                      <textarea
                        rows={3}
                        value={ticketReply}
                        onChange={(e) => setTicketReply(e.target.value)}
                        placeholder="اكتب ردك الواضح والودي بَدِلْ لحل عقبة الشاكي بشكل فوري..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-650 outline-none focus:border-rose-500/40"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={handleTicketReplySubmit}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-5 rounded-xl text-left"
                        >
                          إرسال الرد للعميل
                        </button>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="h-full flex flex-col justify-center items-center text-slate-500 py-20">
                    <HelpCircle className="h-10 w-10 text-slate-700 mb-2" />
                    <span className="text-xs font-bold">الرجاء اختيار أحد التذاكر والشكاوى المفتوحة على اليسار لمعاينتها وحل مشكلة العميل</span>
                  </div>
                )}
              </div>

            </div>
          )}


          {activePanel === 'feedback_submissions' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-black text-white">إدارة الشكاوى والاقتراحات والدعم</h3>
                  <p className="text-[10px] text-slate-400">تابع وإدارة مشاركات وملاحظات المستخدمين والتبليغ عن الأعطال الفنية ومقترحات التحسين.</p>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                {/* Search */}
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={feedbackSearch}
                    onChange={(e) => setFeedbackSearch(e.target.value)}
                    placeholder="ابحث بالاسم، البريد، أو المحتوى..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs focus:outline-none focus:border-rose-500 text-right text-white"
                  />
                </div>

                {/* Filter Type */}
                <select
                  value={feedbackFilterType}
                  onChange={(e) => setFeedbackFilterType(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 text-right focus:outline-none focus:border-rose-500"
                >
                  <option value="all">كل أنواع الطلبات</option>
                  <option value="complaint">شكوى</option>
                  <option value="suggestion">اقتراح</option>
                  <option value="bug">إبلاغ عن مشكلة (خلل تقني)</option>
                  <option value="feature_request">اقتراح ميزة جديدة</option>
                  <option value="improvement">ملاحظات وتطوير التطبيق</option>
                </select>

                {/* Filter Status */}
                <select
                  value={feedbackFilterStatus}
                  onChange={(e) => setFeedbackFilterStatus(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 text-right focus:outline-none focus:border-rose-500"
                >
                  <option value="all">كل الحالات</option>
                  <option value="pending">قيد الانتظار (Pending)</option>
                  <option value="under_review">تحت المراجعة (Under Review)</option>
                  <option value="resolved">تم الحل (Resolved)</option>
                  <option value="rejected">مرفوض (Rejected)</option>
                </select>
              </div>

              {/* Submissions List */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden text-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-slate-200">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="p-4">المرسل</th>
                        <th className="p-4">النوع</th>
                        <th className="p-4">الموضوع</th>
                        <th className="p-4">التاريخ</th>
                        <th className="p-4">الحالة</th>
                        <th className="p-4 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFeedbacks.map((fb) => (
                        <tr key={fb.id} className="border-b border-slate-900 hover:bg-slate-900/50 transition">
                          <td className="p-4">
                            <div className="font-bold text-white">{fb.username}</div>
                            <div className="text-[10px] text-slate-400">{fb.email}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              fb.type === 'complaint' ? 'bg-rose-950/80 text-rose-300 border border-rose-900' :
                              fb.type === 'suggestion' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-900' :
                              fb.type === 'bug' ? 'bg-amber-950/80 text-amber-300 border border-amber-900' :
                              fb.type === 'feature_request' ? 'bg-blue-950/80 text-blue-300 border border-blue-900' :
                              'bg-purple-950/80 text-purple-300 border border-purple-900'
                            }`}>
                              {fb.type === 'complaint' && 'شكوى'}
                              {fb.type === 'suggestion' && 'اقتراح'}
                              {fb.type === 'bug' && 'خلل تقني'}
                              {fb.type === 'feature_request' && 'طلب ميزة'}
                              {fb.type === 'improvement' && 'تطوير التطبيق'}
                            </span>
                          </td>
                          <td className="p-4 max-w-xs truncate font-medium text-white" title={fb.subject}>
                            {fb.subject}
                          </td>
                          <td className="p-4 text-slate-400 font-mono text-[10px]">
                            {new Date(fb.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              fb.status === 'pending' ? 'bg-slate-800 text-slate-300' :
                              fb.status === 'under_review' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              fb.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {fb.status === 'pending' && 'قيد الانتظار'}
                              {fb.status === 'under_review' && 'تحت المراجعة'}
                              {fb.status === 'resolved' && 'تم الحل'}
                              {fb.status === 'rejected' && 'مرفوض'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => setSelectedFeedback(fb)}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-3 rounded-lg text-[10px] transition"
                            >
                              معاينة التفاصيل
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredFeedbacks.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center p-12 text-slate-600 font-bold">
                            لا توجد طلبات شكاوى أو اقتراحات تطابق خيارات التصفية الحالية
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}


          {/* Selected Feedback Details Modal */}
          {selectedFeedback && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl relative text-right" dir="rtl">
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="absolute top-4 left-4 bg-slate-800 hover:bg-slate-700 text-slate-400 p-1 px-2.5 rounded-full text-xs font-bold"
                >
                  ✖
                </button>

                <div className="border-b border-slate-800 pb-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedFeedback.type === 'complaint' ? 'bg-rose-950/80 text-rose-300 border border-rose-900' :
                    selectedFeedback.type === 'suggestion' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-900' :
                    selectedFeedback.type === 'bug' ? 'bg-amber-950/80 text-amber-300 border border-amber-900' :
                    selectedFeedback.type === 'feature_request' ? 'bg-blue-950/80 text-blue-300 border border-blue-900' :
                    'bg-purple-950/80 text-purple-300 border border-purple-900'
                  }`}>
                    {selectedFeedback.type === 'complaint' && 'شكوى'}
                    {selectedFeedback.type === 'suggestion' && 'اقتراح'}
                    {selectedFeedback.type === 'bug' && 'خلل تقني'}
                    {selectedFeedback.type === 'feature_request' && 'طلب ميزة'}
                    {selectedFeedback.type === 'improvement' && 'تطوير التطبيق'}
                  </span>
                  <h3 className="text-sm font-black text-white mt-2">{selectedFeedback.subject}</h3>
                  <p className="text-[10px] text-slate-400 mt-1">تاريخ الإرسال: {new Date(selectedFeedback.createdAt).toLocaleString('ar-EG')}</p>
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">المرسل والعميل:</span>
                    <span className="text-xs text-white block">الاسم: {selectedFeedback.username}</span>
                    <span className="text-xs text-slate-300 block">البريد الإلكتروني: {selectedFeedback.email}</span>
                    <span className="text-[10px] text-slate-500 block font-mono">المعرف: {selectedFeedback.userId}</span>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">نص الرسالة:</span>
                    <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">{selectedFeedback.message}</p>
                  </div>

                  {selectedFeedback.imageUrl && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 block">الصورة المرفقة:</span>
                      <a href={selectedFeedback.imageUrl} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                        <img src={selectedFeedback.imageUrl} alt="Attached attachment" className="max-h-48 w-full object-contain mx-auto" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-xs font-bold text-white gap-1.5">
                          <Eye className="h-4 w-4" />
                          <span>اضغط لفتح الصورة كاملة</span>
                        </div>
                      </a>
                    </div>
                  )}

                  {selectedFeedback.deviceInfo && (
                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850">
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">بيانات الجهاز والبيئة المتأثرة:</span>
                      <p className="text-[10px] text-slate-400 font-mono break-all leading-normal text-left" style={{ direction: 'ltr' }}>{selectedFeedback.deviceInfo}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <span className="text-[10px] font-bold text-slate-500 block">تحديث حالة الطلب والمتابعة:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleUpdateFeedbackStatus(selectedFeedback.id, 'under_review')}
                      className={`py-2 px-3 rounded-xl text-[10px] font-black border transition ${
                        selectedFeedback.status === 'under_review'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      تحت المراجعة
                    </button>
                    <button
                      onClick={() => handleUpdateFeedbackStatus(selectedFeedback.id, 'resolved')}
                      className={`py-2 px-3 rounded-xl text-[10px] font-black border transition ${
                        selectedFeedback.status === 'resolved'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      تم الحل
                    </button>
                    <button
                      onClick={() => handleUpdateFeedbackStatus(selectedFeedback.id, 'rejected')}
                      className={`py-2 px-3 rounded-xl text-[10px] font-black border transition ${
                        selectedFeedback.status === 'rejected'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      مرفوض
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 block">التواصل والرد على الرسالة:</span>
                  <button
                    onClick={() => handleStartFeedbackChat(selectedFeedback)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/10"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>مراسلة العميل والرد عليه بخصوص طلبه</span>
                  </button>
                </div>
              </div>
            </div>
          )}


          {activePanel === 'announcements' && (
            <div className="space-y-6">
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-black text-white">منشورات البث والتنويهات الجماهيرية العامة</h3>
                  <p className="text-[10px] text-slate-505 text-slate-400">أرسل توجيهات أمان أو حملات توعية جديدة تظهر لكافة مستخدمي المنصة عند بوابتهم</p>
                </div>
                <button
                  onClick={() => setShowNewNoticeModal(true)}
                  className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 text-xs font-black py-2.5 px-4 rounded-xl flex items-center gap-1 transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>بث تنويه إرشادي جديد</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {announcements.map(ann => (
                  <div key={ann.id} className="bg-slate-950 border border-slate-805 p-5 rounded-3xl space-y-3 relative">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-900 rounded px-1.5 py-0.5">مكتمل البث</span>
                        <h4 className="text-xs font-black text-white mt-1.5">{ann.title_ar}</h4>
                      </div>
                      <span className="text-[10px] text-slate-500">{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-serif">
                      "{ann.message_ar}"
                    </p>

                    <div className="text-[9px] text-slate-450 border-t border-slate-900 pt-2 text-slate-400">
                      تفضيل الفئة المستهدفة للجمهورية: <span className="font-bold text-white uppercase">{ann.audience}</span>
                    </div>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <div className="lg:col-span-2 text-center p-8 bg-slate-950 border border-slate-850 rounded-2xl text-slate-600 font-bold">لا توجد حملات بث تنويهية مسجلة للجمهور سابقاً</div>
                )}
              </div>

            </div>
          )}


          {activePanel === 'settings' && (
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl max-w-2xl mx-auto space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Settings className="h-5 w-5 text-rose-500 animate-spin" style={{ animationDuration: '6s' }} />
                <div>
                  <h3 className="text-sm font-black text-white">إعدادات النظام العامة لمقايضة "بَدِل"</h3>
                  <p className="text-[10px] text-slate-400">يقتصر حق تعديل هذه الخيارات الحساسة على إدارة التطبيق (المدير)</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-300 block">اسم التطبيق التجاري:</label>
                  <input
                    type="text"
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    disabled={adminRole !== 'admin' && adminRole !== 'super_admin'}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-white placeholder-slate-650 outline-none focus:border-rose-500/40 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-300 block">بريد الدعم الفني العالمي للعملاء:</label>
                  <input
                    type="email"
                    value={settingsEmail}
                    onChange={(e) => setSettingsEmail(e.target.value)}
                    disabled={adminRole !== 'admin' && adminRole !== 'super_admin'}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-white placeholder-slate-650 outline-none focus:border-rose-500/40 disabled:opacity-50 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-300 block">عدد إعلانات الفيديو المطلوب مشاهدتها لتفعيل ميزة التمويل المميز للإعلان:</label>
                  <input
                    type="number"
                    value={settingsAdsCount}
                    onChange={(e) => setSettingsAdsCount(parseInt(e.target.value, 10))}
                    disabled={adminRole !== 'admin' && adminRole !== 'super_admin'}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-white placeholder-slate-650 outline-none focus:border-rose-500/40 disabled:opacity-50 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-rose-955/10 border border-rose-900/40 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-black text-rose-300">وضع الصيانة المعلق الشامل للخادم (Maintenance Mode)</h4>
                    <p className="text-[10px] text-rose-400 mt-0.5">عند تفعيله، سيتمكن المدير فقط من تصفح المنصة وتغذيتها لحماية النزاهة التقنية</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsMaintenance}
                    onChange={(e) => setSettingsMaintenance(e.target.checked)}
                    disabled={adminRole !== 'admin' && adminRole !== 'super_admin'}
                    className="h-5 w-5 accent-rose-600 disabled:opacity-50"
                  />
                </div>

                {adminRole === 'admin' || adminRole === 'super_admin' ? (
                  <button
                    onClick={handleSaveSettings}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl text-center shadow-lg hover:shadow-emerald-950 transition"
                  >
                    حفظ التغييرات للنواة العالمية للبرنامج
                  </button>
                ) : (
                  <div className="text-[10px] text-slate-500 text-center py-2">
                    🔒 تم تجميد الخيارات الإشرافية نظراً لأن رتبتك الإدارية الحالية هي: {renderRoleBadge(adminRole)}
                  </div>
                )}

              </div>
            </div>
          )}


          {activePanel === 'flutter_source_code' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">الملفات البرمجية للوحة تحكم تطبيق Flutter المعتمدة</h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    كود برميجي متكامل جاهز للإنتاج مبني بالبنية النظيفة مع تكامل Firebase Auth, Firestore, Storage, و FCM.
                  </p>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <Terminal className="h-4 w-4 text-rose-400" />
                  <span>Flutter Production Ready</span>
                </div>
              </div>

              {/* High-quality interactive Flutter code viewer */}
              <FlutterCodeViewer />
            </div>
          )}


          {activePanel === 'audit_log' && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-white">سجلات تدقيق ورقابة الأمان والامتثال للمسؤولين</h3>
              
              <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden text-xs">
                <table className="w-full text-right text-slate-200">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="p-4">القائم بالإضافة/الإجراء</th>
                      <th className="p-4">الامتثال / العملية</th>
                      <th className="p-4">الكائن المتأثر</th>
                      <th className="p-4">رمز الهوية</th>
                      <th className="p-4 text-center">تاريخ ونبست الحدث</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(lg => (
                      <tr key={lg.id} className="border-b border-slate-800/65 hover:bg-slate-900/30 transition">
                        <td className="p-4 font-bold text-white">{lg.admin_name} ({lg.admin_id.substring(0,6)})</td>
                        <td className="p-4 text-rose-455 font-bold text-rose-400">{lg.action}</td>
                        <td className="p-4 text-slate-405 text-slate-400 font-mono">{lg.target_type}</td>
                        <td className="p-4 text-slate-405 text-slate-400 font-mono">#{lg.target_id.substring(0,10)}...</td>
                        <td className="p-4 text-slate-550 text-[10px] text-slate-500 text-center">{new Date(lg.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-slate-500">سجلات التدقيق خالية نظراً لعدم حدوث تعديلات مسجلة بعد</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* User Management Action Modals Overlay */}
      {selectedUser && userModalAction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 text-slate-200 text-right">
            <div>
              <h3 className="text-sm font-black text-white">إجراء إشرافي على: {selectedUser.display_name}</h3>
              <p className="text-[10px] text-slate-400 mt-1">كود كاحل العضو: {formatUserCode(selectedUser.username, selectedUser.id)}</p>
            </div>

            {userModalAction === 'suspend' && (
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-350 block">مدة تعليق الحساب والحجب المؤقت:</label>
                <select
                  value={suspensionDuration}
                  onChange={(e) => setSuspensionDuration(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs text-white"
                >
                  <option value="24">24 ساعة (يوم واحد)</option>
                  <option value="72">72 ساعة (3 أيام)</option>
                  <option value="168">168 ساعة (أسبوع كامل)</option>
                  <option value="720">720 ساعة (شهر كامل)</option>
                </select>
              </div>
            )}

            {userModalAction === 'role' && (
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-350 block">اختيار الرتبة الإدارية الجديدة:</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs text-white"
                >
                  <option value="user">عضو عادي وطبيعي</option>
                  <option value="admin">مدير (صلاحيات كاملة)</option>
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-350 block">التبرير والسبب القانوني لهذا الإجراء المخول بك:</label>
              <textarea
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="يرجى كتابة شرح توجيهي مفسر واضح لحماية أرشيف النزاهة..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-650 outline-none outline-none focus:border-rose-500/40"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setUserModalAction(null);
                  setActionReason('');
                }}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-801 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl"
              >
                تراجع وإغلاق
              </button>
              <button
                onClick={handleUserActionSubmit}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-5 rounded-xl"
              >
                تأكيد وبث الإجراء
              </button>
            </div>

          </div>
        </div>
      )}


      {/* Listing Actions Modal Dialogs */}
      {selectedListing && listingModalAction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 text-slate-200 text-right">
            <div>
              <h3 className="text-sm font-black text-white">إجراء إشرافي على الإعلان:</h3>
              <p className="text-xs text-rose-300 font-bold mt-1">"{selectedListing.title}"</p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-355 block">تدوين التبرير والسبب لهذا الإجراء لإدراجه بسجل التدقيق:</label>
              <textarea
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="اكتب التبرير الفعلي للحجب أو الإزالة أو إلغاء التمويل المميز..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-650 outline-none focus:border-rose-500/40"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedListing(null);
                  setListingModalAction(null);
                  setActionReason('');
                }}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl"
              >
                تراجع
              </button>
              <button
                onClick={handleListingActionSubmit}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-5 rounded-xl"
              >
                تأكيد التعديل
              </button>
            </div>

          </div>
        </div>
      )}


      {/* Report Resolution Modal Panel */}
      {selectedReport && reportActionType && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 text-slate-200 text-right">
            <div>
              <h3 className="text-sm font-black text-white">تعديل حالة الشكوى: #{selectedReport.id.substring(0,8)}</h3>
              <p className="text-xs text-slate-400 mt-1">
                تبديل الحالة إلى: <strong className="text-white uppercase">{reportActionType}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-350 block">ملاحظات التحقيق وحيثيات الفض:</label>
              <textarea
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="دون تفاصيل التحقق وحيثيات الإغلاق للشكوى لحفظ الأمان التام..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-650 outline-none focus:border-rose-500/40"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setReportActionType(null);
                  setActionReason('');
                }}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl"
              >
                إغلاق
              </button>
              <button
                onClick={() => handleReportActionSubmit(reportActionType)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-5 rounded-xl"
              >
                تأكيد وتسوية
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Private Chat Protection Auditor screen */}
      {selectedReport && showChatProtectionNotice && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-slate-950 border border-slate-810 p-6 rounded-3xl max-w-md w-full text-center space-y-4 max-w-lg border-rose-500/10">
            <div className="h-12 w-12 rounded-full bg-rose-955/20 text-rose-400 flex items-center justify-center mx-auto text-xl ring-8 ring-rose-955/10">
              🔒
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-black text-white">🔒 نظام حماية المحادثات الثنائية والامتثال للنزاهة</h3>
              <p className="text-xs text-slate-455 text-slate-400 leading-relaxed">
                خصوصية المتبادلين مقدسة بموجب لوائح "بَدِل" لفض النزاعات. لمكافحة تسريب المعلومات الشخصية، يحظر على المدراء أو المشرفين تصفح محادثات الأعضاء دون وجود كائن شكوى بلاغ أو نزاع حقيقي ثنائي.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-2xl text-right text-[11px] text-rose-300 leading-relaxed font-mono">
              ⚠️ تحذير: بضغطك على خيار المتابعة والتأكيد، سيتم تدوين هويتك الإدارية (<strong className="text-white">{currentAdmin?.display_name}</strong>) في سجل التدقيق غير القابل للتعديل تحت بند (مراجعة محادثة سرية لفض التقرير رقم {selectedReport.id.substring(0,8)}).
            </div>

            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setShowChatProtectionNotice(false);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs py-2 px-5 rounded-xl"
              >
                تراجع لأسباب الخصوصية
              </button>
              <button
                onClick={handleViewProtectedReportChat}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 px-5 rounded-xl"
              >
                موافق ومتابعة التدقيق الأمني
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Private Chat logs Displayer */}
      {selectedReport && isViewingChatLogs && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 text-right flex flex-col h-[85vh]">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] bg-rose-955 text-rose-300 px-2 py-0.5 rounded">كائن التدقيق الأمني</span>
                <h3 className="text-xs font-black text-white mt-1">محتوى رسائل المحادثة المرتبطة بالبلاغ #{selectedReport.id.substring(0,8)}</h3>
              </div>
              <button
                onClick={() => {
                  setIsViewingChatLogs(false);
                  setSelectedReport(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                إغلاق نافذة الخصوصية
              </button>
            </div>

            {/* Simulated protected messaging ledger related to listing discussions */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-900 rounded-2xl border border-slate-850">
              <div className="text-center text-[10px] text-slate-505 text-slate-500 italic pb-2">--- بداية الأرشيف المحمي والموثق ---</div>
              
              <div className="flex flex-col space-y-2.5">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 max-w-[85%] self-start text-left">
                  <div className="text-[9px] text-rose-455 text-rose-400 font-bold mb-0.5">عمرو السعدني:</div>
                  <p className="text-xs text-white">هل الجهاز البلايستيشن 5 معاه ضمان ساري المفعول؟</p>
                </div>

                <div className="bg-emerald-955/20 border border-emerald-900/40 p-3 rounded-2xl max-w-[85%] self-end">
                  <div className="text-[9px] text-emerald-400 font-bold mb-0.5">حسن الطراونة:</div>
                  <p className="text-xs text-white">نعم معاه الضمان المحلي ومستعمل 10 أيام فقط.</p>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 max-w-[85%] self-start text-left">
                  <div className="text-[9px] text-rose-455 text-rose-400 font-bold mb-0.5 font-bold">عمرو السعدني:</div>
                  <p className="text-xs text-white">ولكن في الصور فيه خدش غريب جهة مروحة التبريد ومبرراتك لست مرتاح بها!</p>
                </div>
              </div>

            </div>

            <p className="text-[10px] text-slate-500 text-center italic">
              🔒 يتم توفير قنوات التفتيش هذه لضمان النزاهة وفسخ صفقات المقايضة الاحتيالية فقط.
            </p>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setIsViewingChatLogs(false);
                  setSelectedReport(null);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 px-5 rounded-xl"
              >
                إنهاء التدقيق وإغلاق السجل
              </button>
            </div>

          </div>
        </div>
      )}


      {/* Add Category Modal dialog */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4 text-slate-200 text-right">
            <div>
              <h3 className="text-sm font-black text-white">إنشاء تصنيف ومجوعة جديدة</h3>
              <p className="text-[10px] text-slate-400">ستعرض هذه المجموعات الفردية بقائمة التصفح الفلترية لأعضاء المنصة</p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">اسم التصنيف بالعربية:</label>
                <input
                  type="text"
                  placeholder="مثال: ألعاب فيديو، كتب علمية..."
                  value={newCatAr}
                  onChange={(e) => setNewCatAr(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">اسم التصنيف باللغة الانجليزية:</label>
                <input
                  type="text"
                  placeholder="مثال: Video Games, Books..."
                  value={newCatEn}
                  onChange={(e) => setNewCatEn(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">الرمز الخاص بالتصنيف (Icon ID):</label>
                <input
                  type="text"
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewCategoryModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl"
              >
                رجوع
              </button>
              <button
                onClick={handleAddCategorySubmit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-5 rounded-xl"
              >
                تأكيد وبث التصنيف
              </button>
            </div>

          </div>
        </div>
      )}


      {/* Add location Modal Dialog */}
      {showNewLocationModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4 text-slate-200 text-right">
            <div>
              <h3 className="text-sm font-black text-white">إضافة نطاق جغرافي وعقدة روتينية</h3>
              <p className="text-[10px] text-slate-400">تعزيز بطاقات المدن لتوطين وتسريع المقايضة حسب الرقعة المحلية</p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">رمز البلد الحاضن (Country Code):</label>
                <select
                  value={newLocCountry}
                  onChange={(e) => setNewLocCountry(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-white outline-none"
                >
                  <option value="JO">الأردن (JO)</option>
                  <option value="EG">مصر (EG)</option>
                  <option value="PS">فلسطين (PS)</option>
                  <option value="DZ">الجزائر (DZ)</option>
                  <option value="SA">السعودية (SA)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">اسم المحافظة/الولاية (Governorate) بالعربية:</label>
                <input
                  type="text"
                  placeholder="مثال: مأدبا، قسنطينة، الإسكندرية..."
                  value={newLocGov}
                  onChange={(e) => setNewLocGov(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">اسم المدينة / الحي السكني (City / Area):</label>
                <input
                  type="text"
                  placeholder="مثال: وسط البلد، دالي براهيم..."
                  value={newLocCity}
                  onChange={(e) => setNewLocCity(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewLocationModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl"
              >
                تراجع
              </button>
              <button
                onClick={handleAddLocationSubmit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-5 rounded-xl"
              >
                تثبيت الموقع الجغرافي
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Broadcast Announcement Announcement Dialog */}
      {showNewNoticeModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4 text-slate-200 text-right">
            <div>
              <h3 className="text-sm font-black text-white">بث تدوير وإعلان توجيهي إرشادي عام للعموم</h3>
              <p className="text-[10px] text-slate-400">سيعرض فوراً بقمة صفحات التغذية وسيكون متاحاً لضمان الثقة والامتثال</p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">العنوان التحريري للتنويه:</label>
                <input
                  type="text"
                  placeholder="مثال: ارشادات الأمان للتسليم الميداني..."
                  value={noticeTitleAr}
                  onChange={(e) => setNoticeTitleAr(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">النص التوجيهي الدقيق للتنويه:</label>
                <textarea
                  rows={4}
                  placeholder="اكتب التعليمات بوضوح..."
                  value={noticeMsgAr}
                  onChange={(e) => setNoticeMsgAr(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-650 outline-none focus:border-rose-500/40"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewNoticeModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-xl"
              >
                إغلاق
              </button>
              <button
                onClick={handleSendNoticeSubmit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-5 rounded-xl"
              >
                بث التنويه على الهواء 📢
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
