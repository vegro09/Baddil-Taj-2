import {
  isMockMode,
  db,
  auth,
  storage,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
} from 'firebase/firestore';
import {
  Profile,
  Listing,
  Favorite,
  Chat,
  Message,
  MessageType,
  ListingBoost,
  Exchange,
  ExchangeDetails,
  UserRating,
  isListingBoosted,
  AppReport,
  AdminAuditLog,
  SupportTicket,
  SystemAnnouncement,
  AdminSettings
} from '../types';
import { dbCircuitBreaker } from '../utils/circuitBreaker';
import { compressImageToWebP } from '../utils/imageCompressor';
import {
  asyncInitializeStorage,
  getMemoryItem,
  setMemoryItem,
  storageReady,
  asyncGetItem,
  asyncSetItem
} from '../utils/indexedDB';

// Let's seed mock storage if unset
const MOCK_PROFILES_KEY = 'badal_mock_profiles';
const MOCK_LISTINGS_KEY = 'badal_mock_listings';
const MOCK_FAVORITES_KEY = 'badal_mock_favorites';
const MOCK_CHATS_KEY = 'badal_mock_chats';
const MOCK_MESSAGES_KEY = 'badal_mock_messages';
const MOCK_EXCHANGES_KEY = 'badal_mock_exchanges';
const MOCK_EXCHANGE_DETAILS_KEY = 'badal_mock_exchange_details';
const MOCK_RATINGS_KEY = 'badal_mock_ratings';

function normalizeId(id: any): string {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'object') {
    if (typeof id.id === 'string') return id.id;
    if (typeof id.chatId === 'string') return id.chatId;
    if (typeof id.conversationId === 'string') return id.conversationId;
  }
  return String(id);
}
const MOCK_BOOSTS_KEY = 'badal_mock_boosts';
const CURRENT_MOCK_USER_ID_KEY = 'badal_current_mock_user_id';

const INITIAL_PROFILES: Record<string, Profile> = {
  "user_amr": {
    id: "user_amr",
    display_name: "عمرو السعدني",
    username: "k:000001",
    country: "مصر",
    governorate: "القاهرة",
    city: "التجمع الخامس",
    bio: "أهتم بتبادل الإلكترونيات الراقية والمقتنيات الكلاسيكية.",
    average_rating: 4.8,
    ratings_count: 5,
    active_listings_count: 2,
    completed_exchanges_count: 12,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updated_at: new Date().toISOString()
  },
  "user_hassan": {
    id: "user_hassan",
    display_name: "حسن الطراونة",
    username: "k:000002",
    country: "الأردن",
    governorate: "عمان",
    city: "غرب عمان",
    bio: "محب للألعاب الكلاسيكية والمنزلية والمبادلات المفتوحة.",
    average_rating: 4.9,
    ratings_count: 8,
    active_listings_count: 1,
    completed_exchanges_count: 6,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    updated_at: new Date().toISOString()
  },
  "user_fatima": {
    id: "user_fatima",
    display_name: "فاطمة الزهراء",
    username: "k:000003",
    country: "الجزائر",
    governorate: "الجزائر العاصمة",
    city: "دالي إبراهيم",
    bio: "مصممة أزياء مهتمة بتبادل الملابس الراقية والإكسسوارات المصنوعة يدوياً.",
    average_rating: 4.7,
    ratings_count: 3,
    active_listings_count: 1,
    completed_exchanges_count: 4,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
    updated_at: new Date().toISOString()
  }
};

const INITIAL_LISTINGS: Listing[] = [
  {
    id: "list_playstation",
    owner_id: "user_hassan",
    title: "بلايستيشن 5 بحالة ممتازة مع ذراعين تحكم",
    description: "جهاز بلايستيشن 5 أصلي، مستعمل لشهور قليلة جداً وبحالة شبه جديدة. أرغب في تبديله مع جهاز لابتوب مناسب للعمل أو كاميرا احترافية للتصوير.",
    category: "ألعاب",
    condition: "شبه جديد",
    country: "الأردن",
    governorate: "عمان",
    city: "غرب عمان",
    approximate_latitude: 31.95,
    approximate_longitude: 35.91,
    images: ["https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600"],
    videos: [],
    desired_exchange: "لابتوب للعمل أو كاميرا كانون احترافية",
    exchange_preferences: "أفضل المقابلة الشخصية في عمان الغربية للمعاينة اليدوية لضمان الجودة.",
    status: "active",
    is_active: true,
    is_boosted: true,
    boosted_until: new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString(), // 36 hours remaining
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: "list_iphone",
    owner_id: "user_amr",
    title: "آيفون 13 برو ماكس 256 جيجا أزرق",
    description: "الجهاز فيه خدش بسيط في الشاشة الخلفية لكن يعمل بشكل ممتاز ونسبة الصحة للبطارية 88٪. لم يتم فتحه أو صيانته من قبل.",
    category: "هواتف",
    condition: "مستعمل بحالة جيدة",
    country: "مصر",
    governorate: "القاهرة",
    city: "التجمع الخامس",
    approximate_latitude: 30.01,
    approximate_longitude: 31.42,
    images: ["https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=600"],
    videos: [],
    desired_exchange: "سامسونج S23 الترا أو نوت 20 مع دفع الفارق لو لزم",
    exchange_preferences: "التجمع الخامس أو الشيراتون للمقابلة الشخصية فقط.",
    status: "active",
    is_active: true,
    is_boosted: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
  },
  {
    id: "list_camera",
    owner_id: "user_fatima",
    title: "كاميرا نيكون D3500 للمبتدئين",
    description: "كاميرا ممتازة جدا لبدء هواية التصوير फोटोग्राफी، العدسة الأساسية 18-55 مم مع الحزام والشاحن والبطارية الأصلية وحقيبة مبطنة.",
    category: "إلكترونيات",
    condition: "جديد",
    country: "الجزائر",
    governorate: "الجزائر العاصمة",
    city: "دالي إبراهيم",
    approximate_latitude: 36.75,
    approximate_longitude: 3.01,
    images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600"],
    videos: [],
    desired_exchange: "جيتار كهربائي بحالة ممتازة أو آيباد",
    exchange_preferences: "أفضل التسليم يداً بيد للتحقق من عدسة الكاميرا وتجربة الالتقاط.",
    status: "active",
    is_active: true,
    is_boosted: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString()
  }
];

const DEFAULT_INITIALIZERS: Record<string, any> = {
  [CURRENT_MOCK_USER_ID_KEY]: '',
  'badal_mock_accounts': [
    { email: 'amr@badal.com', password: 'password123', userId: 'user_amr' },
    { email: 'hassan@badal.com', password: 'password123', userId: 'user_hassan' },
    { email: 'fatima@badal.com', password: 'password123', userId: 'user_fatima' }
  ],
  [MOCK_PROFILES_KEY]: INITIAL_PROFILES,
  [MOCK_LISTINGS_KEY]: INITIAL_LISTINGS,
  [MOCK_FAVORITES_KEY]: [],
  [MOCK_CHATS_KEY]: [],
  [MOCK_MESSAGES_KEY]: [],
  [MOCK_EXCHANGES_KEY]: [],
  [MOCK_EXCHANGE_DETAILS_KEY]: [],
  [MOCK_RATINGS_KEY]: [
    { id: "r1", exchange_id: "ex1", listing_id: "l1", reviewer_user_id: "user_hassan", reviewed_user_id: "user_amr", rating_value: 5, review_text: "شخص محترم جدا وسريع في التعامل والتبادل", created_at: new Date().toISOString() },
    { id: "r2", exchange_id: "ex2", listing_id: "l2", reviewer_user_id: "user_fatima", reviewed_user_id: "user_amr", rating_value: 5, review_text: "ما شاء الله تعامل راقي جدا", created_at: new Date().toISOString() },
    { id: "r3", exchange_id: "ex3", listing_id: "l3", reviewer_user_id: "user_hassan", reviewed_user_id: "user_amr", rating_value: 4, review_text: "أنصح بالتعامل معه، دقة في المواعيد", created_at: new Date().toISOString() },
    { id: "r4", exchange_id: "ex4", listing_id: "l4", reviewer_user_id: "user_fatima", reviewed_user_id: "user_amr", rating_value: 5, review_text: "سلعة ممتازة ومطابقة للوصف تماما", created_at: new Date().toISOString() },
    { id: "r5", exchange_id: "ex5", listing_id: "l5", reviewer_user_id: "user_hassan", reviewed_user_id: "user_amr", rating_value: 5, review_text: "ممتاز جدا ومتعاون", created_at: new Date().toISOString() },
    { id: "r6", exchange_id: "ex6", listing_id: "l6", reviewer_user_id: "user_amr", reviewed_user_id: "user_hassan", rating_value: 5, review_text: "قمت بتبادل بليستيشن ٥ معه وكان رائعا وسريعا", created_at: new Date().toISOString() },
    { id: "r7", exchange_id: "ex7", listing_id: "l7", reviewer_user_id: "user_fatima", reviewed_user_id: "user_hassan", rating_value: 5, review_text: "تعامل رائع وموثوق", created_at: new Date().toISOString() },
    { id: "r8", exchange_id: "ex8", listing_id: "l8", reviewer_user_id: "user_amr", reviewed_user_id: "user_hassan", rating_value: 5, review_text: "أنصح الجميع بالتبادل معه دون تردد", created_at: new Date().toISOString() },
    { id: "r9", exchange_id: "ex9", listing_id: "l9", reviewer_user_id: "user_fatima", reviewed_user_id: "user_hassan", rating_value: 4, review_text: "مبادلة ممتازة وجيدة جدا", created_at: new Date().toISOString() },
    { id: "r10", exchange_id: "ex10", listing_id: "l10", reviewer_user_id: "user_amr", reviewed_user_id: "user_hassan", rating_value: 5, review_text: "أفضل تجربة مقايضة حظيت بها", created_at: new Date().toISOString() },
    { id: "r11", exchange_id: "ex11", listing_id: "l11", reviewer_user_id: "user_fatima", reviewed_user_id: "user_hassan", rating_value: 5, review_text: "مبتسم ومتعاون دائما", created_at: new Date().toISOString() },
    { id: "r12", exchange_id: "ex12", listing_id: "l12", reviewer_user_id: "user_amr", reviewed_user_id: "user_hassan", rating_value: 5, review_text: "كل التقدير لحسن خلقه وسرعته", created_at: new Date().toISOString() },
    { id: "r13", exchange_id: "ex13", listing_id: "l13", reviewer_user_id: "user_fatima", reviewed_user_id: "user_hassan", rating_value: 5, review_text: "أغراض بحالة ممتازة كما بالصور", created_at: new Date().toISOString() },
    { id: "r14", exchange_id: "ex14", listing_id: "l14", reviewer_user_id: "user_amr", reviewed_user_id: "user_fatima", rating_value: 5, review_text: "تبادلنا بعض المعروضات الملابس وكان رائع جدا", created_at: new Date().toISOString() },
    { id: "r15", exchange_id: "ex15", listing_id: "l15", reviewer_user_id: "user_hassan", reviewed_user_id: "user_fatima", rating_value: 5, review_text: "جودة ممتازة في الأغراض ودقة متناهية", created_at: new Date().toISOString() },
    { id: "r16", exchange_id: "ex16", listing_id: "l16", reviewer_user_id: "user_amr", reviewed_user_id: "user_fatima", rating_value: 4, review_text: "شخصية لطيفة وسريعة الرد والاستجابة", created_at: new Date().toISOString() }
  ],
  [MOCK_BOOSTS_KEY]: [],
  'badal_mock_admin_settings': {
    max_image_size_kb: 500,
    max_video_size_kb: 750,
    boost_duration_hours: 24,
    rewarded_ads_required: 3,
    enabled_languages: ['ar', 'en'],
    default_language: 'ar',
    last_updated_at: new Date().toISOString(),
    last_updated_by: 'system'
  }
};

// Asynchronously initialize mock storage in background to unblock layout rendering
if (isMockMode) {
  asyncInitializeStorage(DEFAULT_INITIALIZERS).catch(err => {
    console.error("[Badal Storage] Async initialization failed", err);
  });
}

