export interface Profile {
  id: string;
  display_name: string;
  profile_image_url?: string;
  username: string; // e.g. public badge or user code
  country?: string;
  governorate?: string;
  city?: string;
  approximate_latitude?: number;
  approximate_longitude?: number;
  bio?: string;
  average_rating: number;
  ratings_count: number;
  active_listings_count: number;
  completed_exchanges_count: number;
  created_at: string;
  updated_at: string;
  role?: 'user' | 'moderator' | 'admin' | 'super_admin';
  status?: 'active' | 'suspended' | 'banned' | 'deleted';
  suspension_reason?: string;
  suspension_until?: string;
  admin_notes?: string;
  email_visible?: string; // Visible only to admins
  
  // Legal & privacy consensus tracking properties
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
}

export type ListingCondition = 'جديد' | 'شبه جديد' | 'مستعمل بحالة جيدة' | 'مستعمل' | 'يحتاج صيانة';

export interface Listing {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  condition: ListingCondition;
  country: string;
  governorate: string;
  city: string;
  approximate_latitude?: number;
  approximate_longitude?: number;
  images: string[];
  videos: string[];
  desired_exchange: string;
  exchange_preferences?: string;
  status: 'active' | 'exchanged' | 'inactive';
  is_active: boolean;
  is_boosted: boolean;
  boosted_until?: string;
  exchanged_at?: string;
  exchanged_with_user_id?: string;
  created_at: string;
  updated_at: string;

  // Listing policy publication tracking
  listingPolicyConfirmed?: boolean;
  listingPolicyConfirmedAt?: string;
  listingPolicyVersion?: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
}

export interface Chat {
  id: string;
  participantIds: string[];
  participantInfo: Record<string, {
    display_name: string;
    profile_image_url?: string;
    username: string;
  }>;
  listingId?: string;
  listingTitle?: string;
  listingImage?: string;
  lastMessage?: string;
  lastMessageType?: string;
  lastMessageSenderId?: string;
  lastMessageAt?: any;
  createdAt: any;
  updatedAt: any;
  unreadCounts?: Record<string, number>;

  // Compatibility properties
  listing_id: string;
  participant_one_id: string;
  participant_two_id: string;
  last_message?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'voice'
  | 'location'
  | 'listing_reference'
  | 'exchange_confirmation_request'
  | 'exchange_confirmation_result'
  | 'exchange_details_request'
  | 'exchange_details_response'
  | 'rating_request'
  | 'system_message';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  type: string;
  text: string;
  createdAt: any;
  updatedAt: any;
  deliveredAt?: any;
  readAt?: any;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  deletedForEveryone?: boolean;
  edited?: boolean;

  // Compatibility properties
  chat_id: string;
  sender_id: string;
  message_type: MessageType;
  text_content?: string;
  media_url?: string;
  thumbnail_url?: string;
  audio_url?: string;
  audio_duration?: number;
  latitude?: number;
  longitude?: number;
  listing_id?: string;
  exchange_id?: string;
  metadata?: Record<string, any>;
  delivery_status?: 'sending' | 'sent' | 'read';
  created_at: string;
}

export interface ListingBoost {
  id: string;
  listing_id: string;
  user_id: string;
  ads_watched_count: number; // 0, 1, or 2
  status: 'pending' | 'active' | 'expired';
  boost_started_at?: string;
  boosted_until?: string;
  created_at: string;
  updated_at: string;
}

export interface Exchange {
  id: string;
  listing_id: string;
  owner_id: string;
  exchanged_with_user_id: string;
  status: 'pending' | 'completed' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface ExchangeDetails {
  id: string;
  exchange_id: string;
  submitted_by_user_id: string;
  description?: string;
  image_urls: string[];
  skipped: boolean;
  created_at: string;
}

export interface UserRating {
  id: string;
  exchange_id: string;
  listing_id: string;
  reviewer_user_id: string;
  reviewed_user_id: string;
  rating_value: number; // 1 to 5
  review_text?: string;
  created_at: string;
}

export function formatUserCode(code?: string, fallbackId?: string): string {
  if (code && /^k:\d{6}$/.test(code)) return code;
  if (!fallbackId) return 'k:000000';
  let hash = 0;
  for (let i = 0; i < fallbackId.length; i++) {
    hash = fallbackId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const numeric = (Math.abs(hash) % 999999) + 1;
  return `k:${String(numeric).padStart(6, '0')}`;
}

export function isListingBoosted(listing: Listing): boolean {
  if (!listing.is_boosted || !listing.boosted_until) return false;
  if (!listing.is_active || listing.status !== 'active') return false;
  return new Date(listing.boosted_until).getTime() > Date.now();
}

export interface AppReport {
  id: string;
  reporter_user_id: string;
  target_type: 'listing' | 'user' | 'chat_message' | 'rating' | 'exchange';
  target_id: string;
  reason: 'fraud_or_scam' | 'inappropriate' | 'fake' | 'incorrect_description' | 'prohibited' | 'harassment' | 'spam' | 'impersonation' | 'other';
  description: string;
  evidence_urls: string[];
  status: 'open' | 'under_review' | 'resolved' | 'rejected' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_admin_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  old_data?: any;
  new_data?: any;
  reason: string;
  created_at: string;
  ip_address?: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  attachments: string[];
  status: 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_admin_id?: string;
  created_at: string;
  updated_at: string;
  replies?: {
    id: string;
    sender_id: string;
    sender_name: string;
    message: string;
    created_at: string;
  }[];
}

export interface SystemAnnouncement {
  id: string;
  title_ar: string;
  title_en: string;
  message_ar: string;
  message_en: string;
  audience: 'all' | 'country' | 'city' | 'specific_user' | 'listing_owners' | 'pending_exchanges';
  audience_filter?: string; // e.g. egypt, jo-amman-1, specific uid
  start_at: string;
  end_at: string;
  status: 'active' | 'scheduled' | 'expired' | 'draft';
  created_by: string;
  created_at: string;
}

export interface AdminSettings {
  id: string; // e.g., 'global_config'
  app_name: string;
  support_email: string;
  privacy_policy_url: string;
  terms_of_use_url: string;
  maintenance_mode: boolean;
  max_media_count: number;
  max_image_size_kb: number;
  max_video_size_kb: number;
  boost_duration_hours: number;
  rewarded_ads_required: number;
  enabled_languages: string[];
  default_language: string;
  last_updated_at: string;
  last_updated_by: string;
}

export interface FeedbackSubmission {
  id: string;
  userId: string;
  username: string;
  email: string;
  type: string; // 'complaint' | 'suggestion' | 'bug' | 'feature_request' | 'improvement'
  subject: string;
  message: string;
  imageUrl: string;
  status: 'pending' | 'under_review' | 'resolved' | 'rejected';
  createdAt: any;
  deviceInfo?: string;
}



