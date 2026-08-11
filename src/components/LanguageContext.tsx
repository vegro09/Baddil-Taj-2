import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { dbService } from '../db/dbService';

export type Language = 'ar' | 'en';

export interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

const translations: Translations = {
  ar: {
    // Nav & Header
    "nav.home": "الرئيسية",
    "nav.search": "البحث",
    "nav.add": "إضافة إعلان",
    "nav.chats": "المحادثات",
    "nav.profile": "حسابي",
    "nav.favorites": "المفضلة",
    "brand.title": "بَدِل",
    "brand.subtitle": "ممتلكاتك، قيمة جديدة",
    "header.welcome": "مرحباً بك",
    "header.new_ad": "إعلان جديد",
    "header.logout": "تسجيل الخروج",

    // Common
    "common.loading": "جاري التحميل...",
    "common.error": "حدث خطأ، حاول مرة أخرى",
    "common.success": "تم بنجاح",
    "common.no_results": "لا توجد نتائج",
    "common.retry": "إعادة المحاولة",
    "common.cancel": "إلغاء",
    "common.save": "حفظ",
    "common.submit": "إرسال",
    "common.skip": "تخطي",
    "common.yes": "نعم",
    "common.no": "لا",
    "common.back": "رجوع",
    "common.active": "نشط",
    "common.inactive": "غير نشط",
    "common.exchanged": "تمت المبادلة",
    "common.minutes": "دقائق",
    "common.hours": "ساعة",
    "common.days": "أيام",
    "common.seconds": "ثواني",

    // Auth Page
    "auth.welcome_title": "أهلاً بك في منصة بَدَلْ",
    "auth.welcome_sub": "المنصة الأولى والآمنة لمقايضة المقتنيات ممتلكاتك في العالم العربي",
    "auth.login_tab": "تسجيل الدخول",
    "auth.signup_tab": "حساب جديد",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.display_name": "الاسم الظاهر",
    "auth.bio": "نبذة عنك",
    "auth.country": "البلد",
    "auth.governorate": "المحافظة",
    "auth.city": "المدينة",
    "auth.select_city": "اختر المدينة",
    "auth.select_governorate": "اختر المحافظة",
    "auth.select_country": "اختر البلد",
    "auth.login_btn": "تسجيل الدخول",
    "auth.signup_btn": "إنشاء الحساب",
    "auth.or_browse": "تصفح كزائر دون تسجيل",
    "auth.logout_confirm_title": "تأكيد تسجيل الخروج",
    "auth.logout_confirm_text": "هل تريد تسجيل الخروج؟ سيتم حفظ إعلاناتك ومفضلتك وستتمكن من تصفح التطبيق كزائر.",
    "auth.session_checking": "جاري التحقق من أمان الجلسة...",

    // Home Page
    "home.search_placeholder": "ابحث عن أجهزة، هواتف، ألعاب للتبادل...",
    "home.browse_categories": "تصفح حسب التصنيف",
    "home.all_ads_btn": "كل الإعلانات",
    "home.latest_title": "أحدث المقترحات للتبادل",
    "home.empty_listings": "لا توجد اقتراحات أو إعلانات للتبادل حالياً",
    "home.empty_sub": "كن السبّاق وانشر أول ممتلكاتك التي لم تعد بحاجتها الآن لمقايضتها بشيء نافع!",
    "home.category.all": "الكل",
    "home.category.electronics": "إلكترونيات",
    "home.category.phones": "هواتف",
    "home.category.games": "ألعاب",
    "home.category.furniture": "أثاث",
    "home.category.clothes": "ملابس",
    "home.category.cars": "سيارات وإكسسوارات",
    "home.category.books": "كتب",
    "home.desired_with": "يريد",
    "home.location_general": "موقع عام",

    // Add / Edit Listing Page
    "add.title": "انشر إعلان مقايضة جديد",
    "add.subtitle": "أدخل تفاصيل ما تملك وما تريد الحصول عليه في المقابل لبدء صفقات المبادلة الآمنة",
    "add.label.title": "عنوان الإعلان",
    "add.placeholder.title": "مثال: بلايستيشن 5 شبه جديد مع ذراعين",
    "add.label.category": "التصنيف الرئيسي",
    "add.label.condition": "حالة السلعة الفترية",
    "add.label.description": "وصف تفصيلي للسلعة",
    "add.placeholder.description": "اكتب تفاصيل دقيقة عن حالة السلعة، المرفقات، مدة الاستخدام لضمان ثقة المتبادلين...",
    "add.label.desired": "السلع المطلوبة في المقابل (الهدف)",
    "add.placeholder.desired": "مثال: لابتوب ماك بوك أو كاميرا تصوير احترافية",
    "add.label.preferences": "تفضيلات تسليم المقايضة والشروط",
    "add.placeholder.preferences": "مثال: أفضل المقابلة الشخصية في منطقة عمان للمعاينة اليدوية لضمان الجودة.",
    "add.label.media": "صور ومقاطع فيديو السلعة",
    "add.media.rules": "ارفع حتى 5 صور عذبة، ومقطع فيديو واحد لإعطاء المصداقية.",
    "add.media.drag": "اسحب الملفات وأفلتها هنا أو انقر للتصفح",
    "add.media.hint": "يدعم الصور بصيغ PNG, JPG وفيديو بصيغة MP4",
    "add.location.title": "تحديد النطاق الجغرافي للتبادل",
    "add.location.approx": "لن يعرض عنوانك الدقيق، فقط النطاق التقريبي لحمايتك",
    "add.location.btn": "الحصول على موقعي التقريبي",
    "add.btn_publish": "نشر الإعلان كنشط آمن",
    "add.success_toast": "🎉 تم نشر إعلان التبادل بنجاح وهو الآن نشط في صفحات البحث!",
    "add.error.title": "عنوان الإعلان قصير جداً (3 حروف على الأقل)",
    "add.error.desc": "الوصف مغمور جداً (10 حروف على الأقل)",
    "add.error.category": "يرجى تحديد تصنيف صالح",
    "add.error.location": "يرجى اختيار بلد ومحافظة ومدينة لتحديد النطاق الجغرافي",

    // Search Page
    "search.title": "منصة التصفح والبحث الذكي",
    "search.placeholder": "ابحث بالكلمات المفتاحية، الماركة أو السلعة المطلوبة...",
    "search.filter.category": "تصنيف البحث",
    "search.filter.country": "البلد",
    "search.filter.governorate": "المحافظة",
    "search.filter.city": "المدينة",
    "search.filter.condition": "الحالة المفضلة",
    "search.btn.clear": "مسح الفلاتر",
    "search.results_count": "إعلان متاح للمقايضة حالياً",
    "search.no_listing": "لم نجد أي إعلانات تلبي خيارات البحث الحالية",
    "search.no_listing_sub": "جرب استخدام كلمات مفتاحية أخرى أو تغيير فلاتر الموقع الجغرافي.",

    // Favorites Page
    "fav.title": "قائمتي المفضلة للمقايضة",
    "fav.subtitle": "الإعلانات التي تتابعها وترغب في مقايضتها لاحقاً أو البدء في مفاوضاتها الجادة.",
    "fav.empty": "قائمة المفضلة فارغة حالياً",
    "fav.empty_sub": "تصفح السلع الرائعة في الصفحة الرئيسية واضغط على القلب لحفظها هنا للرجوع السريع!",

    // Listing Details
    "details.condition": "حالة السلعة",
    "details.category": "تصنيف السلعة",
    "details.desired_label": "السلعة المطلوبة للمقايضة",
    "details.pref_label": "شروط وتفضيلات التسليم وصاحبها",
    "details.contact_owner": "تواصل للمقايضة الفورية",
    "details.chat_started": "فتح نافذة التفاوض",
    "details.by_owner": "هذا إعلانك الخاص",
    "details.edit_ad": "تعديل إعلاني",
    "details.boost_ad": "تمويل الإعلان",
    "details.boost_active": "إعلان ممول",
    "details.back_btn": "العودة",
    "details.boost_countdown": "متبقي على انتهاء التمويل",

    // Profile Page
    "profile.my_manage": "إعلاناتي",
    "profile.tab.active": "السلع النشطة",
    "profile.tab.boosted": "الممولة والترويج",
    "profile.tab.exchanged": "المقايضات المكتملة",
    "profile.edit_btn": "تعديل الحساب",
    "profile.settings_btn": "الإعدادات",
    "profile.stats.title": "إحصائيات بَدِل الخاصة بك",
    "profile.stats.active_ads": "إعلانات معروضة",
    "profile.stats.exchanges": "مقايضات ناجحة",
    "profile.stats.rating": "تقييمك العام",
    "profile.empty_tab_msg": "لا توجد سلع نشطة في هذا التصنيف حالياً.",
    "profile.swap_tester": "مساعد الاختبار وتجربة المقايضة الثنائية (المطوّر):",
    "profile.swap_tester_desc": "لتجربة كود تأكيد التبادل والرد عليها (الراسل والمستقبل): استخدم الأزرار السريعة أدناه للتبديل الفوري بين حسابات المستخدمين في المعاينة لاختبار دورة التبادل الفعلي!",
    "profile.settings.title": "إعدادات التطبيق",
    "profile.settings.lang_switch": "اللغة الحالية",
    
    // Edit Profile Page
    "edit.profile.title": "تعديل بيانات ملفك الشخصي",
    "edit.profile.subtitle": "قم بتحديث معلوماتك الشخصية وموقعك الجغرافي لتسهيل المقابلات اليدوية الآمنة.",
    "edit.profile.name": "الاسم الشخصي/الظاهر",
    "edit.profile.bio": "نبذة عنك وعما تهتم به",
    "edit.profile.country": "البلد",
    "edit.profile.governorate": "المحافظة",
    "edit.profile.city": "المدينة",
    "edit.profile.avatar": "اختر صورة حسابك الشخصية",
    "edit.profile.saving": "جاري حفظ التغييرات بحرص...",
    "edit.profile.saved_success": "تم تحديث بيانات ملفك الشخصي بنجاح!",
    
    // Chats & Chat Room
    "chats.title": "محادثات المبادلة الآمنة",
    "chats.subtitle": "تفاوض وقارن واتفق على مكان التسليم والرمز السري لإتمام المقايضة بنجاح.",
    "chats.empty": "لا توجد لديك محادثات تبادل سابقة بعد",
    "chats.empty_sub": "تواصل مع أصحاب الإعلانات لمعرفة تفاصيل ممتلكاتهم وبدء رحلة المقايضة والتبادل الرائعة!",
    "chat.active_ad": "السلعة موضوع التبادل",
    "chat.back_chats": "المحادثات",
    "chat.placeholder": "اكتب رسالة آمنة...",
    "chat.system_joined": "النظام: بدأت قناة الاتصال المفتوحة للتبادل الآمن.",
    "chat.location_shared": "تمت مشاركة الموقع الجغرافي",

    // Exchange Confirmation flow
    "exchange.btn_confirm": "تأكيد المبادلة",
    "exchange.confirm_modal_title": "إرسال طلب تأكيد المبادلة",
    "exchange.confirm_modal_text": "هل تريد إرسال طلب تأكيد المبادلة لهذا المستخدم؟ بعد موافقة الطرف الآخر سيتم إتمام المبادلة وإخفاء الإعلان من التطبيق.",
    "exchange.send_request": "إرسال الطلب",
    "exchange.request_msg_text": "يريد صاحب الإعلان تأكيد أن عملية المبادلة تمت بينكما. هل توافق؟",
    "exchange.waiting_approval": "بانتظار موافقة الطرف الآخر",
    "exchange.btn_agree": "أوافق على إتمام المبادلة",
    "exchange.btn_reject": "أرفض",
    "exchange.request_rejected": "تم رفض طلب تأكيد المبادلة",
    "exchange.completed_success": "تم إتمام المبادلة بنجاح",
    "exchange.code.enter": "أدخل رمز المبادلة للتأكيد",
    "exchange.code.shown": "رمز المبادلة السري الخاص بك لتقديمه للطرف الآخر:",
    
    // Ask what was exchanged step
    "exchanged.ask_label": "بماذا قمت بتبديل هذا الشيء؟",
    "exchanged.desc_placeholder": "اكتب وصفاً مختصراً للسلعة التي قدمتها في المقابل (اختياري)...",
    "exchanged.upload_images": "أرفق صور السلعة (اختياري):",
    "exchanged.success_submitted": "تم تسجيل تفاصيل المقايضة بنجاح! شكراً لك.",

    // Rating after exchange
    "rating.ask_title": "قيم تجربتك مع هذا المستخدم",
    "rating.text_placeholder": "اكتب تقييمك بصدق وتجربتك في المقابلة والمعاينة...",
    "rating.stars_label": "مستوى الرضا والمصداقية:",
    "rating.success_submitted": "شكراً لتقييمك! تساهم في بناء مجتمع بَدِل آمن وموثوق.",
    
    // Boost Listing Flow
    "boost.title": "تمويل الإعلان وتسريع المقايضة",
    "boost.subtitle": "ثبّت إعلانك في صدر الصفحة الرئيسية ونتائج البحث مع إطار ذهبي لامع لجذب آلاف المهتمين!",
    "boost.watching_ads": "تمويل مجاني عبر مشاهدة الإعلانات الترويجية",
    "boost.watch_btn": "مشاهدة إعلان لجمع نقطة تمويل",
    "boost.points_count": "نقاط التمويل الحالية:",
    "boost.status.active": "التمويل نشط الآن",
    "boost.activate_btn": "تفعيل التمويل لمدة 24 ساعة",
    "boost.success_toast": "🎉 تم تمويل إعلانك وتثبيته في الأعلى بنجاح! سيستمر لـ 24 ساعة.",
    "boost.ends_label": "متبقي على انتهاء التمويل"
  },
  en: {
    // Nav & Header
    "nav.home": "Home",
    "nav.search": "Search",
    "nav.add": "Add Listing",
    "nav.chats": "Chats",
    "nav.profile": "Profile",
    "nav.favorites": "Favorites",
    "brand.title": "Baddil",
    "brand.subtitle": "Your items, new value",
    "header.welcome": "Welcome",
    "header.new_ad": "New Listing",
    "header.logout": "Log Out",

    // Common
    "common.loading": "Loading...",
    "common.error": "Something went wrong, please try again",
    "common.success": "Completed successfully",
    "common.no_results": "No results found",
    "common.retry": "Retry",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.submit": "Submit",
    "common.skip": "Skip",
    "common.yes": "Yes",
    "common.no": "No",
    "common.back": "Back",
    "common.active": "Active",
    "common.inactive": "Inactive",
    "common.exchanged": "Exchanged",
    "common.minutes": "minutes",
    "common.hours": "hours",
    "common.days": "days",
    "common.seconds": "seconds",

    // Auth Page
    "auth.welcome_title": "Welcome to BADDIL",
    "auth.welcome_sub": "The first and secure platform for bartering your belongings in the Arab world",
    "auth.login_tab": "Log In",
    "auth.signup_tab": "Sign Up",
    "auth.email": "Email Address",
    "auth.password": "Password",
    "auth.display_name": "Display Name",
    "auth.bio": "Short Bio",
    "auth.country": "Country",
    "auth.governorate": "Governorate",
    "auth.city": "City",
    "auth.select_city": "Select City",
    "auth.select_governorate": "Select Governorate",
    "auth.select_country": "Select Country",
    "auth.login_btn": "Log In",
    "auth.signup_btn": "Create Account",
    "auth.or_browse": "Browse as Visitor",
    "auth.logout_confirm_title": "Confirm Log Out",
    "auth.logout_confirm_text": "Do you want to log out? Your listings and favorites will be saved and you can browse as a guest.",
    "auth.session_checking": "Checking session security...",

    // Home Page
    "home.search_placeholder": "Search for electronics, phones, games to barter...",
    "home.browse_categories": "Browse by Category",
    "home.all_ads_btn": "All Listings",
    "home.latest_title": "Latest Exchange Offers",
    "home.empty_listings": "No barter exchange offers available at the moment",
    "home.empty_sub": "Be the first to publish items you no longer need and swap them for something useful!",
    "home.category.all": "All",
    "home.category.electronics": "Electronics",
    "home.category.phones": "Phones",
    "home.category.games": "Games",
    "home.category.furniture": "Furniture",
    "home.category.clothes": "Clothes",
    "home.category.cars": "Cars & Accessories",
    "home.category.books": "Books",
    "home.desired_with": "Wants",
    "home.location_general": "General Location",

    // Add / Edit Listing Page
    "add.title": "Publish New Barter Offer",
    "add.subtitle": "Enter details of what you own and what you want in exchange to start secure trades",
    "add.label.title": "Listing Title",
    "add.placeholder.title": "e.g., PS5 like new with two controllers",
    "add.label.category": "Main Category",
    "add.label.condition": "Item Condition",
    "add.label.description": "Detailed Description",
    "add.placeholder.description": "Describe the item condition, accessories, duration of use to build trust...",
    "add.label.desired": "Desired Exchange (Goal)",
    "add.placeholder.desired": "e.g., Macbook Laptop or professional Canon camera",
    "add.label.preferences": "Exchange Delivery & Terms",
    "add.placeholder.preferences": "e.g., Prefers in-person meeting in Amman to inspect item quality.",
    "add.label.media": "Belonging Images & Video",
    "add.media.rules": "Upload up to 5 clear images and 1 video to verify ownership",
    "add.media.drag": "Drag & drop files here or click to browse",
    "add.media.hint": "Supports PNG, JPG and MP4 video format",
    "add.location.title": "Specify Exchange Geofence",
    "add.location.approx": "Your exact address is never shown, only a broad range to protect you",
    "add.location.btn": "Get My Approximate Location",
    "add.btn_publish": "Publish Active Secure Offer",
    "add.success_toast": "🎉 Barter listing published successfully and is now active!",
    "add.error.title": "Title is too short (at least 3 characters)",
    "add.error.desc": "Description is too short (at least 10 characters)",
    "add.error.category": "Please select a valid category",
    "add.error.location": "Please select country, governorate, and city to define geofence",

    // Search Page
    "search.title": "Smart Browse & Filter Portal",
    "search.placeholder": "Search key terms, brands, desired outcomes...",
    "search.filter.category": "Category Filter",
    "search.filter.country": "Country",
    "search.filter.governorate": "Governorate",
    "search.filter.city": "City",
    "search.filter.condition": "Condition Preset",
    "search.btn.clear": "Clear Filters",
    "search.results_count": "barter offers active right now",
    "search.no_listing": "No listings match current filters",
    "search.no_listing_sub": "Try different search terms or change region filters.",

    // Favorites Page
    "fav.title": "My Favorite Barter Offers",
    "fav.subtitle": "Listings you track and hope to trade with or initiate chats with.",
    "fav.empty": "Your favorites list is empty",
    "fav.empty_sub": "Browse great offers on home feed and click the heart icon to save them here!",

    // Listing Details
    "details.condition": "Condition",
    "details.category": "Category",
    "details.desired_label": "Desired Barter Item",
    "details.pref_label": "Delivery Terms & Preferences",
    "details.contact_owner": "Contact for Barter negotiation",
    "details.chat_started": "Open Negotiation Channel",
    "details.by_owner": "This is your own advertisement",
    "details.edit_ad": "Edit My Listing",
    "details.boost_ad": "Boost Advertisement",
    "details.boost_active": "Boosted Offer",
    "details.back_btn": "Go Back",
    "details.boost_countdown": "Boost ends in",

    // Profile Page
    "profile.my_manage": "My Ads",
    "profile.tab.active": "Active Listings",
    "profile.tab.boosted": "Boosted & Promo",
    "profile.tab.exchanged": "Finished Swaps",
    "profile.edit_btn": "Edit Profile",
    "profile.settings_btn": "Settings",
    "profile.stats.title": "Your Baddil Statistics",
    "profile.stats.active_ads": "Active Ads",
    "profile.stats.exchanges": "Successful Swaps",
    "profile.stats.rating": "General Rating",
    "profile.empty_tab_msg": "No active listings in this section currently.",
    "profile.swap_tester": "Barter Testing & QuickSwap Aide (Developer):",
    "profile.swap_tester_desc": "To test the exchange approval workflow from both sides: Use user picker buttons below to hot-swap accounts in this preview room instantly!",
    "profile.settings.title": "Application Settings",
    "profile.settings.lang_switch": "Current Language",

    // Edit Profile Page
    "edit.profile.title": "Update Profile Details",
    "edit.profile.subtitle": "Update your general info and location coordinates to make secure offline meetings easier.",
    "edit.profile.name": "Personal/Display Name",
    "edit.profile.bio": "Short bio and barter interests",
    "edit.profile.country": "Country",
    "edit.profile.governorate": "Governorate",
    "edit.profile.city": "City",
    "edit.profile.avatar": "Select Profile Avatar Photo",
    "edit.profile.saving": "Saving changes securely...",
    "edit.profile.saved_success": "Your profile updated successfully!",

    // Chats & Chat Room
    "chats.title": "Secure Barter Messaging",
    "chats.subtitle": "Negotiate, compare, and agree on location and security code to finalize barter swaps.",
    "chats.empty": "You have no communication records yet",
    "chats.empty_sub": "Engage with listing owners to explore details and kickstart your barter voyage!",
    "chat.active_ad": "Barter Topic Item",
    "chat.back_chats": "Chats List",
    "chat.placeholder": "Type an encrypted secure message...",
    "chat.system_joined": "System: Secure peer conversation pathway initiated.",
    "chat.location_shared": "Shared approximate location coordinates",

    // Exchange Confirmation flow
    "exchange.btn_confirm": "Confirm Exchange",
    "exchange.confirm_modal_title": "Send Exchange Finalization Request",
    "exchange.confirm_modal_text": "Do you want to send an exchange confirmation request to this user? After the other party approves, the exchange will be completed and the listing will be hidden from the app.",
    "exchange.send_request": "Send Request",
    "exchange.request_msg_text": "The listing owner wants to confirm that the exchange was completed between you. Do you agree?",
    "exchange.waiting_approval": "Waiting for the other party to approve",
    "exchange.btn_agree": "I agree to complete the exchange",
    "exchange.btn_reject": "Reject",
    "exchange.request_rejected": "The exchange confirmation request was rejected",
    "exchange.completed_success": "The exchange was completed successfully",
    "exchange.code.enter": "Enter the exchange code to confirm",
    "exchange.code.shown": "Your secret exchange code to present to peer:",

    // Ask what was exchanged step
    "exchanged.ask_label": "What did you exchange for this item?",
    "exchanged.desc_placeholder": "Write a short description of the item you swapped in return (optional)...",
    "exchanged.upload_images": "Attach item photos (optional):",
    "exchanged.success_submitted": "Exchange specifications submitted! Thank you.",

    // Rating after exchange
    "rating.ask_title": "Rate your experience with this user",
    "rating.text_placeholder": "Write your honest rating about the meeting and item verification process...",
    "rating.stars_label": "Satisfaction & Trust Level:",
    "rating.success_submitted": "Thank you for the review! You are keeping Baddil safe and clean.",

    // Boost Listing Flow
    "boost.title": "Boost Ad & Swap Faster",
    "boost.subtitle": "Pin your listing to top slots with a shiny golden glowing frame to capture eyes!",
    "boost.watching_ads": "Free Boosting by Watching Sponsor Spots",
    "boost.watch_btn": "Launch Sponsor Video (Add Point)",
    "boost.points_count": "Active Boost Points:",
    "boost.status.active": "Boost currently fully active",
    "boost.activate_btn": "Launch Boost for 24 hours",
    "boost.success_toast": "🎉 Exchange offer boosted successfully for the next 24 hours!",
    "boost.ends_label": "Boost ends in"
  }
};