// Simple unique ID generator
export function generateId() {
  return 'badal_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// HELPER FOR READING/WRITING MOCK LOCAL STORAGE SAFELY (Direct cache hits, async persisted background tasks)
export function getMockCollection<T>(key: string): T {
  return getMemoryItem<T>(key, (DEFAULT_INITIALIZERS[key] || []) as T);
}

export function writeMockCollection(key: string, data: any) {
  setMemoryItem(key, data);
}

// ==========================================
// DATABASE UTILITIES AND SERVICES
// ==========================================
export const dbService = {
  // --------- AUTHENTICATION SERVICE ---------
  async getCurrentUserId(): Promise<string> {
    if (isMockMode) {
      await storageReady();
      return getMemoryItem(CURRENT_MOCK_USER_ID_KEY, '');
    }
    return auth?.currentUser?.uid || '';
  },

  async getCurrentUserEmail(): Promise<string> {
    if (isMockMode) {
      const uid = await this.getCurrentUserId();
      if (!uid) return '';
      const profiles = getMockCollection<Record<string, any>>(MOCK_PROFILES_KEY);
      return profiles[uid]?.email_visible || getMemoryItem('current_mock_user_email', 'baddil.support@gmail.com');
    }
    return auth?.currentUser?.email || '';
  },

  async generateNextUserCode(): Promise<string> {
    let codes: string[] = [];
    if (isMockMode) {
      const profiles = getMockCollection<Record<string, Profile>>(MOCK_PROFILES_KEY);
      codes = Object.values(profiles).map(p => p.username || '');
    } else {
      try {
        const snap = await getDocs(collection(db, 'profiles'));
        codes = snap.docs.map(d => (d.data() as Profile).username || '');
      } catch (e) {
        console.warn("Failed to read all profiles for generating user code", e);
      }
    }

    const numbers = codes
      .map(c => {
        const match = c.match(/^k:(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);

    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNum = maxNum + 1;
    return `k:${String(nextNum).padStart(6, '0')}`;
  },

  async login(email: string, password: string): Promise<any> {
    if (isMockMode) {
      const accounts = getMockCollection<any[]>('badal_mock_accounts');
      const found = accounts.find(acc => acc.email.toLowerCase().trim() === email.toLowerCase().trim());
      if (!found || found.password !== password) {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }
      setMemoryItem(CURRENT_MOCK_USER_ID_KEY, found.userId);
      window.dispatchEvent(new Event('badal_auth_change'));
      return { uid: found.userId, email: found.email };
    } else {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      try {
        const idToken = await credential.user.getIdToken();
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken })
        }).catch(err => console.warn("Failed to sync session cookie on login:", err));

        await setDoc(
          doc(db, "users", credential.user.uid),
          {
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      } catch (firestoreError: any) {
        console.error("Firebase login Firestore users write failed:", {
          code: firestoreError.code,
          message: firestoreError.message
        });
      }
      
      return credential.user;
    }
  },

  async signInWithGoogle(): Promise<any> {
    if (isMockMode) {
      const accounts = getMockCollection<any[]>( 'badal_mock_accounts');
      const found = accounts.find(acc => acc.email === 'amr@badal.com');
      const userId = found ? found.userId : 'user_amr';
      setMemoryItem(CURRENT_MOCK_USER_ID_KEY, userId);
      window.dispatchEvent(new Event('badal_auth_change'));
      return { uid: userId, email: 'amr@badal.com', displayName: 'عمرو السعدني' };
    } else {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      let userCredential;
      try {
        userCredential = await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        console.warn("Popup authentication failed or was closed/blocked. Trying redirect...", popupError);
        if (popupError.code === 'auth/popup-closed-by-user' || popupError.code === 'auth/cancelled-popup-request') {
          throw popupError;
        }
        try {
          await signInWithRedirect(auth, provider);
          return null; // Redirect will refresh the page
        } catch (redirectError) {
          throw redirectError;
        }
      }

      const user = userCredential.user;
      const uid = user.uid;
      const userRef = doc(db, 'users', uid);

      let existingUserDoc = null;
      try {
        existingUserDoc = await getDoc(userRef);
      } catch (err) {
        console.warn("Could not check if user exists in Firestore:", err);
      }

      const userData: any = {
        uid: uid,
        displayName: user.displayName || 'Google User',
        email: user.email || '',
        photoURL: user.photoURL || '',
        provider: 'google',
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      try {
        if (!existingUserDoc || !existingUserDoc.exists()) {
          userData.role = 'user';
          userData.status = 'active';
          userData.createdAt = serverTimestamp();
          await setDoc(userRef, userData);
        } else {
          const exData = existingUserDoc.data();
          userData.role = exData?.role || 'user';
          userData.status = exData?.status || 'active';
          await setDoc(userRef, userData, { merge: true });
        }
      } catch (err: any) {
        console.error("Firebase Google sign-in users/{uid} write failed:", {
          code: err.code,
          message: err.message
        });
      }

      // Sync and provision Badal profile
      const profileRef = doc(db, 'profiles', uid);
      try {
        const snap = await getDoc(profileRef);
        if (!snap.exists()) {
          const nextCode = await this.generateNextUserCode();
          const pData = {
            id: uid,
            display_name: user.displayName || 'مستخدم جوجل',
            username: nextCode,
            country: 'الأردن',
            governorate: '',
            city: '',
            profile_image_url: user.photoURL || '',
            average_rating: 5.0,
            ratings_count: 0,
            active_listings_count: 0,
            completed_exchanges_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          await setDoc(profileRef, pData);
        }
      } catch (err: any) {
        console.error("Firebase Google sign-in profiles/{uid} write failed:", {
          code: err.code,
          message: err.message
        });
      }

      return user;
    }
  },

  async signUp(input: {
    email: string;
    password: any;
    displayName: string;
    country: string;
    governorate: string;
    city: string;
    profileImageUrl?: string;
    termsAccepted?: boolean;
    termsAcceptedAt?: string;
    termsVersion?: string;
    privacyAccepted?: boolean;
    privacyAcceptedAt?: string;
    privacyVersion?: string;
    legalAccepted?: boolean;
    legalAcceptedAt?: string;
    legalVersion?: string;
    appLanguageAtConsent?: string;
    consentSource?: 'signup' | 'existing_user_login' | 'unspecified';
  }): Promise<any> {
    const { email, password, displayName, country, governorate, city, profileImageUrl } = input;
    
    if (isMockMode) {
      const accounts = getMockCollection<any[]>('badal_mock_accounts');
      const exists = accounts.some(acc => acc.email.toLowerCase().trim() === email.toLowerCase().trim());
      if (exists) {
        throw new Error('البريد الإلكتروني مستخدم بالفعل');
      }
      
      const newUserId = 'badal_user_' + Math.random().toString(36).substring(2, 9) + Date.now();
      accounts.push({ email, password, userId: newUserId });
      writeMockCollection('badal_mock_accounts', accounts);
      
      const nextCode = await this.generateNextUserCode();
      const defaultProfile: Profile = {
        id: newUserId,
        display_name: displayName,
        username: nextCode,
        country: country || "",
        governorate: governorate || "",
        city: city || "",
        profile_image_url: profileImageUrl || "",
        average_rating: 5.0,
        ratings_count: 0,
        active_listings_count: 0,
        completed_exchanges_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        termsAccepted: input.termsAccepted || false,
        termsAcceptedAt: input.termsAcceptedAt || "",
        termsVersion: input.termsVersion || "",
        privacyAccepted: input.privacyAccepted || false,
        privacyAcceptedAt: input.privacyAcceptedAt || "",
        privacyVersion: input.privacyVersion || "",
        legalAccepted: input.legalAccepted || false,
        legalAcceptedAt: input.legalAcceptedAt || "",
        legalVersion: input.legalVersion || "",
        appLanguageAtConsent: input.appLanguageAtConsent || "",
        consentSource: input.consentSource || "unspecified"
      };
      
      const profiles = getMockCollection<Record<string, Profile>>(MOCK_PROFILES_KEY);
      profiles[newUserId] = defaultProfile;
      writeMockCollection(MOCK_PROFILES_KEY, profiles);
      
      setMemoryItem(CURRENT_MOCK_USER_ID_KEY, newUserId);
      window.dispatchEvent(new Event('badal_auth_change'));
      return { uid: newUserId, email };
    } else {
      // Real firebase auth
      // Validate the password strength and fields on the server side first
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName })
      });
      if (!registerRes.ok) {
        const errData = await registerRes.json();
        throw new Error(errData.message || "فشلت عملية التحقق في الخادم");
      }

      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      
      const userId = credential.user.uid;
      const userEmail = credential.user.email;
      
      // Update profile display name inside auth if standard firebase
      try {
        await updateProfile(credential.user, { displayName: displayName.trim() });
      } catch (e) {
        console.warn("Failed to update display name inside Firebase Auth user profile.", e);
      }
      
      // Create user document in users/{uid}
      try {
        const userRef = doc(db, 'users', userId);
        await setDoc(
          userRef,
          {
            uid: userId,
            email: userEmail,
            displayName: displayName?.trim() || "",
            provider: "password",
            role: "user",
            status: "active",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
          },
          { merge: true }
        );
      } catch (firestoreError: any) {
        console.error("Firebase registration users/{uid} write failed:", {
          code: firestoreError.code,
          message: firestoreError.message
        });
      }
      
      // Initialize firestore profile
      try {
        const nextCode = await this.generateNextUserCode();
        const docRef = doc(db, 'profiles', userId);
        const profileData: Profile = {
          id: userId,
          display_name: displayName,
          username: nextCode,
          country: country || "الأردن",
          governorate: governorate || "",
          city: city || "",
          profile_image_url: profileImageUrl || "",
          average_rating: 5.0,
          ratings_count: 0,
          active_listings_count: 0,
          completed_exchanges_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          termsAccepted: input.termsAccepted || false,
          termsAcceptedAt: input.termsAcceptedAt || "",
          termsVersion: input.termsVersion || "",
          privacyAccepted: input.privacyAccepted || false,
          privacyAcceptedAt: input.privacyAcceptedAt || "",
          privacyVersion: input.privacyVersion || "",
          legalAccepted: input.legalAccepted || false,
          legalAcceptedAt: input.legalAcceptedAt || "",
          legalVersion: input.legalVersion || "",
          appLanguageAtConsent: input.appLanguageAtConsent || "",
          consentSource: input.consentSource || "unspecified"
         };
        await setDoc(docRef, profileData);
      } catch (firestoreError: any) {
        console.error("Firebase registration profiles/{uid} write failed:", {
          code: firestoreError.code,
          message: firestoreError.message
        });
      }
      
      return credential.user;
    }
  },

  async forgotPassword(email: string): Promise<void> {
    if (isMockMode) {
      const accounts = getMockCollection<any[]>('badal_mock_accounts');
      const found = accounts.some(acc => acc.email.toLowerCase().trim() === email.toLowerCase().trim());
      if (!found) {
        throw new Error('البريد الإلكتروني للأسف غير مسجل');
      }
      return; // Mock reset link sent successfully
    } else {
      await sendPasswordResetEmail(auth, email);
    }
  },

  async logout(): Promise<void> {
    if (isMockMode) {
      setMemoryItem(CURRENT_MOCK_USER_ID_KEY, '');
      window.dispatchEvent(new Event('badal_auth_change'));
    } else {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(err => console.warn("Failed to clear session cookie:", err));
      await signOut(auth);
    }
  },

  async recoverMissingProfile(firebaseUser: any): Promise<Profile> {
    const uid = firebaseUser.uid;
    const userRef = doc(db, 'users', uid);
    const profileRef = doc(db, 'profiles', uid);

    console.log(`[Profile Recovery] Restoring user documents for UID: ${uid}`);

    try {
      const uSnap = await getDoc(userRef);
      if (!uSnap.exists()) {
        await setDoc(userRef, {
          uid: uid,
          displayName: firebaseUser.displayName || 'مستعمل بَدِل',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
          provider: firebaseUser.providerData?.[0]?.providerId || 'password',
          role: 'user',
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });
        console.log(`[Profile Recovery] Created users/${uid}`);
      }
    } catch (err) {
      console.warn("[Profile Recovery] Error recovering users record:", err);
    }

    let profileData: Profile;
    try {
      const pSnap = await getDoc(profileRef);
      if (!pSnap.exists()) {
        const nextCode = await this.generateNextUserCode();
        profileData = {
          id: uid,
          display_name: firebaseUser.displayName || 'مستعمل بَدِل',
          username: nextCode,
          country: 'الأردن',
          governorate: '',
          city: '',
          profile_image_url: firebaseUser.photoURL || '',
          average_rating: 5.0,
          ratings_count: 0,
          active_listings_count: 0,
          completed_exchanges_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await setDoc(profileRef, profileData);
        console.log(`[Profile Recovery] Created profiles/${uid} with username code ${nextCode}`);
      } else {
        profileData = pSnap.data() as Profile;
      }
      return profileData;
    } catch (err) {
      console.warn("[Profile Recovery] Error recovering profiles record:", err);
      const nextCode = await this.generateNextUserCode();
      return {
        id: uid,
        display_name: firebaseUser.displayName || 'مستعمل بَدِل',
        username: nextCode,
        country: 'الأردن',
        governorate: '',
        city: '',
        profile_image_url: firebaseUser.photoURL || '',
        average_rating: 5.0,
        ratings_count: 0,
        active_listings_count: 0,
        completed_exchanges_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  },

  onAuthStateChanged(callback: (user: any | null) => void): () => void {
    if (isMockMode) {
      const runCheck = async () => {
        await storageReady();
        const uid = getMemoryItem(CURRENT_MOCK_USER_ID_KEY, '');
        if (uid) {
          try {
            const profile = await this.getUserProfile(uid);
            callback(profile ? { ...profile, uid: profile.id } : null);
          } catch (e) {
            callback(null);
          }
        } else {
          callback(null);
        }
      };
      
      const listener = () => {
        runCheck();
      };
      
      window.addEventListener('badal_auth_change', listener);
      runCheck();
      
      return () => {
        window.removeEventListener('badal_auth_change', listener);
      };
    } else {
      const fbUnsub = auth.onAuthStateChanged(async (firebaseUser: any) => {
        if (firebaseUser) {
          try {
            const idToken = await firebaseUser.getIdToken();
            await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken })
            }).catch(err => console.warn("Failed to sync session cookie on auth change:", err));

            const uid = firebaseUser.uid;
            let profile = await this.getUserProfile(uid);
            
            if (!profile) {
              profile = await this.recoverMissingProfile(firebaseUser);
            }

            // Sync user details on auth change
            const userRef = doc(db, 'users', uid);
            await setDoc(userRef, {
              uid: uid,
              displayName: firebaseUser.displayName || profile?.display_name || 'مستعمل بَدِل',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || profile?.profile_image_url || '',
              provider: firebaseUser.providerData?.[0]?.providerId || 'password',
              lastLoginAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }, { merge: true }).catch((err: any) => console.warn("Failed syncing users document status on auth change:", err));

            callback(profile ? { ...profile, uid: uid, email: firebaseUser.email } : { uid: uid, email: firebaseUser.email });
          } catch (e) {
            console.error("Auth status listener callback sync failed:", e);
            callback({ uid: firebaseUser.uid, email: firebaseUser.email });
          }
        } else {
          callback(null);
        }
      });

      return fbUnsub;
    }
  },

  async getFavorites(): Promise<string[]> {
    const uid = await this.getCurrentUserId();
    if (isMockMode) {
      const favorites = getMockCollection<Favorite[]>(MOCK_FAVORITES_KEY).filter(f => f.user_id === uid);
      return favorites.map(f => f.listing_id);
    }
    try {
      const q = query(collection(db, 'favorites'), where('user_id', '==', uid));
      const snap = await getDocs(q);
      return snap.docs.map(d => (d.data() as Favorite).listing_id);
    } catch (e) {
      return [];
    }
  },

  async getCurrentUserProfile(): Promise<Profile | null> {
    const uid = await this.getCurrentUserId();
    return this.getUserProfile(uid);
  },

  async getUserProfile(userId: string): Promise<Profile | null> {
    if (isMockMode) {
      const profiles = getMockCollection<Record<string, Profile>>(MOCK_PROFILES_KEY);
      let profile = profiles[userId];
      if (!profile) {
        const nextCode = await this.generateNextUserCode();
        profile = {
          id: userId,
          display_name: "مستخدم بَدِل",
          username: nextCode,
          average_rating: 5.0,
          ratings_count: 0,
          active_listings_count: 0,
          completed_exchanges_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        profiles[userId] = profile;
        writeMockCollection(MOCK_PROFILES_KEY, profiles);
      }

      // Add dynamic computation for mock mode ratings as well to ensure perfect sync
      try {
        const ratingsList = getMockCollection<UserRating[]>(MOCK_RATINGS_KEY);
        const targetRatings = ratingsList.filter(r => r.reviewed_user_id === userId);
        if (targetRatings.length > 0) {
          const totalS = targetRatings.reduce((sum, r) => sum + r.rating_value, 0);
          profile.average_rating = Number((totalS / targetRatings.length).toFixed(1));
          profile.ratings_count = targetRatings.length;
        } else {
          if (profile.average_rating === undefined) {
            profile.average_rating = 5.0;
          }
          if (profile.ratings_count === undefined) {
            profile.ratings_count = 0;
          }
        }
        profiles[userId] = profile;
        writeMockCollection(MOCK_PROFILES_KEY, profiles);
      } catch (calcE) {
        console.warn("Failed to dynamically compute mock ratings:", calcE);
      }

      if (!profile.username || !/^k:\d{6}$/.test(profile.username)) {
        const nextCode = await this.generateNextUserCode();
        profile.username = nextCode;
        profiles[userId] = profile;
        writeMockCollection(MOCK_PROFILES_KEY, profiles);
      }
      return profile;
    }

    try {
      const docRef = doc(db, 'profiles', userId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const profile = snapshot.data() as Profile;
        const currentUid = await this.getCurrentUserId();
        const currentEmail = await this.getCurrentUserEmail();

        // Check if user is vegro09@gmail.com or baddil.support@gmail.com
        const isVerifiedAdmin = (currentUid === userId && (currentEmail.toLowerCase().trim() === 'vegro09@gmail.com' || currentEmail.toLowerCase().trim() === 'baddil.support@gmail.com')) ||
                                (profile.email_visible && (profile.email_visible.toLowerCase().trim() === 'vegro09@gmail.com' || profile.email_visible.toLowerCase().trim() === 'baddil.support@gmail.com'));

        if (isVerifiedAdmin && profile.role !== 'super_admin' && profile.role !== 'admin') {
          profile.role = 'super_admin';
          try {
            await setDoc(docRef, { role: 'super_admin', status: 'active' }, { merge: true });
          } catch (e) {
            console.warn("Failed to set admin role in Firestore:", e);
          }
        }

        if (profile && currentUid === userId && (!profile.username || !/^k:\d{6}$/.test(profile.username))) {
          const nextCode = await this.generateNextUserCode();
          profile.username = nextCode;
          await setDoc(docRef, { username: nextCode }, { merge: true });
        }

        // Dynamically compute authentic ratings from the `user_ratings` collection
        try {
          const q = query(collection(db, 'user_ratings'), where('reviewed_user_id', '==', userId));
          const ratingsSnap = await getDocs(q);
          const ratings = ratingsSnap.docs.map(d => d.data() as UserRating);
          let updatedAvg = 5.0;
          let updatedCount = 0;
          if (ratings.length > 0) {
            const totalS = ratings.reduce((sum, r) => sum + r.rating_value, 0);
            updatedAvg = Number((totalS / ratings.length).toFixed(1));
            updatedCount = ratings.length;
          } else {
            updatedAvg = profile.average_rating !== undefined ? profile.average_rating : 5.0;
            updatedCount = profile.ratings_count !== undefined ? profile.ratings_count : 0;
          }

          profile.average_rating = updatedAvg;
          profile.ratings_count = updatedCount;

          // Save back the updated stats to the main profile document in Firestore so that other queries reflect the live calculations
          await setDoc(docRef, {
            average_rating: updatedAvg,
            ratings_count: updatedCount
          }, { merge: true });
        } catch (calcE) {
          console.warn("Failed to dynamically compute ratings:", calcE);
          if (profile.average_rating === undefined) profile.average_rating = 5.0;
          if (profile.ratings_count === undefined) profile.ratings_count = 0;
        }

        return profile;
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `profiles/${userId}`);
      return null;
    }
  },

  async updateOrCreateProfile(profile: Partial<Profile>): Promise<void> {
    const uid = await this.getCurrentUserId();
    const nowStr = new Date().toISOString();

    if (isMockMode) {
      const profiles = getMockCollection<Record<string, Profile>>(MOCK_PROFILES_KEY);
      let existing = profiles[uid];
      if (!existing) {
        const nextCode = await this.generateNextUserCode();
        existing = {
          id: uid,
          display_name: "مستكشف بَدِل",
          username: nextCode,
          average_rating: 5.0,
          ratings_count: 1,
          active_listings_count: 0,
          completed_exchanges_count: 0,
          created_at: nowStr,
          updated_at: nowStr
        };
      } else if (!existing.username || !/^k:\d{6}$/.test(existing.username)) {
        const nextCode = await this.generateNextUserCode();
        existing.username = nextCode;
      }

      const updated: Profile = {
        ...existing,
        ...profile,
        id: uid,
        updated_at: nowStr
      };

      profiles[uid] = updated;
      writeMockCollection(MOCK_PROFILES_KEY, profiles);
      window.dispatchEvent(new Event('badal_auth_change'));
      return;
    }

    try {
      const docRef = doc(db, 'profiles', uid);
      const snap = await getDoc(docRef);
      
      let nextCode = '';
      if (!snap.exists()) {
        nextCode = await this.generateNextUserCode();
      } else {
        const existingData = snap.data() as Profile;
        if (!existingData.username || !/^k:\d{6}$/.test(existingData.username)) {
          nextCode = await this.generateNextUserCode();
        }
      }

      const profileData: any = {
        ...profile,
        id: uid,
        updated_at: nowStr
      };

      if (nextCode) {
        profileData.username = nextCode;
      }

      if (!snap.exists()) {
        profileData.created_at = nowStr;
        profileData.average_rating = 5.0;
        profileData.ratings_count = 0;
        profileData.active_listings_count = 0;
        profileData.completed_exchanges_count = 0;
      }
      await setDoc(docRef, profileData, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `profiles/${uid}`);
    }
  },

  async uploadProfileImage(file: File): Promise<string> {
    const uid = await this.getCurrentUserId();
    
    // Auto-optimize to WebP client-side
    let optimizedBase64 = '';
    let optimizedBlob: Blob | null = null;
    try {
      const opt = await compressImageToWebP(file, 0.6, 300, 300); // 300x300 is plenty for avatar
      optimizedBase64 = opt.base64;
      optimizedBlob = opt.blob;
      console.log(`[BADDIL Avatar Optimizer] WebP Size: ${opt.sizeInKb.toFixed(1)} KB (Target: <500KB)`);
    } catch (err) {
      console.warn("[BADDIL Avatar Optimizer] WebP conversion failed, using original", err);
    }

    const getBase64 = (f: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('خطأ أثناء معالجة ملف الصورة المرفوعة'));
          }
        };
        reader.onerror = () => {
          reject(new Error('فشلت قراءة ملف الصورة'));
        };
        reader.readAsDataURL(f);
      });
    };

    if (isMockMode) {
      return optimizedBase64 || getBase64(file);
    }

    try {
      // Save as avatar.webp instead of avatar.jpg
      const storageRef = ref(storage, `profiles/${uid}/avatar.webp`);
      const uploadPromise = (async () => {
        const dataToUpload = optimizedBlob || file;
        const snapshot = await uploadBytes(storageRef, dataToUpload);
        return await getDownloadURL(snapshot.ref);
      })();

      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 3500);
      });

      return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (e: any) {
      console.warn("Firebase storage avatar upload failed or timed out. Falling back to WebP Base64 representation:", e);
      if (optimizedBase64) return optimizedBase64;
      try {
        return await getBase64(file);
      } catch (err) {
        throw new Error(`خطأ أثناء معالجة الصورة: ${e.message || String(e)}`);
      }
    }
  },

  async uploadChatFile(chatId: string, file: File): Promise<string> {
    const safeChatId = normalizeId(chatId);
    if (!safeChatId || safeChatId === '[object Object]') return '';

    const isImage = file.type.startsWith('image/');
    let optimizedBase64 = '';
    let optimizedBlob: Blob | null = null;

    if (isImage) {
      try {
        const opt = await compressImageToWebP(file, 0.6, 800, 800);
        optimizedBase64 = opt.base64;
        optimizedBlob = opt.blob;
        console.log(`[BADDIL Chat Image Optimizer] WebP Size: ${opt.sizeInKb.toFixed(1)} KB (Target: <500KB)`);
      } catch (err) {
        console.warn("[BADDIL Chat Image Optimizer] Compression failed, using original", err);
      }
    }

    const getBase64 = (f: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(f);
      });
    };

    if (isMockMode) {
      if (isImage && optimizedBase64) {
        return optimizedBase64;
      }
      if (file.size > 1.5 * 1024 * 1024) {
        return URL.createObjectURL(file);
      }
      return getBase64(file);
    }

    try {
      const fileId = generateId();
      // If it's an image, replace extension with webp
      const fileName = isImage ? `${file.name.substring(0, file.name.lastIndexOf('.')) || file.name}.webp` : file.name;
      const storageRef = ref(storage, `chats/${chatId}/${fileId}-${fileName}`);
      const uploadPromise = (async () => {
        const dataToUpload = optimizedBlob || file;
        const snapshot = await uploadBytes(storageRef, dataToUpload);
        return await getDownloadURL(snapshot.ref);
      })();

      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 3500);
      });

      return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (e: any) {
      console.warn("Firebase storage chat file upload failed or timed out. Falling back to representation:", e);
      try {
        if (isImage && optimizedBase64) {
          return optimizedBase64;
        }
        if (file.size > 1.5 * 1024 * 1024) {
          return URL.createObjectURL(file);
        }
        return await getBase64(file);
      } catch (err) {
        throw new Error(`خطأ أثناء رفع الملف لنظام التخزين: ${e.message || String(e)}`);
      }
    }
  },

  async deleteProfileImage(): Promise<void> {
    const uid = await this.getCurrentUserId();
    if (isMockMode) {
      const profiles = getMockCollection<Record<string, Profile>>(MOCK_PROFILES_KEY);
      if (profiles[uid]) {
        profiles[uid].profile_image_url = '';
        writeMockCollection(MOCK_PROFILES_KEY, profiles);
        window.dispatchEvent(new Event('badal_auth_change'));
      }
      return;
    }

    try {
      const storageRef = ref(storage, `profiles/${uid}/avatar.jpg`);
      await deleteObject(storageRef).catch(() => {
        // Safe skip if file wasn't actual
      });
      const docRef = doc(db, 'profiles', uid);
      await updateDoc(docRef, { profile_image_url: '' });
    } catch (e: any) {
      console.error("Error deleting avatar", e);
    }
  },

  // --------- LISTING SERVICE ---------
  async createListing(listingData: Omit<Listing, 'id' | 'owner_id' | 'created_at' | 'updated_at' | 'status' | 'is_active' | 'is_boosted'>): Promise<string> {
    const uid = await this.getCurrentUserId();
    const lId = generateId();
    const nowStr = new Date().toISOString();

    const fullListing: Listing = {
      ...listingData,
      id: lId,
      owner_id: uid,
      status: 'active',
      is_active: true,
      is_boosted: false,
      created_at: nowStr,
      updated_at: nowStr
    };

    if (isMockMode) {
      const listings = getMockCollection<Listing[]>(MOCK_LISTINGS_KEY);
      listings.unshift(fullListing);
      writeMockCollection(MOCK_LISTINGS_KEY, listings);

      // Increase user profile active listing count
      const profiles = getMockCollection<Record<string, Profile>>(MOCK_PROFILES_KEY);
      if (profiles[uid]) {
        profiles[uid].active_listings_count = (profiles[uid].active_listings_count || 0) + 1;
        writeMockCollection(MOCK_PROFILES_KEY, profiles);
      }
      return lId;
    }

    try {
      const docRef = doc(db, 'listings', lId);
      await setDoc(docRef, fullListing);
      // Let's also increment key in profile (client-side update for display fallback, done simply on save)
      try {
        const pRef = doc(db, 'profiles', uid);
        const pSnap = await getDoc(pRef);
        if (pSnap.exists()) {
          const currentCount = pSnap.data().active_listings_count || 0;
          await updateDoc(pRef, { active_listings_count: currentCount + 1 });
        }
      } catch (innerE) {}
      return lId;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `listings/${lId}`);
      return '';
    }
  },

  async updateListing(listingId: string, listingData: Partial<Listing>): Promise<void> {
    const nowStr = new Date().toISOString();

    if (isMockMode) {
      const listings = getMockCollection<Listing[]>(MOCK_LISTINGS_KEY);
      const idx = listings.findIndex(l => l.id === listingId);
      if (idx !== -1) {
        listings[idx] = {
          ...listings[idx],
          ...listingData,
          updated_at: nowStr
        };
        writeMockCollection(MOCK_LISTINGS_KEY, listings);
      }
      return;
    }

    try {
      const docRef = doc(db, 'listings', listingId);
      await updateDoc(docRef, {
        ...listingData,
        updated_at: nowStr
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `listings/${listingId}`);
    }
  },

  async getListingDetails(listingId: string): Promise<Listing | null> {
    if (isMockMode) {
      const listings = getMockCollection<Listing[]>(MOCK_LISTINGS_KEY);
      return listings.find(l => l.id === listingId) || null;
    }

    try {
      const docRef = doc(db, 'listings', listingId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return snapshot.data() as Listing;
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `listings/${listingId}`);
      return null;
    }
  },

  async getListings(filters?: {
    category?: string;
    condition?: string;
    country?: string;
    governorate?: string;
    city?: string;
    searchTerm?: string;
    ownerId?: string;
    limitCount?: number;
    lastVisibleId?: string;
  }): Promise<Listing[]> {
    if (isMockMode) {
      let listings = getMockCollection<Listing[]>(MOCK_LISTINGS_KEY);
 
      // Filter active or current user's listing (if filtering by ownerId, include inactive, otherwise only active)
      if (filters?.ownerId) {
        listings = listings.filter(l => l.owner_id === filters.ownerId);
      } else {
        listings = listings.filter(l => l.status === 'active' && l.is_active);
      }
 
      if (filters?.category && filters.category !== 'الكل' && filters.category !== 'all') {
        listings = listings.filter(l => l.category === filters.category);
      }
 
      if (filters?.condition) {
        listings = listings.filter(l => l.condition === filters.condition);
      }
 
      if (filters?.country) {
        listings = listings.filter(l => l.country === filters.country);
      }
 
      if (filters?.governorate) {
        listings = listings.filter(l => l.governorate === filters.governorate);
      }
 
      if (filters?.city) {
        listings = listings.filter(l => l.city === filters.city);
      }
 
      if (filters?.searchTerm) {
        const queryTerm = filters.searchTerm.toLowerCase();
        listings = listings.filter(l => 
          l.title.toLowerCase().includes(queryTerm) || 
          l.description.toLowerCase().includes(queryTerm) ||
          (l.desired_exchange && l.desired_exchange.toLowerCase().includes(queryTerm))
        );
      }
 
      // Sort Boosted listings first, then by date desc
      const sortedListings = listings.sort((a, b) => {
        const aBoost = isListingBoosted(a) ? 1 : 0;
        const bBoost = isListingBoosted(b) ? 1 : 0;
        if (aBoost !== bBoost) {
          return bBoost - aBoost;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      let paginated = sortedListings;
      if (filters?.lastVisibleId) {
        const startIndex = paginated.findIndex(l => l.id === filters.lastVisibleId);
        if (startIndex !== -1) {
          paginated = paginated.slice(startIndex + 1);
        }
      }
      if (filters?.limitCount) {
        paginated = paginated.slice(0, filters.limitCount);
      }
      return paginated;
    }
 
    try {
      return await dbCircuitBreaker.execute(async () => {
        let q = collection(db, 'listings');
        // Due to indexes limitations in standard Firestore, let's fetch active and perform robust filtering client-side or simple queries
        const queryConstraints: any[] = [where('is_active', '==', true)];
        
        if (filters?.ownerId) {
          // If ownerId filter is present, we bypass the active check to show draft/exchanged items too
          queryConstraints.splice(0, 1); // remove active check
          queryConstraints.push(where('owner_id', '==', filters.ownerId));
        }
 
        const qResult = query(q, ...queryConstraints);
        const snap = await getDocs(qResult);
        let listings = snap.docs.map(d => d.data() as Listing);
 
        // Perform filters
        if (filters?.ownerId === undefined) {
          listings = listings.filter(l => l.status === 'active');
        }
 
        if (filters?.category && filters.category !== 'الكل' && filters.category !== 'all') {
          listings = listings.filter(l => l.category === filters.category);
        }
 
        if (filters?.condition) {
          listings = listings.filter(l => l.condition === filters.condition);
        }
 
        if (filters?.country) {
          listings = listings.filter(l => l.country === filters.country);
        }
 
        if (filters?.governorate) {
          listings = listings.filter(l => l.governorate === filters.governorate);
        }
 
        if (filters?.city) {
          listings = listings.filter(l => l.city === filters.city);
        }
 
        if (filters?.searchTerm) {
          const queryTerm = filters.searchTerm.toLowerCase();
          listings = listings.filter(l => 
            l.title.toLowerCase().includes(queryTerm) || 
            l.description.toLowerCase().includes(queryTerm) ||
            (l.desired_exchange && l.desired_exchange.toLowerCase().includes(queryTerm))
          );
        }
 
        // Boosted first
        const sorted = listings.sort((a, b) => {
          const aBoost = isListingBoosted(a) ? 1 : 0;
          const bBoost = isListingBoosted(b) ? 1 : 0;
          if (aBoost !== bBoost) {
            return bBoost - aBoost;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        let paginated = sorted;
        if (filters?.lastVisibleId) {
          const startIndex = paginated.findIndex(l => l.id === filters.lastVisibleId);
          if (startIndex !== -1) {
            paginated = paginated.slice(startIndex + 1);
          }
        }
        if (filters?.limitCount) {
          paginated = paginated.slice(0, filters.limitCount);
        }
        return paginated;
      }, () => {
        console.warn("Circuit Breaker triggered for getListings! Serving fallback empty list.");
        return [];
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'listings');
      return [];
    }
  },

  async deleteOrDeactivateListing(listingId: string): Promise<void> {
    const uid = await this.getCurrentUserId();

    if (isMockMode) {
      const listings = getMockCollection<Listing[]>(MOCK_LISTINGS_KEY);
      const idx = listings.findIndex(l => l.id === listingId);
      if (idx !== -1) {
        listings.splice(idx, 1);
        writeMockCollection(MOCK_LISTINGS_KEY, listings);

        // Decrease active listings
        const profiles = getMockCollection<Record<string, Profile>>(MOCK_PROFILES_KEY);
        if (profiles[uid] && profiles[uid].active_listings_count > 0) {
          profiles[uid].active_listings_count -= 1;
          writeMockCollection(MOCK_PROFILES_KEY, profiles);
        }
      }
      return;
    }

    try {
      await deleteDoc(doc(db, 'listings', listingId));
      try {
        const pRef = doc(db, 'profiles', uid);
        const pSnap = await getDoc(pRef);
        if (pSnap.exists()) {
          const currentCount = pSnap.data().active_listings_count || 1;
          await updateDoc(pRef, { active_listings_count: Math.max(0, currentCount - 1) });
        }
      } catch (innerE) {}
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `listings/${listingId}`);
    }
  },

  // --------- FAVORITES SERVICE ---------
  async toggleFavorite(listingId: string): Promise<boolean> {
    const uid = await this.getCurrentUserId();
    const favId = `${uid}_${listingId}`;

    if (isMockMode) {
      const favorites = getMockCollection<Favorite[]>(MOCK_FAVORITES_KEY);
      const existingIdx = favorites.findIndex(f => f.listing_id === listingId && f.user_id === uid);
      if (existingIdx !== -1) {
        favorites.splice(existingIdx, 1);
        writeMockCollection(MOCK_FAVORITES_KEY, favorites);
        return false; // Removed
      } else {
        favorites.push({
          id: favId,
          user_id: uid,
          listing_id: listingId,
          created_at: new Date().toISOString()
        });
        writeMockCollection(MOCK_FAVORITES_KEY, favorites);
        return true; // Added
      }
    }

    try {
      const docRef = doc(db, 'favorites', favId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await deleteDoc(docRef);
        return false;
      } else {
        await setDoc(docRef, {
          id: favId,
          user_id: uid,
          listing_id: listingId,
          created_at: new Date().toISOString()
        });
        return true;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `favorites/${favId}`);
      return false;
    }
  },

  async isFavorited(listingId: string): Promise<boolean> {
    const uid = await this.getCurrentUserId();
    if (isMockMode) {
      const favorites = getMockCollection<Favorite[]>(MOCK_FAVORITES_KEY);
      return favorites.some(f => f.listing_id === listingId && f.user_id === uid);
    }

    try {
      const favId = `${uid}_${listingId}`;
      const docRef = doc(db, 'favorites', favId);
      const snap = await getDoc(docRef);
      return snap.exists();
    } catch (e) {
      return false;
    }
  },

  async getFavoriteListings(): Promise<Listing[]> {
    const uid = await this.getCurrentUserId();

    if (isMockMode) {
      const favorites = getMockCollection<Favorite[]>(MOCK_FAVORITES_KEY).filter(f => f.user_id === uid);
      const listings = getMockCollection<Listing[]>(MOCK_LISTINGS_KEY);
      return listings.filter(l => favorites.some(f => f.listing_id === l.id && l.status === 'active'));
    }

    try {
      const q = query(collection(db, 'favorites'), where('user_id', '==', uid));
      const snap = await getDocs(q);
      const listingIds = snap.docs.map(d => (d.data() as Favorite).listing_id);
      
      if (listingIds.length === 0) return [];

      const listingsSnap = await getDocs(collection(db, 'listings'));
      return listingsSnap.docs
        .map(d => d.data() as Listing)
        .filter(l => listingIds.includes(l.id) && l.is_active && l.status === 'active');
    } catch (e) {
      return [];
    }
  },

  // --------- REALTIME CHAT SERVICE ---------
  async startOrGetChat(listingId: string, participantTwoId: string, customListingTitle?: string): Promise<string> {
    const uid = await this.getCurrentUserId();
    if (uid === participantTwoId) {
      throw new Error("Cannot start a conversation with yourself");
    }
    const sortedIds = [uid, participantTwoId].sort();
    const chatId = `conv_${listingId}_${sortedIds[0]}_${sortedIds[1]}`;

    if (isMockMode) {
      const chats = getMockCollection<Chat[]>(MOCK_CHATS_KEY);
      const existing = chats.find(c => c.id === chatId);
      if (existing) {
        return chatId;
      }

      const newChat: Chat = {
        id: chatId,
        listing_id: listingId,
        participant_one_id: sortedIds[0],
        participant_two_id: sortedIds[1],
        last_message: "بداية المحادثة",
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participantIds: sortedIds,
        participantInfo: {
          [sortedIds[0]]: { display_name: "مستخدم بَدِل", username: "user1" },
          [sortedIds[1]]: { display_name: "مستكشف بَدِل", username: "user2" }
        },
        listingTitle: customListingTitle || "إعلان تبادل بَدِل",
        listingImage: ""
      };

      chats.push(newChat);
      writeMockCollection(MOCK_CHATS_KEY, chats);

      // Send greeting system message
      await this.sendMessage(chatId, "بدأ المحادثة بخصوص الإعلان", 'system_message');
      return chatId;
    }

    try {
      // 1. Query conversations where the current user is a participant
      const q = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', uid)
      );
      const snaps = await getDocs(q);
      const matchingChats = snaps.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(c => c.listingId === listingId && c.participantIds && c.participantIds.includes(participantTwoId));

      if (matchingChats.length > 0) {
        // Sort by oldest valid conversation
        matchingChats.sort((a, b) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tA - tB;
        });

        if (matchingChats.length > 1) {
          console.warn("Duplicate conversation data issue detected for listing:", listingId, matchingChats);
        }
        return matchingChats[0].id;
      }

      // 2. Double-check deterministic ID directly as a fallback to prevent race conditions
      const chatRef = doc(db, 'conversations', chatId);
      const snap = await getDoc(chatRef);
      if (snap.exists()) {
        return chatId;
      }

      // Fetch Profile Details & Listing Details for Info population
      const [u1, u2, listingDetails] = await Promise.all([
        this.getUserProfile(uid),
        this.getUserProfile(participantTwoId),
        this.getListingDetails(listingId)
      ]);

      const participantInfo = {
        [uid]: {
          display_name: u1?.display_name || "مستخدم بَدِل",
          profile_image_url: u1?.profile_image_url || "",
          username: u1?.username || ""
        },
        [participantTwoId]: {
          display_name: u2?.display_name || "مستكشف بَدِل",
          profile_image_url: u2?.profile_image_url || "",
          username: u2?.username || ""
        }
      };

      const listingTitle = customListingTitle || listingDetails?.title || "";
      const listingImage = listingDetails?.images?.[0] || "";

      await setDoc(chatRef, {
        id: chatId,
        participantIds: sortedIds,
        participantInfo,
        listingId,
        listingOwnerId: participantTwoId,
        createdBy: uid,
        listingTitle,
        listingImage,
        lastMessage: "بداية المحادثة",
        lastMessageType: "system_message",
        lastMessageSenderId: uid,
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadCounts: {
          [uid]: 0,
          [participantTwoId]: 0
        },

        // Compatibility properties
        listing_id: listingId,
        participant_one_id: sortedIds[0],
        participant_two_id: sortedIds[1],
        last_message: "بداية المحادثة",
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      await this.sendMessage(chatId, "بدأت المحادثة بخصوص هذا التبادل", 'system_message');
      return chatId;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `conversations/${chatId}`);
      return '';
    }
  },

  async sendMessage(chatIdInput: any, content: string, type: MessageType = 'text', additionalFields?: Partial<Message>): Promise<string> {
    const chatId = normalizeId(chatIdInput);
    if (!chatId || chatId === '[object Object]') return '';
    const uid = await this.getCurrentUserId();
    const mId = generateId();
    const nowStr = new Date().toISOString();

    // Determine receiverId
    let receiverId = "";
    if (isMockMode) {
      const chats = getMockCollection<Chat[]>(MOCK_CHATS_KEY);
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        receiverId = chat.participant_one_id === uid ? chat.participant_two_id : chat.participant_one_id;
      }
    } else {
      try {
        const convSnap = await getDoc(doc(db, 'conversations', chatId));
        if (convSnap.exists()) {
          const pIds = convSnap.data().participantIds as string[];
          receiverId = pIds.find(id => id !== uid) || "";
        }
      } catch (err) {
        console.error("Failed to query receiver ID", err);
      }
    }

    const messageDocData = {
      id: mId,
      conversationId: chatId,
      senderId: uid,
      receiverId: receiverId,
      type: type,
      text: content,
      createdAt: isMockMode ? nowStr : serverTimestamp(),
      updatedAt: isMockMode ? nowStr : serverTimestamp(),
      deliveredAt: null,
      readAt: null,
      status: "sending",
      deletedForEveryone: false,
      edited: false,

      // Compatibility properties
      chat_id: chatId,
      sender_id: uid,
      message_type: type,
      text_content: content,
      media_url: additionalFields?.media_url || "",
      thumbnail_url: additionalFields?.thumbnail_url || "",
      audio_url: additionalFields?.audio_url || "",
      audio_duration: additionalFields?.audio_duration || 0,
      latitude: additionalFields?.latitude || 0,
      longitude: additionalFields?.longitude || 0,
      listing_id: additionalFields?.listing_id || "",
      exchange_id: additionalFields?.exchange_id || "",
      metadata: additionalFields?.metadata || {},
      delivery_status: 'sending',
      created_at: nowStr
    };

    if (isMockMode) {
      // Add message
      const messages = getMockCollection<Message[]>(MOCK_MESSAGES_KEY);
      const readyMsg = { ...messageDocData, status: 'sent', delivery_status: 'sent' };
      messages.push(readyMsg as any);
      writeMockCollection(MOCK_MESSAGES_KEY, messages);

      // Update chat
      const chats = getMockCollection<Chat[]>(MOCK_CHATS_KEY);
      const idx = chats.findIndex(c => c.id === chatId);
      if (idx !== -1) {
        chats[idx].last_message = type === 'text' ? content : `[مرفق: ${this.translateMessageType(type)}]`;
        chats[idx].last_message_at = nowStr;
        chats[idx].updated_at = nowStr;
        writeMockCollection(MOCK_CHATS_KEY, chats);
      }

      window.dispatchEvent(new Event('badal_new_message'));
      return mId;
    }

    try {
      const msgRef = doc(db, 'conversations', chatId, 'messages', mId);
      messageDocData.status = "sent";
      messageDocData.delivery_status = "sent";
      await setDoc(msgRef, messageDocData);

      const convRef = doc(db, 'conversations', chatId);
      const lastMsgPreview = type === 'text' ? content : `[مرفق: ${this.translateMessageType(type)}]`;
      
      const updatePayload: any = {
        lastMessage: lastMsgPreview,
        lastMessageType: type,
        lastMessageSenderId: uid,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        last_message: lastMsgPreview,
        last_message_at: nowStr,
        updated_at: nowStr
      };

      if (receiverId) {
        updatePayload[`unreadCounts.${receiverId}`] = increment(1);
      }

      try {
        await updateDoc(convRef, updatePayload);
      } catch (convErr) {
        console.warn("Isolated warning: failed to update conversation parent document:", convErr);
      }

      return mId;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `conversations/${chatId}/messages/${mId}`);
      return '';
    }
  },

  async getConversationDetails(chatIdInput: any): Promise<Chat | null> {
    const chatId = normalizeId(chatIdInput);
    if (!chatId || chatId === '[object Object]') return null;
    if (isMockMode) {
      const chats = getMockCollection<Chat[]>(MOCK_CHATS_KEY);
      const matched = chats.find(c => c.id === chatId);
      return matched || null;
    }

    try {
      const chatSnap = await getDoc(doc(db, 'conversations', chatId));
      if (chatSnap.exists()) {
        const data = chatSnap.data() as any;
        const lastMsgAtStr = data.lastMessageAt?.toDate ? data.lastMessageAt.toDate().toISOString() : (data.lastMessageAt || new Date().toISOString());
        return {
          id: chatSnap.id,
          ...data,
          // Compatibility mapping
          listing_id: data.listingId || "",
          participant_one_id: data.participantIds?.[0] || "",
          participant_two_id: data.participantIds?.[1] || "",
          last_message: data.lastMessage || "",
          last_message_at: lastMsgAtStr,
          created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          updated_at: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString()
        } as Chat;
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `conversations/${chatId}`);
      return null;
    }
  },

  translateMessageType(type: MessageType): string {
    switch (type) {
      case 'image': return 'صورة';
      case 'video': return 'فيديو';
      case 'voice': return 'تسجيل صوتي';
      case 'location': return 'موقع جغرافي';
      case 'exchange_confirmation_request': return 'طلب تأكيد تبادل';
      case 'exchange_confirmation_result': return 'نتيجة تأكيد التبادل';
      case 'rating_request': return 'طلب تقييم';
      case 'system_message': return 'تنبيه نظام';
      default: return 'رسالة';
    }
  },

  subscribeToChats(callback: (chats: Chat[]) => void): () => void {
    if (isMockMode) {
      const handleStorage = () => {
        this.getCurrentUserId().then(uid => {
          const chats = getMockCollection<Chat[]>(MOCK_CHATS_KEY);
          const filtered = chats.filter(c => c.participant_one_id === uid || c.participant_two_id === uid);
          callback(filtered.sort((a, b) => new Date(b.last_message_at || "").getTime() - new Date(a.last_message_at || "").getTime()));
        });
      };
      // trigger initially
      handleStorage();
      window.addEventListener('storage', handleStorage);
      window.addEventListener('badal_new_message', handleStorage);
      window.addEventListener('badal_auth_change', handleStorage);
      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('badal_new_message', handleStorage);
        window.removeEventListener('badal_auth_change', handleStorage);
      };
    }

    // Real subscription
    let unsubscribe = () => {};
    this.getCurrentUserId().then(uid => {
      if (!uid) {
        callback([]);
        return;
      }
      const q = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', uid)
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
        const chatsList = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          const lastMsgAtStr = data.lastMessageAt?.toDate ? data.lastMessageAt.toDate().toISOString() : (data.lastMessageAt || new Date().toISOString());
          return {
            id: data.id,
            ...data,
            // Compatibility mapping
            listing_id: data.listingId || "",
            participant_one_id: data.participantIds?.[0] || "",
            participant_two_id: data.participantIds?.[1] || "",
            last_message: data.lastMessage || "",
            last_message_at: lastMsgAtStr,
            created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            updated_at: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString()
          } as Chat;
        });

        chatsList.sort((a, b) => {
          const tA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const tB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return tB - tA;
        });

        callback(chatsList);
      }, (e) => {
        console.warn("Firestore subscribeToChats warning:", e);
        callback([]);
      });
    }).catch(() => callback([]));

    return () => unsubscribe();
  },

  subscribeToMessages(
    chatIdInput: any,
    limitOrCallback: number | ((messages: Message[]) => void),
    maybeCallback?: (messages: Message[]) => void
  ): () => void {
    const chatId = normalizeId(chatIdInput);
    if (!chatId || chatId === '[object Object]') return () => {};

    let limitCount = 50;
    let callback: (messages: Message[]) => void;
    if (typeof limitOrCallback === 'number') {
      limitCount = limitOrCallback;
      callback = maybeCallback || (() => {});
    } else {
      callback = limitOrCallback;
    }

    if (isMockMode) {
      const handleStorage = () => {
        const messages = getMockCollection<Message[]>(MOCK_MESSAGES_KEY);
        const filtered = messages.filter(m => m.chat_id === chatId || m.conversationId === chatId);
        callback(filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      };
      handleStorage();
      window.addEventListener('storage', handleStorage);
      window.addEventListener('badal_new_message', handleStorage);
      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('badal_new_message', handleStorage);
      };
    }

    let currentUserId = "";
    this.getCurrentUserId().then(uid => { currentUserId = uid; });

    const msgCollection = collection(db, 'conversations', chatId, 'messages');
    const q = query(msgCollection, orderBy('createdAt', 'desc'), limit(limitCount));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Mark as delivered for incoming messages
      const unseenSentMsgs = snapshot.docs.filter(d => {
        const m = d.data();
        return currentUserId && m.senderId !== currentUserId && m.status === 'sent';
      });
      if (unseenSentMsgs.length > 0) {
        try {
          const CHUNK_SIZE = 400;
          for (let i = 0; i < unseenSentMsgs.length; i += CHUNK_SIZE) {
            const chunk = unseenSentMsgs.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach(d => {
              batch.update(d.ref, { status: 'delivered', deliveredAt: serverTimestamp() });
            });
            batch.commit().catch(err => {
              console.error("Batch delivery update commit fail:", err);
            });
          }
        } catch (err) {
          console.error("Delivery status batch setup fail:", err);
        }
      }

      const msgList = snapshot.docs.map(d => {
        const data = d.data() as any;
        const createdAtStr = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString());
        return {
          id: data.id,
          ...data,
          // Compatibility properties
          chat_id: data.conversationId,
          sender_id: data.senderId,
          message_type: data.type,
          text_content: data.text,
          created_at: createdAtStr
        } as Message;
      });
      msgList.reverse();
      callback(msgList);
    }, (e) => {
      console.warn(`subscribeToMessages warning for ${chatId}:`, e);
      callback([]);
    });

    return unsubscribe;
  },

  async resetUnreadCount(conversationIdInput: any, userId: string): Promise<void> {
    const conversationId = normalizeId(conversationIdInput);
    if (!conversationId || conversationId === '[object Object]') return;
    if (isMockMode) return;
    try {
      const docRef = doc(db, 'conversations', conversationId);
      await updateDoc(docRef, {
        [`unreadCounts.${userId}`]: 0
      });
    } catch (err) {
      console.error("Failed to reset unread count", err);
    }
  },

  async markMessagesAsRead(conversationIdInput: any, currentUserId: string): Promise<void> {
    const conversationId = normalizeId(conversationIdInput);
    if (!conversationId || conversationId === '[object Object]') return;
    if (isMockMode) {
      try {
        const messages = getMockCollection<Message[]>(MOCK_MESSAGES_KEY);
        let changed = false;
        const updated = messages.map(m => {
          if ((m.conversationId === conversationId || m.chat_id === conversationId) && m.senderId !== currentUserId && m.status !== 'read') {
            changed = true;
            return { ...m, status: 'read', readAt: new Date().toISOString() };
          }
          return m;
        });
        if (changed) {
          writeMockCollection(MOCK_MESSAGES_KEY, updated);
          window.dispatchEvent(new Event('badal_new_message'));
        }
      } catch (err) {
        console.error("Mock marking read fail", err);
      }
      return;
    }
    try {
      const msgCollection = collection(db, 'conversations', conversationId, 'messages');
      const q = query(msgCollection, where('senderId', '!=', currentUserId));
      const snaps = await getDocs(q);
      const unreadDocs = snaps.docs.filter(d => d.data().status !== 'read');

      const CHUNK_SIZE = 400;
      for (let i = 0; i < unreadDocs.length; i += CHUNK_SIZE) {
        const chunk = unreadDocs.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(d => {
          batch.update(d.ref, { status: 'read', readAt: serverTimestamp() });
        });
        await batch.commit();
      }
    } catch (e) {
      console.error("Mark messages as read error", e);
    }
  },

  // --------- HEAVILY HARDENED BOOST SERVICE ---------
  async getListingBoosts(listingId: string): Promise<ListingBoost[]> {
    if (isMockMode) {
      const boosts = getMockCollection<ListingBoost[]>(MOCK_BOOSTS_KEY);
      return boosts.filter(b => b.listing_id === listingId);
    }
    try {
      const q = query(collection(db, 'listing_boosts'), where('listing_id', '==', listingId));
      const snaps = await getDocs(q);
      return snaps.docs.map(d => d.data() as ListingBoost);
    } catch (e) {
      return [];
    }
  },

  async incrementAdWatchCount(listingId: string): Promise<{ count: number; status: 'pending' | 'active' | 'expired' }> {
    const uid = await this.getCurrentUserId();
    const nowStr = new Date().toISOString();

    if (isMockMode) {
      const boosts = getMockCollection<ListingBoost[]>(MOCK_BOOSTS_KEY);
      const listingBoosts = boosts.filter(b => b.listing_id === listingId);
      
      const activeBoosts = listingBoosts.filter(b => b.status === 'active' && b.boosted_until && new Date(b.boosted_until).getTime() > Date.now());
      if (activeBoosts.length >= 1) {
        throw new Error("هذا الإعلان مروج بالفعل حالياً. يمكنك ترويجه مجدداً بعد انتهاء الترويج الحالي (48 ساعة).");
      }

      let pendingBoost = listingBoosts.find(b => b.status === 'pending');
      if (!pendingBoost) {
        const belongsId = listingBoosts.length === 0 ? `boost_${listingId}` : `boost_${listingId}_${Date.now()}`;
        pendingBoost = {
          id: belongsId,
          listing_id: listingId,
          user_id: uid,
          ads_watched_count: 0,
          status: 'pending',
          created_at: nowStr,
          updated_at: nowStr
        };
        boosts.push(pendingBoost);
      }

      pendingBoost.ads_watched_count += 1;
      pendingBoost.updated_at = nowStr;

      let adsRequired = 3;
      const settings = getMemoryItem<any>('badal_mock_admin_settings', null);
      if (settings && settings.rewarded_ads_required) {
        adsRequired = settings.rewarded_ads_required;
      }

      if (pendingBoost.ads_watched_count >= adsRequired) {
        pendingBoost.status = 'active';
        pendingBoost.boost_started_at = nowStr;
        const expiry = new Date(Date.now() + 1000 * 60 * 60 * 48); // exactly 48 hours from activation
        pendingBoost.boosted_until = expiry.toISOString();

        const updatedActive = [...activeBoosts, pendingBoost];
        const maxExpiryTime = Math.max(...updatedActive.map(b => new Date(b.boosted_until!).getTime()));
        const maxExpiryStr = new Date(maxExpiryTime).toISOString();

        const listings = getMockCollection<Listing[]>(MOCK_LISTINGS_KEY);
        const lIdx = listings.findIndex(l => l.id === listingId);
        if (lIdx !== -1) {
          listings[lIdx].is_boosted = true;
          listings[lIdx].boosted_until = maxExpiryStr;
          writeMockCollection(MOCK_LISTINGS_KEY, listings);
        }
      }

      writeMockCollection(MOCK_BOOSTS_KEY, boosts);
      return { count: pendingBoost.ads_watched_count, status: pendingBoost.status };
    }

    try {
      const q = query(collection(db, 'listing_boosts'), where('listing_id', '==', listingId));
      const snaps = await getDocs(q);
      const existingBoosts = snaps.docs.map(d => d.data() as ListingBoost);

      const activeBoosts = existingBoosts.filter(b => b.status === 'active' && b.boosted_until && new Date(b.boosted_until).getTime() > Date.now());
      if (activeBoosts.length >= 1) {
        throw new Error("هذا الإعلان مروج بالفعل حالياً. يمكنك ترويجه مجدداً بعد انتهاء الترويج الحالي (48 ساعة).");
      }

      let pendingBoost = existingBoosts.find(b => b.status === 'pending');
      let isNew = false;

      if (!pendingBoost) {
        const belongsId = existingBoosts.length === 0 ? `boost_${listingId}` : `boost_${listingId}_${Date.now()}`;
        pendingBoost = {
          id: belongsId,
          listing_id: listingId,
          user_id: uid,
          ads_watched_count: 0,
          status: 'pending',
          created_at: nowStr,
          updated_at: nowStr
        };
        isNew = true;
      }

      const count = (pendingBoost.ads_watched_count || 0) + 1;
      pendingBoost.ads_watched_count = count;
      pendingBoost.updated_at = nowStr;

      let status: 'pending' | 'active' | 'expired' = 'pending';

      let adsRequired = 3;
      try {
        const sSnap = await getDoc(doc(db, 'admin_settings', 'global_config'));
        if (sSnap.exists()) {
          const sData = sSnap.data();
          if (sData && sData.rewarded_ads_required) adsRequired = sData.rewarded_ads_required;
        }
      } catch (e) {}

      if (count >= adsRequired) {
        status = 'active';
        pendingBoost.status = 'active';
        pendingBoost.boost_started_at = nowStr;
        const expiry = new Date(Date.now() + 1000 * 60 * 60 * 48); // exactly 48 hours
        pendingBoost.boosted_until = expiry.toISOString();

        const updatedActive = [...activeBoosts, pendingBoost];
        const maxExpiryTime = Math.max(...updatedActive.map(b => new Date(b.boosted_until!).getTime()));
        const maxExpiryStr = new Date(maxExpiryTime).toISOString();

        // Sync listing
        const lRef = doc(db, 'listings', listingId);
        await updateDoc(lRef, {
          is_boosted: true,
          boosted_until: maxExpiryStr
        });
      }

      const boostRef = doc(db, 'listing_boosts', pendingBoost.id);
      if (isNew) {
        await setDoc(boostRef, pendingBoost);
      } else {
        await updateDoc(boostRef, {
          ads_watched_count: pendingBoost.ads_watched_count,
          status: pendingBoost.status,
          boost_started_at: pendingBoost.boost_started_at || null,
          boosted_until: pendingBoost.boosted_until || null,
          updated_at: pendingBoost.updated_at
        });
      }

      return { count, status };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `listing_boosts/increment`);
      return { count: 0, status: 'pending' };
    }
  },

  async getListingBoost(listingId: string): Promise<ListingBoost | null> {
    const boosts = await this.getListingBoosts(listingId);
    if (boosts.length === 0) return null;
    const pending = boosts.find(b => b.status === 'pending');
    if (pending) return pending;
    
    const active = boosts.filter(b => b.status === 'active' && b.boosted_until && new Date(b.boosted_until).getTime() > Date.now());
    if (active.length > 0) {
      active.sort((a, b) => new Date(b.boosted_until!).getTime() - new Date(a.boosted_until!).getTime());
      return active[0];
    }
    
    boosts.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return boosts[0];
  },

  // --------- EXCHANGE AND CONFIRMATION PROCESS ---------
  async requestExchange(listingId: string, participantTwoId: string, chatId: string): Promise<string> {
    const uid = await this.getCurrentUserId();
    const eId = `exchange_${listingId}`;
    const nowStr = new Date().toISOString();

    const exchangeRecord: Exchange = {
      id: eId,
      listing_id: listingId,
      owner_id: uid,
      exchanged_with_user_id: participantTwoId,
      status: 'pending',
      created_at: nowStr,
      updated_at: nowStr
    };

    if (isMockMode) {
      const exchanges = getMockCollection<Exchange[]>(MOCK_EXCHANGES_KEY);
      // Remove stale existing pending requests for this listing
      const filtered = exchanges.filter(e => e.listing_id !== listingId);
      filtered.push(exchangeRecord);
      writeMockCollection(MOCK_EXCHANGES_KEY, filtered);

      // Send the beautiful custom interactive chat card
      await this.sendMessage(chatId, "أرسل صاحب الإعلان طلباً لتأكيد عملية التبادل معكم. يرجى المراجعة والتأكيد.", 'exchange_confirmation_request', {
        listing_id: listingId,
        exchange_id: eId
      });

      return eId;
    }

    try {
      const exRef = doc(db, 'exchanges', eId);
      await setDoc(exRef, exchangeRecord);

      await this.sendMessage(chatId, "أرسل صاحب الإعلان طلباً لتأكيد عملية التبادل معكم. يرجى المراجعة والتأكيد.", 'exchange_confirmation_request', {
        listing_id: listingId,
        exchange_id: eId
      });

      return eId;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `exchanges/${eId}`);
      return '';
    }
  },

  async respondToExchangeRequest(exchangeId: string, accept: boolean, chatId: string): Promise<void> {
    const uid = await this.getCurrentUserId();
    const nowStr = new Date().toISOString();

    if (isMockMode) {
      const exchanges = getMockCollection<Exchange[]>(MOCK_EXCHANGES_KEY);
      const extIdx = exchanges.findIndex(e => e.id === exchangeId);
      if (extIdx === -1) return;

      const record = exchanges[extIdx];

      if (accept) {
        record.status = 'completed';
        record.updated_at = nowStr;

        // Perform ATOMIC listings sync
        const listings = getMockCollection<Listing[]>(MOCK_LISTINGS_KEY);
        const lIdx = listings.findIndex(l => l.id === record.listing_id);
        if (lIdx !== -1) {
          listings[lIdx].status = 'exchanged';
          listings[lIdx].is_active = false;
          listings[lIdx].exchanged_at = nowStr;
          listings[lIdx].exchanged_with_user_id = record.exchanged_with_user_id;
          writeMockCollection(MOCK_LISTINGS_KEY, listings);
        }

        // Update profiles count
        const profiles = getMockCollection<Record<string, Profile>>(MOCK_PROFILES_KEY);
        // Owner completed exchange increment
        if (profiles[record.owner_id]) {
          profiles[record.owner_id].completed_exchanges_count = (profiles[record.owner_id].completed_exchanges_count || 0) + 1;
          profiles[record.owner_id].active_listings_count = Math.max(0, (profiles[record.owner_id].active_listings_count || 1) - 1);
        }
        // Recipient completed exchange increment
        if (profiles[record.exchanged_with_user_id]) {
          profiles[record.exchanged_with_user_id].completed_exchanges_count = (profiles[record.exchanged_with_user_id].completed_exchanges_count || 0) + 1;
        }
        writeMockCollection(MOCK_PROFILES_KEY, profiles);

        // Send confirmation chat bubble
        await this.sendMessage(chatId, "لقد تم تأكيد وإتمام عملية التبادل بنجاح! مبروك لكما.", 'exchange_confirmation_result', {
          listing_id: record.listing_id,
          exchange_id: exchangeId,
          metadata: { result: 'approved' }
        });

        // Prompt for exchange details
        await this.sendMessage(chatId, "طلب تفاصيل: يرجى كتابة ما قمت بتبديله ورفع صورة إن أمكن.", 'exchange_details_request', {
          listing_id: record.listing_id,
          exchange_id: exchangeId
        });

      } else {
        record.status = 'rejected';
        record.updated_at = nowStr;

        await this.sendMessage(chatId, "تم رفض طلب تأكيد التبادل من الطرف الآخر.", 'exchange_confirmation_result', {
          listing_id: record.listing_id,
          exchange_id: exchangeId,
          metadata: { result: 'rejected' }
        });
      }

      writeMockCollection(MOCK_EXCHANGES_KEY, exchanges);
      return;
    }

    try {
      const exRef = doc(db, 'exchanges', exchangeId);
      const exSnap = await getDoc(exRef);
      if (!exSnap.exists()) return;

      const record = exSnap.data() as Exchange;

      if (accept) {
        await updateDoc(exRef, {
          status: 'completed',
          updated_at: nowStr
        });

        // Atomic listings sync (isolated to handle security rule differences dynamically)
        try {
          const lRef = doc(db, 'listings', record.listing_id);
          await updateDoc(lRef, {
            status: 'exchanged',
            is_active: false,
            exchanged_at: nowStr,
            exchanged_with_user_id: record.exchanged_with_user_id
          });
        } catch (listingErr) {
          console.warn("Isolated Warning: Listing document update failed (this will be synced by owner):", listingErr);
        }

        // Update profile exchanges counts (wrapped individually to ensure resilience)
        try {
          const ownerProfileRef = doc(db, 'profiles', record.owner_id);
          const ownerSnap = await getDoc(ownerProfileRef);
          if (ownerSnap.exists()) {
            const currentC = ownerSnap.data().completed_exchanges_count || 0;
            const currentA = ownerSnap.data().active_listings_count || 1;
            await updateDoc(ownerProfileRef, {
              completed_exchanges_count: currentC + 1,
              active_listings_count: Math.max(0, currentA - 1)
            });
          }
        } catch (ownerProfileErr) {
          console.warn("Isolated Warning: Owner profile count update failed:", ownerProfileErr);
        }

        try {
          const recProfileRef = doc(db, 'profiles', record.exchanged_with_user_id);
          const recSnap = await getDoc(recProfileRef);
          if (recSnap.exists()) {
            const recC = recSnap.data().completed_exchanges_count || 0;
            await updateDoc(recProfileRef, { completed_exchanges_count: recC + 1 });
          }
        } catch (recProfileErr) {
          console.warn("Isolated Warning: Recipient profile count update failed:", recProfileErr);
        }

        try {
          await this.sendMessage(chatId, "تم تأكيد وإتمام المبادلة بنجاح!", 'exchange_confirmation_result', {
            listing_id: record.listing_id,
            exchange_id: exchangeId,
            metadata: { result: 'approved' }
          });
        } catch (msgErr) {
          console.warn("Isolated Warning: Failed to send success confirmation message:", msgErr);
        }

        try {
          await this.sendMessage(chatId, "يرجى كتابة ما قمت بتبديله ورفع صورته لدعم توثيق المبادلة.", 'exchange_details_request', {
            listing_id: record.listing_id,
            exchange_id: exchangeId
          });
        } catch (msgErr) {
          console.warn("Isolated Warning: Failed to send details request message:", msgErr);
        }
      } else {
        await updateDoc(exRef, {
          status: 'rejected',
          updated_at: nowStr
        });

        try {
          await this.sendMessage(chatId, "تم رفض إتمام عملية التبادل من طرف الشريك.", 'exchange_confirmation_result', {
            listing_id: record.listing_id,
            exchange_id: exchangeId,
            metadata: { result: 'rejected' }
          });
        } catch (msgErr) {
          console.warn("Isolated Warning: Failed to send rejection message:", msgErr);
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `exchanges/${exchangeId}`);
    }
  },

  async submitExchangeDetails(
    exchangeId: string, 
    description: string, 
    images: string[], 
    ratingStars: number,
    ratingComment: string,
    skipped: boolean, 
    chatId: string
  ): Promise<void> {
    const uid = await this.getCurrentUserId();
    const dId = generateId();
    const nowStr = new Date().toISOString();

    const deRecord: ExchangeDetails = {
      id: dId,
      exchange_id: exchangeId,
      submitted_by_user_id: uid,
      description,
      image_urls: images,
      skipped,
      created_at: nowStr
    };

    // Auto-fetch listingId and reviewedUserId from the exchange object
    let listingId = "";
    let reviewedUserId = "";

    if (isMockMode) {
      const exchanges = getMockCollection<Exchange[]>(MOCK_EXCHANGES_KEY);
      const record = exchanges.find(e => e.id === exchangeId);
      if (record) {
        listingId = record.listing_id;
        reviewedUserId = record.owner_id === uid ? record.exchanged_with_user_id : record.owner_id;
      }

      const details = getMockCollection<ExchangeDetails[]>(MOCK_EXCHANGE_DETAILS_KEY);
      details.push(deRecord);
      writeMockCollection(MOCK_EXCHANGE_DETAILS_KEY, details);

      // Submit Rating seamlessly of the partner
      if (listingId && reviewedUserId) {
        await this.submitRating(exchangeId, listingId, reviewedUserId, ratingStars, ratingComment, chatId);
      }

      if (!skipped) {
        await this.sendMessage(chatId, `تم تسجيل وتوثيق تفاصيل ما تم تبديله مع التقييم بنجاح.`, 'exchange_details_response', {
          exchange_id: exchangeId,
          media_url: images[0] || '',
          metadata: {
            exchange_desc: description,
            stars: ratingStars,
            review: ratingComment,
            is_verified: true
          }
        });
      }
      return;
    }

    try {
      const dRef = doc(db, 'exchanges', exchangeId, 'details', dId);
      await setDoc(dRef, deRecord);

      let exSnap;
      try {
        const exRef = doc(db, 'exchanges', exchangeId);
        exSnap = await getDoc(exRef);
      } catch (exErr) {
        console.warn("Isolated warning: failed to retrieve exchange document:", exErr);
      }

      if (exSnap && exSnap.exists()) {
        const record = exSnap.data() as Exchange;
        listingId = record.listing_id;
        reviewedUserId = record.owner_id === uid ? record.exchanged_with_user_id : record.owner_id;
      }

      // Submit Rating seamlessly of the partner
      if (listingId && reviewedUserId) {
        try {
          await this.submitRating(exchangeId, listingId, reviewedUserId, ratingStars, ratingComment, chatId);
        } catch (ratErr) {
          console.warn("Isolated warning: failed to submit partner rating seamlessly:", ratErr);
        }
      }

      if (!skipped) {
        try {
          await this.sendMessage(chatId, `تم تسجيل وتوثيق تفاصيل ما تم تبديله مع التقييم بنجاح.`, 'exchange_details_response', {
            exchange_id: exchangeId,
            media_url: images[0] || '',
            metadata: {
              exchange_desc: description,
              stars: ratingStars,
              review: ratingComment,
              is_verified: true
            }
          });
        } catch (msgErr) {
          console.warn("Isolated warning: failed to send confirmation message seamlessly:", msgErr);
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `exchanges/${exchangeId}/details/${dId}`);
    }
  },

  async submitRating(exchangeId: string, listingId: string, reviewedUserId: string, ratingValue: number, reviewText: string, chatId: string): Promise<void> {
    const uid = await this.getCurrentUserId();
    const rId = generateId();
    const nowStr = new Date().toISOString();

    const ratingRecord: UserRating = {
      id: rId,
      exchange_id: exchangeId,
      listing_id: listingId,
      reviewer_user_id: uid,
      reviewed_user_id: reviewedUserId,
      rating_value: ratingValue,
      review_text: reviewText,
      created_at: nowStr
    };

    if (isMockMode) {
      const ratings = getMockCollection<UserRating[]>(MOCK_RATINGS_KEY);
      const isDuplicate = ratings.some(r => r.exchange_id === exchangeId && r.reviewer_user_id === uid);
      if (isDuplicate) return; // Prevent duplicates is key

      ratings.push(ratingRecord);
      writeMockCollection(MOCK_RATINGS_KEY, ratings);

      // Recalculate average rating for review target
      const targetRatings = ratings.filter(r => r.reviewed_user_id === reviewedUserId);
      const totalStars = targetRatings.reduce((sum, r) => sum + r.rating_value, 0);
      const averageStars = Number((totalStars / targetRatings.length).toFixed(1));

      const profiles = getMockCollection<Record<string, Profile>>(MOCK_PROFILES_KEY);
      if (!profiles[reviewedUserId]) {
        const nextCode = await this.generateNextUserCode();
        profiles[reviewedUserId] = {
          id: reviewedUserId,
          display_name: "مستكشف بَدِل",
          username: nextCode,
          average_rating: averageStars,
          ratings_count: targetRatings.length,
          active_listings_count: 0,
          completed_exchanges_count: 0,
          created_at: nowStr,
          updated_at: nowStr
        };
      } else {
        profiles[reviewedUserId].average_rating = averageStars;
        profiles[reviewedUserId].ratings_count = targetRatings.length;
      }
      writeMockCollection(MOCK_PROFILES_KEY, profiles);

      await this.sendMessage(chatId, `شكراً لك! لقد أرسلت تقييماً بمعدل (${ratingValue}/5) نجوم.`, 'system_message');
      return;
    }

    try {
      // Query ratings for this exchange_id to prevent duplicates without requiring complex composite indexes
      const qDup = query(
        collection(db, 'user_ratings'),
        where('exchange_id', '==', exchangeId)
      );
      const dupSnap = await getDocs(qDup);
      const isDuplicate = dupSnap.docs.some(doc => {
        const data = doc.data() as UserRating;
        return data.reviewer_user_id === uid;
      });

      if (isDuplicate) {
        console.warn("Rating already exists in DB for exchangeId:", exchangeId, "by reviewer:", uid);
        return;
      }

      const rRef = doc(db, 'user_ratings', rId);
      await setDoc(rRef, ratingRecord);

      // Simple calculation logic from snapshot
      try {
        const q = query(collection(db, 'user_ratings'), where('reviewed_user_id', '==', reviewedUserId));
        const ratingsSnap = await getDocs(q);
        const targetRatings = ratingsSnap.docs.map(d => d.data() as UserRating);
        
        // Handle indexing latency: if the newly submitted rating is not in the snapshot, add it manually
        if (!targetRatings.some(r => r.id === rId)) {
          targetRatings.push(ratingRecord);
        }
        
        const totalS = targetRatings.reduce((sum, r) => sum + r.rating_value, 0);
        const avg = Number((totalS / targetRatings.length).toFixed(1));

        const pRef = doc(db, 'profiles', reviewedUserId);
        await setDoc(pRef, {
          average_rating: avg,
          ratings_count: targetRatings.length
        }, { merge: true });
      } catch (calcE) {
        console.error("Failed to update profile ratings count/average in DB:", calcE);
      }

      await this.sendMessage(chatId, `تم تسجيل تقييمك للمستخدم بمعدل (${ratingValue}/5) نجوم بنجاح!`, 'system_message');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `user_ratings/${rId}`);
    }
  },

  async getExchange(exchangeId: string): Promise<Exchange | null> {
    if (isMockMode) {
      const listObj = getMockCollection<Exchange[]>(MOCK_EXCHANGES_KEY);
      return listObj.find(e => e.id === exchangeId) || null;
    }
    try {
      const snap = await getDoc(doc(db, 'exchanges', exchangeId));
      if (snap.exists()) return snap.data() as Exchange;
      return null;
    } catch (e) {
      return null;
    }
  },

  async getCompletedExchanges(): Promise<Exchange[]> {
    const uid = await this.getCurrentUserId();
    if (isMockMode) {
      const exchanges = getMockCollection<Exchange[]>(MOCK_EXCHANGES_KEY);
      return exchanges.filter(e => e.status === 'completed' && (e.owner_id === uid || e.exchanged_with_user_id === uid));
    }

    try {
      const querySnap = await getDocs(collection(db, 'exchanges'));
      const listExf = querySnap.docs.map(d => d.data() as Exchange);
      return listExf.filter(e => e.status === 'completed' && (e.owner_id === uid || e.exchanged_with_user_id === uid));
    } catch (e) {
      return [];
    }
  },

  async getCompletedExchangeDetails(exchangeId: string): Promise<ExchangeDetails | null> {
    if (isMockMode) {
      const data = getMockCollection<ExchangeDetails[]>(MOCK_EXCHANGE_DETAILS_KEY);
      return data.find(de => de.exchange_id === exchangeId) || null;
    }
    try {
      const snap = await getDocs(collection(db, 'exchanges', exchangeId, 'details'));
      if (!snap.empty) {
        return snap.docs[0].data() as ExchangeDetails;
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  async updateProfileLanguage(uid: string, lang: string): Promise<void> {
    if (isMockMode) {
      const profiles = getMockCollection<Record<string, Profile>>(MOCK_PROFILES_KEY);
      if (profiles[uid]) {
        (profiles[uid] as any).locale = lang;
        writeMockCollection(MOCK_PROFILES_KEY, profiles);
      }
      return;
    }
    try {
      const docRef = doc(db, 'profiles', uid);
      await updateDoc(docRef, { locale: lang });
    } catch (e) {
      // safe optional update
    }
  },

  // --------- ADMIN SERVICES AND MANAGEMENT ---------

  async getCurrentUserRole(): Promise<'user' | 'moderator' | 'admin' | 'super_admin'> {
    const uid = await this.getCurrentUserId();
    if (!uid) return 'user';

    const email = await this.getCurrentUserEmail();
    const isVerifiedAdmin = email.toLowerCase().trim() === 'vegro09@gmail.com' || email.toLowerCase().trim() === 'baddil.support@gmail.com';

    const profile = await this.getUserProfile(uid);
    if (isVerifiedAdmin) {
      if (profile && profile.role !== 'super_admin' && profile.role !== 'admin') {
        profile.role = 'super_admin';
        if (!isMockMode) {
          try {
            await setDoc(doc(db, 'profiles', uid), { role: 'super_admin', status: 'active' }, { merge: true });
          } catch (e) {
            console.warn("Failed to set admin role in Firestore:", e);
          }
        }
      }
      return 'super_admin';
    }

    if (!profile) return 'user';

    if (!profile.role) {
      if (isMockMode) {
        const profiles = getMockCollection<Record<string, Profile>>(MOCK_PROFILES_KEY);
        const hasAnyAdmin = Object.values(profiles).some(p => p.role && p.role !== 'user');
        if (!hasAnyAdmin) {
          profile.role = 'super_admin';
          profiles[uid] = profile;
          writeMockCollection(MOCK_PROFILES_KEY, profiles);
          await this.createAuditLog(uid, profile.display_name, 'self_bootstrap', 'user', uid, null, 'super_admin', 'First user initialization');
        } else {
          profile.role = 'user';
          profiles[uid] = profile;
          writeMockCollection(MOCK_PROFILES_KEY, profiles);
        }
      } else {
        try {
          const snapshot = await getDocs(collection(db, 'profiles'));
          const hasAnyAdmin = snapshot.docs.some(doc => {
            const data = doc.data();
            return data.role && data.role !== 'user';
          });

          if (!hasAnyAdmin) {
            await updateDoc(doc(db, 'profiles', uid), { role: 'super_admin', status: 'active' });
            profile.role = 'super_admin';
            await this.createAuditLog(uid, profile.display_name, 'self_bootstrap', 'user', uid, null, 'super_admin', 'First user initialization');
          } else {
            await updateDoc(doc(db, 'profiles', uid), { role: 'user', status: 'active' });
            profile.role = 'user';
          }
        } catch (err) {
          console.error("Bootstrapping check failed", err);
        }
      }
    }

    return profile.role || 'user';
  },

  async createAuditLog(
    adminId: string,
    adminName: string,
    action: string,
    targetType: string,
    targetId: string,
    oldData: any,
    newData: any,
    reason: string
  ): Promise<void> {
    const logId = generateId();
    const nowStr = new Date().toISOString();
    const logRec: AdminAuditLog = {
      id: logId,
      admin_id: adminId,
      admin_name: adminName,
      action,
      target_type: targetType,
      target_id: targetId,
      old_data: oldData,
      new_data: newData,
      reason,
      created_at: nowStr,
      ip_address: '127.0.0.1'
    };

    if (isMockMode) {
      const logs = getMockCollection<AdminAuditLog[]>('badal_mock_admin_audit_logs');
      logs.push(logRec);
      writeMockCollection('badal_mock_admin_audit_logs', logs);
      return;
    }

    try {
      await setDoc(doc(db, 'admin_audit_logs', logId), logRec);
    } catch (err) {
      console.error("Failed to write audit log in Firestore", err);
    }
  },

  async getAuditLogs(): Promise<AdminAuditLog[]> {
    if (isMockMode) {
      const logs = getMockCollection<AdminAuditLog[]>('badal_mock_admin_audit_logs');
      return logs.sort((a,b) => b.created_at.localeCompare(a.created_at));
    }
    try {
      const snap = await getDocs(collection(db, 'admin_audit_logs'));
      return snap.docs.map(doc => doc.data() as AdminAuditLog).sort((a,b) => b.created_at.localeCompare(a.created_at));
    } catch (err) {
      console.error("Failed to query audit logs", err);
      return [];
    }
  },

  async queryUsersList(): Promise<Profile[]> {
    if (isMockMode) {
      const p = getMockCollection<Record<string, Profile>>(MOCK_PROFILES_KEY);
      return Object.values(p);
    }
    try {
      const snap = await getDocs(collection(db, 'profiles'));
      return snap.docs.map(doc => doc.data() as Profile);
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async getAdminNotes(targetType: string, targetId: string): Promise<any[]> {
    if (isMockMode) {
      const notes = getMockCollection<any[]>('badal_mock_admin_notes');
      return notes.filter(n => n.target_type === targetType && n.target_id === targetId);
    }
    try {
      const snap = await getDocs(collection(db, 'admin_notes'));
      const list = snap.docs.map(d => d.data());
      return list.filter((n: any) => n.target_type === targetType && n.target_id === targetId);
    } catch (e) {
      return [];
    }
  },

  async addAdminNote(adminId: string, adminName: string, targetType: string, targetId: string, note: string): Promise<void> {
    const noteId = generateId();
    const noteRecord = {
      id: noteId,
      admin_id: adminId,
      admin_name: adminName,
      target_type: targetType,
      target_id: targetId,
      note,
      created_at: new Date().toISOString()
    };

    if (isMockMode) {
      const notes = getMockCollection<any[]>('badal_mock_admin_notes');
      notes.push(noteRecord);
      writeMockCollection('badal_mock_admin_notes', notes);
      return;
    }
    try {
      await setDoc(doc(db, 'admin_notes', noteId), noteRecord);
    } catch (err) {
      console.error(err);
    }
  },

  async updateUserRoleAndStatus(
    targetUid: string,
    role: 'user' | 'moderator' | 'admin' | 'super_admin',
    status: 'active' | 'suspended' | 'banned' | 'deleted',
    reason: string,
    durationHours?: number
  ): Promise<void> {
    const adminId = await this.getCurrentUserId();
    const adminProfile = await this.getUserProfile(adminId);
    const adminName = adminProfile?.display_name || 'Admin';
    const targetProfile = await this.getUserProfile(targetUid);
    const oldRole = targetProfile?.role || 'user';
    const oldStatus = targetProfile?.status || 'active';

    const updates: any = { role, status, updated_at: new Date().toISOString() };
    if (status === 'suspended') {
      updates.suspension_reason = reason;
      if (durationHours) {
        updates.suspension_until = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
      }
    } else {
      updates.suspension_reason = "";
      updates.suspension_until = "";
    }

    if (isMockMode) {
      const profiles = getMockCollection<Record<string, Profile>>(MOCK_PROFILES_KEY);
      if (profiles[targetUid]) {
        profiles[targetUid] = { ...profiles[targetUid], ...updates };
        writeMockCollection(MOCK_PROFILES_KEY, profiles);
      }
    } else {
      const docRef = doc(db, 'profiles', targetUid);
      await updateDoc(docRef, updates);
    }

    if (oldRole !== role) {
      await this.createAuditLog(adminId, adminName, 'role_change', 'user', targetUid, { role: oldRole }, { role }, reason);
    }
    if (oldStatus !== status) {
      await this.createAuditLog(adminId, adminName, status === 'suspended' ? 'user_suspend' : status === 'banned' ? 'user_ban' : 'user_activate', 'user', targetUid, { status: oldStatus }, { status, until: updates.suspension_until }, reason);
    }
  },

  async queryListingsList(): Promise<Listing[]> {
    if (isMockMode) {
      return getMockCollection<Listing[]>(MOCK_LISTINGS_KEY);
    }
    try {
      const snap = await getDocs(collection(db, 'listings'));
      return snap.docs.map(doc => doc.data() as Listing);
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async updateListingModeration(
    listingId: string,
    status: 'active' | 'hidden_by_admin' | 'removed' | 'exchanged' | 'inactive',
    reason: string
  ): Promise<void> {
    const adminId = await this.getCurrentUserId();
    const adminProfile = await this.getUserProfile(adminId);
    const adminName = adminProfile?.display_name || 'Admin';

    let oldStatus: string = 'active';

    if (isMockMode) {
      const listings = getMockCollection<Listing[]>(MOCK_LISTINGS_KEY);
      const idx = listings.findIndex(l => l.id === listingId);
      if (idx !== -1) {
        oldStatus = listings[idx].status;
        listings[idx].status = status as any;
        listings[idx].is_active = status === 'active';
        writeMockCollection(MOCK_LISTINGS_KEY, listings);
      }
    } else {
      const refDoc = doc(db, 'listings', listingId);
      const snap = await getDoc(refDoc);
      if (snap.exists()) {
        oldStatus = snap.data().status;
        await updateDoc(refDoc, { status, is_active: status === 'active', updated_at: new Date().toISOString() });
      }
    }

    await this.createAuditLog(adminId, adminName, 'listing_moderator_update', 'listing', listingId, { status: oldStatus }, { status }, reason);
  },

  async queryReportsList(): Promise<AppReport[]> {
    if (isMockMode) {
      const rep = getMockCollection<AppReport[]>('badal_mock_reports');
      if (rep.length === 0) {
        // Create 2 seed reports for rich testing
        const nowStr = new Date().toISOString();
        const demo: AppReport[] = [
          {
            id: 'report_demo_1',
            reporter_user_id: 'user_fatima',
            target_type: 'listing',
            target_id: 'list_iphone',
            reason: 'fake',
            description: 'الجهاز ليس آيفون حقيقي، الصور مفبركة.',
            evidence_urls: [],
            status: 'open',
            priority: 'medium',
            created_at: nowStr,
            updated_at: nowStr
          },
          {
            id: 'report_demo_2',
            reporter_user_id: 'user_amr',
            target_type: 'user',
            target_id: 'user_hassan',
            reason: 'harassment',
            description: 'يتعامل بأسلوب هجومي في الرسائل.',
            evidence_urls: [],
            status: 'open',
            priority: 'high',
            created_at: nowStr,
            updated_at: nowStr
          }
        ];
        writeMockCollection('badal_mock_reports', demo);
        return demo;
      }
      return rep;
    }
    try {
      const snap = await getDocs(collection(db, 'reports'));
      return snap.docs.map(doc => doc.data() as AppReport);
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async createReport(
    targetType: 'listing' | 'user' | 'chat_message' | 'rating' | 'exchange',
    targetId: string,
    reason: 'fraud_or_scam' | 'inappropriate' | 'fake' | 'incorrect_description' | 'prohibited' | 'harassment' | 'spam' | 'impersonation' | 'other',
    description: string,
    evidenceUrls: string[] = []
  ): Promise<void> {
    const reporterId = await this.getCurrentUserId();
    const reportId = generateId();
    const nowStr = new Date().toISOString();
    const report: AppReport = {
      id: reportId,
      reporter_user_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      reason,
      description,
      evidence_urls: evidenceUrls,
      status: 'open',
      priority: reason === 'fraud_or_scam' ? 'high' : 'medium',
      created_at: nowStr,
      updated_at: nowStr
    };

    if (isMockMode) {
      const listObj = getMockCollection<AppReport[]>('badal_mock_reports');
      listObj.push(report);
      writeMockCollection('badal_mock_reports', listObj);
      return;
    }
    try {
      await setDoc(doc(db, 'reports', reportId), report);
    } catch (e) {
      console.error(e);
    }
  },

  async updateReportStatus(
    reportId: string,
    status: 'open' | 'under_review' | 'resolved' | 'rejected' | 'escalated',
    actionReason: string,
    assignedAdminId?: string
  ): Promise<void> {
    const adminId = await this.getCurrentUserId();
    const adminProfile = await this.getUserProfile(adminId);
    const adminName = adminProfile?.display_name || 'Admin';

    if (isMockMode) {
      const listObj = getMockCollection<AppReport[]>('badal_mock_reports');
      const idx = listObj.findIndex(r => r.id === reportId);
      if (idx !== -1) {
        const oldStatus = listObj[idx].status;
        listObj[idx].status = status;
        listObj[idx].updated_at = new Date().toISOString();
        if (assignedAdminId) listObj[idx].assigned_admin_id = assignedAdminId;
        writeMockCollection('badal_mock_reports', listObj);
        await this.createAuditLog(adminId, adminName, 'report_status_update', 'report', reportId, { status: oldStatus }, { status }, actionReason);
      }
    } else {
      const refDoc = doc(db, 'reports', reportId);
      const snap = await getDoc(refDoc);
      if (snap.exists()) {
        const old = snap.data() as AppReport;
        const updates: any = { status, updated_at: new Date().toISOString() };
        if (assignedAdminId) updates.assigned_admin_id = assignedAdminId;
        await updateDoc(refDoc, updates);
        await this.createAuditLog(adminId, adminName, 'report_status_update', 'report', reportId, { status: old.status }, { status }, actionReason);
      }
    }
  },

  async queryExchangesList(): Promise<Exchange[]> {
    if (isMockMode) {
      return getMockCollection<Exchange[]>(MOCK_EXCHANGES_KEY);
    }
    try {
      const snap = await getDocs(collection(db, 'exchanges'));
      return snap.docs.map(doc => doc.data() as Exchange);
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async updateExchangeStatusAdmin(exchangeId: string, status: 'pending' | 'completed' | 'rejected', reason: string): Promise<void> {
    const adminId = await this.getCurrentUserId();
    const adminProfile = await this.getUserProfile(adminId);
    const adminName = adminProfile?.display_name || 'Admin';

    if (isMockMode) {
      const listObj = getMockCollection<Exchange[]>(MOCK_EXCHANGES_KEY);
      const idx = listObj.findIndex(e => e.id === exchangeId);
      if (idx !== -1) {
        const oldStatus = listObj[idx].status;
        listObj[idx].status = status;
        listObj[idx].updated_at = new Date().toISOString();
        writeMockCollection(MOCK_EXCHANGES_KEY, listObj);
        await this.createAuditLog(adminId, adminName, 'exchange_status_moderation', 'exchange', exchangeId, { status: oldStatus }, { status }, reason);
      }
    } else {
      const refDoc = doc(db, 'exchanges', exchangeId);
      const snap = await getDoc(refDoc);
      if (snap.exists()) {
        const oldS = snap.data().status;
        await updateDoc(refDoc, { status, updated_at: new Date().toISOString() });
        await this.createAuditLog(adminId, adminName, 'exchange_status_moderation', 'exchange', exchangeId, { status: oldS }, { status }, reason);
      }
    }
  },

  async queryBoostsList(): Promise<ListingBoost[]> {
    if (isMockMode) {
      return getMockCollection<ListingBoost[]>(MOCK_BOOSTS_KEY);
    }
    try {
      const snap = await getDocs(collection(db, 'listing_boosts'));
      return snap.docs.map(doc => doc.data() as ListingBoost);
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async cancelListingBoostAdmin(boostId: string, reason: string): Promise<void> {
    const adminId = await this.getCurrentUserId();
    const adminProfile = await this.getUserProfile(adminId);
    const adminName = adminProfile?.display_name || 'Admin';

    let listingId = "";

    if (isMockMode) {
      const boosts = getMockCollection<ListingBoost[]>(MOCK_BOOSTS_KEY);
      const idx = boosts.findIndex(b => b.id === boostId);
      if (idx !== -1) {
        boosts[idx].status = 'expired';
        boosts[idx].updated_at = new Date().toISOString();
        listingId = boosts[idx].listing_id;
        writeMockCollection(MOCK_BOOSTS_KEY, boosts);

        // Find remaining active boosts for this listing
        const otherBoosts = boosts.filter(b => b.id !== boostId && b.listing_id === listingId);
        const remainingActive = otherBoosts.filter(b => b.status === 'active' && b.boosted_until && new Date(b.boosted_until).getTime() > Date.now());

        const listings = getMockCollection<Listing[]>(MOCK_LISTINGS_KEY);
        const lIdx = listings.findIndex(l => l.id === listingId);
        if (lIdx !== -1) {
          if (remainingActive.length > 0) {
            const maxExpiryTime = Math.max(...remainingActive.map(b => new Date(b.boosted_until!).getTime()));
            listings[lIdx].is_boosted = true;
            listings[lIdx].boosted_until = new Date(maxExpiryTime).toISOString();
          } else {
            listings[lIdx].is_boosted = false;
            listings[lIdx].boosted_until = "";
          }
          writeMockCollection(MOCK_LISTINGS_KEY, listings);
        }
      } else {
        // Assume boostId is actually listingId since target was not found as a boost document id
        const matchedListingId = boostId;
        let changed = false;
        boosts.forEach(b => {
          if (b.listing_id === matchedListingId && b.status === 'active') {
            b.status = 'expired';
            b.updated_at = new Date().toISOString();
            changed = true;
          }
        });
        if (changed) {
          writeMockCollection(MOCK_BOOSTS_KEY, boosts);
        }
        const listings = getMockCollection<Listing[]>(MOCK_LISTINGS_KEY);
        const lIdx = listings.findIndex(l => l.id === matchedListingId);
        if (lIdx !== -1) {
          listings[lIdx].is_boosted = false;
          listings[lIdx].boosted_until = "";
          writeMockCollection(MOCK_LISTINGS_KEY, listings);
        }
      }
    } else {
      const bDoc = doc(db, 'listing_boosts', boostId);
      const snap = await getDoc(bDoc);
      if (snap.exists()) {
        const data = snap.data() as ListingBoost;
        listingId = data.listing_id;
        await updateDoc(bDoc, { status: 'expired', updated_at: new Date().toISOString() });

        // Retrieve remaining active boosts
        const q = query(collection(db, 'listing_boosts'), where('listing_id', '==', listingId));
        const allSnaps = await getDocs(q);
        const allBoostsForThisListing = allSnaps.docs.map(d => d.data() as ListingBoost);

        const remainingActive = allBoostsForThisListing.filter(b => b.id !== boostId && b.status === 'active' && b.boosted_until && new Date(b.boosted_until).getTime() > Date.now());

        if (remainingActive.length > 0) {
          const maxExpiryTime = Math.max(...remainingActive.map(b => new Date(b.boosted_until!).getTime()));
          await updateDoc(doc(db, 'listings', listingId), {
            is_boosted: true,
            boosted_until: new Date(maxExpiryTime).toISOString()
          });
        } else {
          await updateDoc(doc(db, 'listings', listingId), {
            is_boosted: false,
            boosted_until: ""
          });
        }
      } else {
        // Assume boostId is actually listingId. Set all active boosts for this listing as expired
        const matchedListingId = boostId;
        const q = query(collection(db, 'listing_boosts'), where('listing_id', '==', matchedListingId), where('status', '==', 'active'));
        const allSnaps = await getDocs(q);

        const CHUNK_SIZE = 400;
        if (allSnaps.docs.length > 0) {
          for (let i = 0; i < allSnaps.docs.length; i += CHUNK_SIZE) {
            const chunk = allSnaps.docs.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach(d => {
              batch.update(d.ref, { status: 'expired', updated_at: new Date().toISOString() });
            });
            // Update the listing in the final batch for atomicity
            if (i + CHUNK_SIZE >= allSnaps.docs.length) {
              batch.update(doc(db, 'listings', matchedListingId), {
                is_boosted: false,
                boosted_until: ""
              });
            }
            await batch.commit();
          }
        } else {
          await updateDoc(doc(db, 'listings', matchedListingId), {
            is_boosted: false,
            boosted_until: ""
          });
        }
      }
    }

    await this.createAuditLog(adminId, adminName, 'boost_cancelled', 'boost', boostId, null, null, reason);
  },

  async queryRatingsList(): Promise<UserRating[]> {
    if (isMockMode) {
      return getMockCollection<UserRating[]>(MOCK_RATINGS_KEY);
    }
    try {
      const snap = await getDocs(collection(db, 'user_ratings'));
      return snap.docs.map(doc => doc.data() as UserRating);
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async deleteRatingAdmin(ratingId: string, reason: string): Promise<void> {
    const adminId = await this.getCurrentUserId();
    const adminProfile = await this.getUserProfile(adminId);
    const adminName = adminProfile?.display_name || 'Admin';

    if (isMockMode) {
      const ratings = getMockCollection<UserRating[]>(MOCK_RATINGS_KEY);
      const targetRating = ratings.find(r => r.id === ratingId);
      const filtered = ratings.filter(r => r.id !== ratingId);
      writeMockCollection(MOCK_RATINGS_KEY, filtered);

      if (targetRating) {
        const reviewedUserId = targetRating.reviewed_user_id;
        const targetRatings = filtered.filter(r => r.reviewed_user_id === reviewedUserId);
        const totalStars = targetRatings.reduce((sum, r) => sum + r.rating_value, 0);
        const averageStars = targetRatings.length > 0 ? Number((totalStars / targetRatings.length).toFixed(1)) : 5.0;

        const profiles = getMockCollection<Record<string, Profile>>(MOCK_PROFILES_KEY);
        if (profiles[reviewedUserId]) {
          profiles[reviewedUserId].average_rating = averageStars;
          profiles[reviewedUserId].ratings_count = targetRatings.length;
          writeMockCollection(MOCK_PROFILES_KEY, profiles);
        }
      }
    } else {
      try {
        const rRef = doc(db, 'user_ratings', ratingId);
        const rSnap = await getDoc(rRef);
        if (rSnap.exists()) {
          const targetRating = rSnap.data() as UserRating;
          const reviewedUserId = targetRating.reviewed_user_id;

          await deleteDoc(rRef);

          // Recalculate
          const q = query(collection(db, 'user_ratings'), where('reviewed_user_id', '==', reviewedUserId));
          const ratingsSnap = await getDocs(q);
          const ratings = ratingsSnap.docs.map(d => d.data() as UserRating).filter(r => r.id !== ratingId);

          let avg = 5.0;
          let count = 0;
          if (ratings.length > 0) {
            const totalS = ratings.reduce((sum, r) => sum + r.rating_value, 0);
            avg = Number((totalS / ratings.length).toFixed(1));
            count = ratings.length;
          }

          const pRef = doc(db, 'profiles', reviewedUserId);
          await setDoc(pRef, {
            average_rating: avg,
            ratings_count: count
          }, { merge: true });
        }
      } catch (err) {
        console.error("Failed to delete and recalculate ratings for user in database:", err);
      }
    }

    await this.createAuditLog(adminId, adminName, 'rating_removed', 'rating', ratingId, null, null, reason);
  },

  async querySupportTickets(): Promise<SupportTicket[]> {
    if (isMockMode) {
      const list = getMockCollection<SupportTicket[]>('badal_mock_support_tickets');
      if (list.length === 0) {
        const seed: SupportTicket[] = [
          {
            id: 'ticket_demo_1',
            user_id: 'user_amr',
            subject: 'استفسار عن تفعيل الإعلانات المميزة',
            message: 'مرحباً، أقوم بمشاهدة الفيديوهات لكن أحياناً لا تثبت الميزة فوراً، هل يمكن التحقق؟',
            attachments: [],
            status: 'open',
            priority: 'medium',
            created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
            replies: []
          }
        ];
        writeMockCollection('badal_mock_support_tickets', seed);
        return seed;
      }
      return list;
    }
    try {
      const snap = await getDocs(collection(db, 'support_tickets'));
      return snap.docs.map(doc => doc.data() as SupportTicket);
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async createSupportTicket(subject: string, message: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    const ticketId = generateId();
    const ticket: SupportTicket = {
      id: ticketId,
      user_id: userId,
      subject,
      message,
      attachments: [],
      status: 'open',
      priority: 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      replies: []
    };

    if (isMockMode) {
      const t = getMockCollection<SupportTicket[]>('badal_mock_support_tickets');
      t.push(ticket);
      writeMockCollection('badal_mock_support_tickets', t);
      return;
    }
    try {
      await setDoc(doc(db, 'support_tickets', ticketId), ticket);
    } catch (e) {
      console.error(e);
    }
  },

  async replySupportTicket(ticketId: string, replyMessage: string): Promise<void> {
    const adminId = await this.getCurrentUserId();
    const adminProfile = await this.getUserProfile(adminId);
    const adminName = adminProfile?.display_name || 'Admin/Support';

    const newReply = {
      id: generateId(),
      sender_id: adminId,
      sender_name: adminName,
      message: replyMessage,
      created_at: new Date().toISOString()
    };

    if (isMockMode) {
      const list = getMockCollection<SupportTicket[]>('badal_mock_support_tickets');
      const idx = list.findIndex(t => t.id === ticketId);
      if (idx !== -1) {
        list[idx].replies = [...(list[idx].replies || []), newReply];
        list[idx].status = 'waiting_for_user';
        list[idx].updated_at = new Date().toISOString();
        writeMockCollection('badal_mock_support_tickets', list);
      }
    } else {
      const refD = doc(db, 'support_tickets', ticketId);
      const snap = await getDoc(refD);
      if (snap.exists()) {
        const data = snap.data() as SupportTicket;
        const currentReplies = data.replies || [];
        await updateDoc(refD, {
          replies: [...currentReplies, newReply],
          status: 'waiting_for_user',
          updated_at: new Date().toISOString()
        });
      }
    }
  },

  async queryAnnouncementsList(): Promise<SystemAnnouncement[]> {
    if (isMockMode) {
      return getMockCollection<SystemAnnouncement[]>('badal_mock_system_announcements');
    }
    try {
      const snap = await getDocs(collection(db, 'system_announcements'));
      return snap.docs.map(doc => doc.data() as SystemAnnouncement);
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async createAnnouncement(ann: Omit<SystemAnnouncement, 'id' | 'created_at' | 'created_by'>): Promise<void> {
    const adminId = await this.getCurrentUserId();
    const annId = generateId();
    const nowStr = new Date().toISOString();
    const announcement: SystemAnnouncement = {
      ...ann,
      id: annId,
      created_by: adminId,
      created_at: nowStr
    };

    if (isMockMode) {
      const announcements = getMockCollection<SystemAnnouncement[]>('badal_mock_system_announcements');
      announcements.push(announcement);
      writeMockCollection('badal_mock_system_announcements', announcements);
      return;
    }
    try {
      await setDoc(doc(db, 'system_announcements', annId), announcement);
    } catch (e) {
      console.error(e);
    }
  },

  async queryAdminSettings(): Promise<AdminSettings> {
    const defaultConfig: AdminSettings = {
      id: 'global_config',
      app_name: 'بَدِل - Badal',
      support_email: 'support@badal.com',
      privacy_policy_url: '/privacy',
      terms_of_use_url: '/terms',
      maintenance_mode: false,
      max_media_count: 5,
      max_image_size_kb: 1024,
      max_video_size_kb: 750,
      boost_duration_hours: 24,
      rewarded_ads_required: 3,
      enabled_languages: ['ar', 'en'],
      default_language: 'ar',
      last_updated_at: new Date().toISOString(),
      last_updated_by: 'system'
    };

    if (isMockMode) {
      await storageReady();
      const parsed = getMemoryItem<AdminSettings>('badal_mock_admin_settings', defaultConfig);
      if (parsed.rewarded_ads_required === 2) {
        parsed.rewarded_ads_required = 3;
        setMemoryItem('badal_mock_admin_settings', parsed);
      }
      return parsed;
    }
    try {
      return await dbCircuitBreaker.execute(async () => {
        const snap = await getDoc(doc(db, 'admin_settings', 'global_config'));
        if (snap.exists()) {
          const data = snap.data() as AdminSettings;
          if (data.rewarded_ads_required === 2) {
            data.rewarded_ads_required = 3;
            try {
              await setDoc(doc(db, 'admin_settings', 'global_config'), data);
            } catch (e) {}
          }
          return data;
        }
        await setDoc(doc(db, 'admin_settings', 'global_config'), defaultConfig);
        return defaultConfig;
      }, () => {
        console.warn("Circuit Breaker triggered for queryAdminSettings! Serving default config.");
        return defaultConfig;
      });
    } catch (err) {
      return defaultConfig;
    }
  },

  async updateAdminSettings(settings: Partial<AdminSettings>): Promise<void> {
    const adminId = await this.getCurrentUserId();
    const updates = {
      ...settings,
      last_updated_at: new Date().toISOString(),
      last_updated_by: adminId
    };

    if (isMockMode) {
      const curr = await this.queryAdminSettings();
      const updated = { ...curr, ...updates };
      setMemoryItem('badal_mock_admin_settings', updated);
      return;
    }
    try {
      await setDoc(doc(db, 'admin_settings', 'global_config'), updates, { merge: true });
    } catch (e) {
      console.error(e);
    }
  },

  async submitFeedback(feedbackData: { type: string; subject: string; message: string; imageUrl: string; deviceInfo?: string }): Promise<void> {
    const userId = await this.getCurrentUserId();
    const profile = await this.getUserProfile(userId);
    const email = auth.currentUser?.email || profile?.email || 'vegro09@gmail.com';
    const username = profile?.display_name || profile?.username || 'مستخدم بَدِل';
    const feedbackId = generateId();
    
    const feedback: any = {
      id: feedbackId,
      userId,
      username,
      email,
      type: feedbackData.type,
      subject: feedbackData.subject,
      message: feedbackData.message,
      imageUrl: feedbackData.imageUrl || '',
      status: 'pending',
      createdAt: isMockMode ? new Date().toISOString() : serverTimestamp(),
      ...(feedbackData.deviceInfo ? { deviceInfo: feedbackData.deviceInfo } : {})
    };

    if (isMockMode) {
      const list = getMockCollection<any[]>('badal_mock_feedbacks');
      list.push(feedback);
      writeMockCollection('badal_mock_feedbacks', list);
      return;
    }

    try {
      await setDoc(doc(db, 'feedback', feedbackId), feedback);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `feedback/${feedbackId}`);
    }
  },

  async getFeedbacks(): Promise<any[]> {
    if (isMockMode) {
      return getMockCollection<any[]>('badal_mock_feedbacks');
    }
    try {
      const snap = await getDocs(collection(db, 'feedback'));
      return snap.docs.map(doc => {
        const data = doc.data();
        let createdAt = data.createdAt;
        if (createdAt && typeof createdAt.toDate === 'function') {
          createdAt = createdAt.toDate().toISOString();
        }
        return {
          ...data,
          id: doc.id,
          createdAt
        };
      });
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async updateFeedbackStatus(feedbackId: string, status: 'pending' | 'under_review' | 'resolved' | 'rejected'): Promise<void> {
    if (isMockMode) {
      const list = getMockCollection<any[]>('badal_mock_feedbacks');
      const idx = list.findIndex(f => f.id === feedbackId);
      if (idx !== -1) {
        list[idx].status = status;
        writeMockCollection('badal_mock_feedbacks', list);
      }
      return;
    }
    try {
      await updateDoc(doc(db, 'feedback', feedbackId), { status });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `feedback/${feedbackId}`);
    }
  },

  async uploadFeedbackImage(file: File): Promise<string> {
    let optimizedBase64 = '';
    let optimizedBlob: Blob | null = null;
    try {
      const opt = await compressImageToWebP(file, 0.6, 800, 800);
      optimizedBase64 = opt.base64;
      optimizedBlob = opt.blob;
      console.log(`[BADDIL Feedback Image Optimizer] WebP Size: ${opt.sizeInKb.toFixed(1)} KB (Target: <500KB)`);
    } catch (err) {
      console.warn("[BADDIL Feedback Image Optimizer] Compression failed, using original", err);
    }

    const getBase64 = (f: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Error processing uploaded image'));
          }
        };
        reader.onerror = () => {
          reject(new Error('Failed to read image file'));
        };
        reader.readAsDataURL(f);
      });
    };

    if (isMockMode) {
      if (optimizedBase64) return optimizedBase64;
      return getBase64(file);
    }

    try {
      const uid = await this.getCurrentUserId();
      const fileId = generateId();
      const fileName = `${file.name.substring(0, file.name.lastIndexOf('.')) || file.name}.webp`;
      const storageRef = ref(storage, `feedback/${uid}/${fileId}-${fileName}`);
      
      const uploadPromise = (async () => {
        const dataToUpload = optimizedBlob || file;
        const snapshot = await uploadBytes(storageRef, dataToUpload);
        return await getDownloadURL(snapshot.ref);
      })();

      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 3500);
      });

      return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (e: any) {
      console.warn("Firebase storage feedback upload failed or timed out. Falling back to Base64 representation:", e);
      try {
        if (optimizedBase64) return optimizedBase64;
        return await getBase64(file);
      } catch (err) {
        throw new Error(`Error uploading feedback image: ${e.message || String(e)}`);
      }
    }
  },

  async ensurePhysicalDatabaseSeeded(): Promise<void> {
    if (isMockMode) return;
    try {
      // 1. Check if we already have listings
      const qResult = query(collection(db, 'listings'), limit(1));
      const listingsSnap = await getDocs(qResult);
      if (!listingsSnap.empty) {
        console.log("[Badal Storage] Physical database already has listings. Skipping seeding.");
        return;
      }

      console.log("[Badal Storage] Physical database is empty. Starting automatic seeding...");

      // 2. Seed Admin Settings
      const adminSettingsRef = doc(db, 'admin_settings', 'global_config');
      await setDoc(adminSettingsRef, DEFAULT_INITIALIZERS['badal_mock_admin_settings']);
      console.log("[Badal Storage] Physical admin settings seeded.");

      // 3. Seed Profiles
      for (const [uid, profile] of Object.entries(INITIAL_PROFILES)) {
        await setDoc(doc(db, 'profiles', uid), profile);
      }
      console.log("[Badal Storage] Physical profiles seeded.");

      // 4. Seed Listings
      for (const listing of INITIAL_LISTINGS) {
        await setDoc(doc(db, 'listings', listing.id), listing);
      }
      console.log("[Badal Storage] Physical listings seeded.");

      // 5. Seed Ratings
      for (const rating of DEFAULT_INITIALIZERS['badal_mock_ratings']) {
        await setDoc(doc(db, 'user_ratings', rating.id), rating);
      }
      console.log("[Badal Storage] Physical ratings seeded.");

      console.log("[Badal Storage] Physical database successfully seeded with initial demo data!");
    } catch (err) {
      console.warn("[Badal Storage] Automatic physical database seeding failed:", err);
    }
  }
};