interface LanguageContextType {
  language: Language;
  direction: 'rtl' | 'ltr';
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translateCategory: (cat: string) => string;
  translateCondition: (cond: string) => string;
  translateLocation: (locName: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // 1. Get from localStorage
    const saved = localStorage.getItem('badal_language');
    if (saved === 'ar' || saved === 'en') return saved;
    return 'ar'; // Default language Arabic
  });

  const direction = language === 'ar' ? 'rtl' : 'ltr';

  // Apply language direction immediately to DOM
  useEffect(() => {
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', language);
    localStorage.setItem('badal_language', language);
  }, [language, direction]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    // For logged-in users, save it in their profile if possible
    try {
      const currentUserId = await dbService.getCurrentUserId();
      if (currentUserId) {
        await dbService.updateProfileLanguage(currentUserId, lang);
      }
    } catch (e) {
      console.warn("Could not persist language to user profile doc directly (expected for visitor/offline mode)", e);
    }
  };

  // Synchronize language if user signs in
  useEffect(() => {
    const unsub = dbService.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const profile = await dbService.getUserProfile(user.uid);
          if (profile && (profile as any).locale) {
            const profileLang = (profile as any).locale;
            if (profileLang === 'ar' || profileLang === 'en') {
              setLanguageState(profileLang);
            }
          }
        } catch (e) {
          console.warn("Could not read language locale from user profile", e);
        }
      }
    });
    return () => unsub && unsub();
  }, []);

  const t = (key: string): string => {
    const translationSet = translations[language];
    if (translationSet && translationSet[key]) {
      return translationSet[key];
    }
    // Fallback to Arabic translation if available, otherwise just use key
    const arFallback = translations['ar'][key];
    if (arFallback) return arFallback;
    return key;
  };

  const translateCategory = (cat: string): string => {
    const map: Record<string, string> = {
      'الكل': t('home.category.all'),
      'إلكترونيات': t('home.category.electronics'),
      'هواتف': t('home.category.phones'),
      'ألعاب': t('home.category.games'),
      'أثاث': t('home.category.furniture'),
      'ملابس': t('home.category.clothes'),
      'سيارات وإكسسوارات': t('home.category.cars'),
      'كتب': t('home.category.books'),
      'أجهزة منزلية': language === 'ar' ? 'أجهزة منزلية' : 'Home Appliances',
      'رياضة': language === 'ar' ? 'رياضة' : 'Sports',
      'أدوات': language === 'ar' ? 'أدوات' : 'Tools',
      'مقتنيات': language === 'ar' ? 'مقتنيات' : 'Collectibles',
      'أخرى': language === 'ar' ? 'أخرى' : 'Other'
    };
    return map[cat] || cat;
  };

  const translateCondition = (cond: string): string => {
    const map: Record<string, string> = {
      'جديد': language === 'ar' ? 'جديد' : 'New',
      'شبه جديد': language === 'ar' ? 'شبه جديد' : 'Like New',
      'مستعمل بحالة جيدة': language === 'ar' ? 'مستعمل بحالة جيدة' : 'Used - Good',
      'مستعمل': language === 'ar' ? 'مستعمل' : 'Used',
      'يحتاج صيانة': language === 'ar' ? 'يحتاج صيانة' : 'Needs Maintenance'
    };
    return map[cond] || cond;
  };

  const translateLocation = (locName: string): string => {
    if (!locName) return '';
    if (language === 'ar') return locName;
    const map: Record<string, string> = {
      // Countries
      'الأردن': 'Jordan',
      'فلسطين': 'Palestine',
      'السعودية': 'Saudi Arabia',
      'الإمارات العربية المتحدة': 'United Arab Emirates',
      'قطر': 'Qatar',
      'الكويت': 'Kuwait',
      'البحرين': 'Bahrain',
      'عُمان': 'Oman',
      'اليمن': 'Yemen',
      'العراق': 'Iraq',
      'سوريا': 'Syria',
      'لبنان': 'Lebanon',
      'مصر': 'Egypt',
      'السودان': 'Sudan',
      'ليبيا': 'Libya',
      'تونس': 'Tunisia',
      'الجزائر': 'Algeria',
      'المغرب': 'Morocco',
      'موريتانيا': 'Mauritania',
      'الصومال': 'Somalia',
      'جيبوتي': 'Djibouti',
      'جزر القمر': 'Comoros',

      // Jordan
      'عمان': 'Amman',
      'غرب عمان': 'West Amman',
      'شرق عمان': 'East Amman',
      'شفا بدران': 'Shafa Badran',
      'الجبيهة': 'Jubaiha',
      'تلاع العلي': "Tla' Al-Ali",
      'إربد': 'Irbid',
      'وسط إربد': 'Irbid Center',
      'بني عبيد': 'Bani Obeid',
      'الرمثا': 'Ramtha',
      'الزرقاء': 'Zarqa',
      'الزرقاء الجديدة': 'New Zarqa',
      'الرصيفة': 'Russeifa',

      // Palestine
      'القدس': 'Jerusalem',
      'البلدة القديمة': 'Old City',
      'بيت حنينا': 'Beit Hanina',
      'شعفاط': "Shu'afat",
      'رام الله والبيرة': 'Ramallah & Al-Bireh',
      'رام الله': 'Ramallah',
      'البيرة': 'Al-Bireh',
      'بيتونيا': 'Betunia',
      'غزة': 'Gaza',
      'غزة الشمالية': 'North Gaza',
      'خانيونس': 'Khan Yunis',
      'رفح': 'Rafah',

      // Saudi Arabia
      'الرياض': 'Riyadh',
      'الرياض - شمال': 'North Riyadh',
      'الرياض - شرق': 'East Riyadh',
      'الرياض - جنوب': 'South Riyadh',
      'الخرج': 'Al-Kharj',
      'مكة المكرمة': 'Makkah',
      'جدة': 'Jeddah',
      'الطائف': 'Taif',
      'المنطقة الشرقية': 'Eastern Province',
      'الدمام': 'Dammam',
      'الخبر': 'Khobar',
      'الجبيل': 'Jubail',
      'الأحساء': 'Al-Ahsa',

      // UAE
      'دبي': 'Dubai',
      'ديرة': 'Deira',
      'بر دبي': 'Bur Dubai',
      'مرسى دبي (مارينا)': 'Dubai Marina',
      'أبوظبي': 'Abu Dhabi',
      'وسط المدينة': 'Downtown',
      'العين': 'Al Ain',
      'الظفرة': 'Al Dhafra',
      'الشارقة': 'Sharjah',
      'المجاز': 'Al Majaz',
      'الذيد': 'Al Dhaid',

      // Qatar
      'الدوحة': 'Doha',
      'السد': 'Al Sadd',
      'اللؤلؤة': 'The Pearl',
      'الدفنة': 'Al Dafna',
      'الريان': 'Al Rayyan',
      'معيذر': 'Muaither',
      'الغرافة': 'Al Gharrafa',

      // Kuwait
      'العاصمة': 'Capital',
      'شرق': 'Sharq',
      'القبلة': 'Qibla',
      'الشويخ': 'Shuwaikh',
      'حوّلي': 'Hawally',
      'السالمية': 'Salmiya',
      'الجابرية': 'Jabriya',
      'سلوى': 'Salwa',

      // Bahrain
      'محافظة العاصمة': 'Capital Governorate',
      'المنامة': 'Manama',
      'الجفير': 'Juffair',
      'ضاحية السيف': 'Seef District',
      'محافظة المحرق': 'Muharraq Governorate',
      'المحرق': 'Muharraq',
      'البسيتين': 'Busaiteen',

      // Oman
      'مسقط': 'Muscat',
      'السيب': 'Seeb',
      'المطرح': 'Mutrah',
      'بوشر': 'Bawsher',
      'ظفار': 'Dhofar',
      'صلالة': 'Salalah',
      'طاقة': 'Taqah',

      // Yemen
      'صنعاء': 'Sanaa',
      'وسط العاصمة': 'City Center',
      'حدة': 'Hadda',
      'عدن': 'Aden',
      'كريتر': 'Crater',
      'المنصورة': 'Al Mansoura',
      'الشيخ عثمان': 'Sheikh Othman',

      // Iraq
      'بغداد': 'Baghdad',
      'الكرادة': 'Karrada',
      'المنصور': 'Mansour',
      'الأعظمية': 'Adhamiyah',
      'أربيل': 'Erbil',
      'وسط أربيل': 'Erbil Center',
      'عينكاوة': 'Ainkawa',
      'البصرة': 'Basra',
      'العشار': 'Ashar',
      'العباسية': 'Abbassia',

      // Syria
      'دمشق': 'Damascus',
      'أبو رمانة': 'Abu Rummaneh',
      'المالكي': 'Al Malki',
      'المزة': 'Mazzeh',
      'حلب': 'Aleppo',
      'الجميلية': 'Jamiliyah',
      'المحافظة': 'Al Mohafaza',

      // Lebanon
      'بيروت': 'Beirut',
      'الحمرا': 'Hamra',
      'الأشرفية': 'Achrafieh',
      'وسط بيروت': 'Beirut Central District',
      'الشمال': 'North Lebanon',
      'طرابلس': 'Tripoli',
      'البترون': 'Batroun',

      // Egypt
      'القاهرة': 'Cairo',
      'مصر الجديدة': 'Heliopolis',
      'التجمع الخامس': 'Fifth Settlement',
      'المعادي': 'Maadi',
      'شبرا': 'Shubra',
      'الجيزة': 'Giza',
      'المهندسين': 'Mohandessin',
      'الدقي': 'Dokki',
      'السادس من أكتوبر': '6th of October',
      'الإسكندرية': 'Alexandria',
      'سموحة': 'Smouha',
      'المنتزة': 'Montaza',
      'محرم بك': 'Moharam Bek',

      // Sudan
      'الخرطوم': 'Khartoum',
      'الرياض السودانية': 'Al Riyadh (Khartoum)',
      'الخرطوم 2': 'Khartoum 2',

      // Libya
      // 'طرابلس': 'Tripoli', (already defined above)
      'حي الأندلس': 'Hay El Andalus',
      'قرجي': 'Gourji',

      // Tunisia
      'محافظة تونس': 'Tunis Governorate',
      'قرطاج': 'Carthage',
      'المرسى': 'La Marsa',
      'حي النصر': 'Ennasr',

      // Algeria
      'الجزائر العاصمة': 'Algiers',
      'دالي إبراهيم': 'Dely Ibrahim',
      'سيدي يحيى': 'Sidi Yahia',
      'باب الواد': 'Bab El Oued',

      // Morocco
      'الدار البيضاء الكبرى': 'Grand Casablanca',
      'المعاضيد': 'Maadid',
      'عين دياب': 'Ain Diab',
      'الرباط سلا القنيطرة': 'Rabat-Salé-Kénitra',
      'أكدال': 'Agdal',
      'السويسي': 'Souissi',
      'حي الرياض': 'Hay Riad',

      // Mauritania
      'نواكشوط': 'Nouakchott',
      'تفرغ زينة': 'Tevragh Zeina',
      'الميناء': 'El Mina',

      // Somalia
      'بنادر': 'Banaadir',
      'مقديشو': 'Mogadishu',

      // Djibouti
      'إقليم جيبوتي': 'Djibouti Region',
      'جيبوتي العاصمة': 'Djibouti City',

      // Comoros
      'جزيرة القمر الكبرى': 'Grande Comore',
      'موروني': 'Moroni'
    };
    return map[locName] || locName;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage, t, translateCategory, translateCondition, translateLocation }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
