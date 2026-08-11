import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { 
  ChevronRight, 
  Send, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Mic, 
  MapPin, 
  Map, 
  Check, 
  CheckCheck, 
  Sparkles, 
  Play, 
  Pause, 
  Star, 
  Loader2, 
  AlertCircle,
  X,
  Paperclip
} from 'lucide-react';
import { Chat, Message, Listing, Profile, MessageType } from '../types';
import { dbService, generateId } from '../db/dbService';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from './LanguageContext';

interface ChatRoomPageProps {
  chatId: string;
  onBack: () => void;
  onOpenListing: (id: string) => void;
}

export default function ChatRoomPage({ chatId, onBack, onOpenListing }: ChatRoomPageProps) {
  const { language, t, translateCategory } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [limitCount, setLimitCount] = useState(30);
  const [processingExchangeId, setProcessingExchangeId] = useState<string | null>(null);
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  // Media attachments triggers
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  // Helper to compress image on client-side using Canvas
  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          // 0.5 quality JPEGs are highly light and clear (usually 15KB - 40KB)
          const compressed = canvas.toDataURL('image/jpeg', 0.5);
          resolve(compressed);
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  // Mic and audio state/refs to support true voice recording + playing fallbacks
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDurationState, setAudioDurationState] = useState<number>(0);

  // Geographic picker overlay state
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showExchangeConfirmModal, setShowExchangeConfirmModal] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Exchange & details response flows
  const [exchangeDetailsText, setExchangeDetailsText] = useState('');
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Unified Secure Exchange document attachment & rating states
  const [exchangePhotoFile, setExchangePhotoFile] = useState<File | null>(null);
  const [exchangePhotoPreview, setExchangePhotoPreview] = useState<string>('');
  const [isUploadingExchangePhoto, setIsUploadingExchangePhoto] = useState(false);
  const [exchangeRatingValue, setExchangeRatingValue] = useState<number>(5);
  const [exchangeRatingReview, setExchangeRatingReview] = useState<string>('');

  // Audio elements map
  const [playingAudios, setPlayingAudios] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsubscribeChats = () => {};
    let unsubscribeMessages = () => {};
    let active = true;

    async function initRoom() {
      setLoading(true);
      try {
        const uid = await dbService.getCurrentUserId();
        if (!active) return;
        setCurrentUserId(uid);

        // Reset unread counts and mark messages as read
        await dbService.resetUnreadCount(chatId, uid);
        await dbService.markMessagesAsRead(chatId, uid);

        // Fetch chat details directly first to support direct links / page refreshes
        const directChat = await dbService.getConversationDetails(chatId);
        if (directChat) {
          setChat(directChat);
          const otherUserId = directChat.participant_one_id === uid 
            ? directChat.participant_two_id 
            : directChat.participant_one_id;
          
          const [profile, listDetails] = await Promise.all([
            dbService.getUserProfile(otherUserId),
            dbService.getListingDetails(directChat.listing_id)
          ]);
          if (!active) return;
          setOtherUser(profile);
          setListing(listDetails);
        }

        // Fetch chats
        unsubscribeChats = dbService.subscribeToChats(async (chats) => {
          if (!active) return;
          const matched = chats.find(c => c.id === chatId);
          if (matched) {
            setChat(matched);
            const otherUserId = matched.participant_one_id === uid 
              ? matched.participant_two_id 
              : matched.participant_one_id;
            
            const [profile, listDetails] = await Promise.all([
              dbService.getUserProfile(otherUserId),
              dbService.getListingDetails(matched.listing_id)
            ]);
            if (!active) return;
            setOtherUser(profile);
            setListing(listDetails);
          }
        });

        // Subscribe to actual real-time messages sync
        unsubscribeMessages = dbService.subscribeToMessages(chatId, limitCount, (msgs) => {
          if (!active) return;
          setMessages(msgs);

          // Mark new messages read & reset unread mapping
          dbService.markMessagesAsRead(chatId, uid).catch(() => {});
          dbService.resetUnreadCount(chatId, uid).catch(() => {});

          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 150);
        });

      } catch (e) {
        console.error("Initiate room fail", e);
      } finally {
        if (active) setLoading(false);
      }
    }
    
    initRoom();

    return () => {
      active = false;
      unsubscribeChats();
      unsubscribeMessages();
    };
  }, [chatId, limitCount]);

  // Automatic sync of listing status if owner loads completed exchange
  useEffect(() => {
    if (!listing || !currentUserId || listing.owner_id !== currentUserId || listing.status === 'exchanged') {
      return;
    }
    
    async function syncListingStatus() {
      try {
        const exchangeId = `exchange_${listing?.id}`;
        const exRecord = await dbService.getExchange(exchangeId);
        if (exRecord && exRecord.status === 'completed') {
          // Sync database status
          await dbService.updateListing(listing!.id, {
            status: 'exchanged',
            is_active: false,
            exchanged_at: new Date().toISOString(),
            exchanged_with_user_id: exRecord.exchanged_with_user_id
          });
          // Sync client-side state
          setListing(prev => prev ? { 
            ...prev, 
            status: 'exchanged', 
            is_active: false, 
            exchanged_at: new Date().toISOString(),
            exchanged_with_user_id: exRecord.exchanged_with_user_id
          } : null);
        }
      } catch (err) {
        console.warn("Auto-sync listing status failed", err);
      }
    }
    
    syncListingStatus();
  }, [listing?.id, listing?.status, currentUserId]);

  // Handle inputs
  const handleSendText = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText || inputText.trim().length === 0) return;

    const textPayload = inputText;
    setInputText('');

    try {
      await dbService.sendMessage(chatId, textPayload, 'text');
    } catch (err) {
      console.error("Text send fail", err);
    }
  };

  // Convert and send Image attachment
  const handleImageSend = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttaching(true);
    setAttachmentError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const rawBase64 = reader.result as string;
        // Compress the image before sending to stay well under Firestore's 1MB limit
        const compressedBase64 = await compressImage(rawBase64);

        await dbService.sendMessage(chatId, language === 'ar' ? "أرسل صورة" : "Sent a photo", 'image', {
          media_url: compressedBase64,
          thumbnail_url: compressedBase64
        });
      } catch (err: any) {
        console.error("Image attachment send error", err);
        setAttachmentError(
          language === 'ar'
            ? "عذراً، فشل إرسال الصورة. يرجى التأكد من اتصال الإنترنت وحجم الملف."
            : "Failed to send image. Please check your connection and image size."
        );
      } finally {
        setAttaching(false);
      }
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Convert and send Video attachment
  const handleVideoSend = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentError(null);

    // Support video file sizes up to 150MB securely!
    const MAX_VIDEO_SIZE = 150 * 1024 * 1024; 
    if (file.size > MAX_VIDEO_SIZE) {
      setAttachmentError(
        language === 'ar'
          ? "حجم الفيديو كبير جداً (الحد الأقصى المسموح به هو 150 ميجابايت)."
          : "Video file is too large (maximum allowed size is 150MB)."
      );
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    setAttaching(true);
    try {
      // Leverage the new uploadChatFile tool which stores files in Firebase Storage natively to bypass all 1MB document limit constraints
      const mediaUrl = await dbService.uploadChatFile(chatId, file);
      await dbService.sendMessage(chatId, language === 'ar' ? "أرسل مقطع فيديو" : "Sent a video", 'video', {
        media_url: mediaUrl
      });
    } catch (err: any) {
      console.error("Video attachment send error", err);
      setAttachmentError(
        language === 'ar'
          ? "حدث خطأ أثناء إرسال الفيديو. يرجى التأكد من اتصال الإنترنت أو تجربة ملف آخر."
          : "Error sending video. Please check your connection or try another files."
      );
    } finally {
      setAttaching(false);
    }
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // Real Web Audio + MediaRecorder voice recording engine with instant sandboxing fallback
  const startRecordingVoice = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("UserMedia not supported");
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (e: any) {
      console.warn("Secure Mic access refused or blocked in iframe sandbox. Initializing premium audio simulation fallback mode.", e);
      // Soft simulation fallback: start the interface timer anyway so the user can easily test the button flow!
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopAndSendVoice = async (cancel = false) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    const duration = recordingSeconds || 3;
    setRecordingSeconds(0);
    setIsRecording(false);

    if (cancel) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        // stop tracks
        try {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        } catch (err) {}
      }
      return;
    }

    setAttaching(true);

    // If real mediaRecorder was active, stop it and let its onstop callback save the message
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64Url = reader.result as string;
              await dbService.sendMessage(chatId, language === 'ar' ? "رسالة صوتية" : "Voice Message", 'voice', {
                media_url: base64Url,
                audio_duration: duration
              });
            } catch (err) {
              console.error("Failed to upload voice base64 message", err);
            } finally {
              setAttaching(false);
            }
          };
          reader.readAsDataURL(audioBlob);
          
          // stop all tracks to free microphone red icon in browser header
          mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.error("Audio conversion failed, falling back to simulated note", e);
          saveSimulatedVoiceNote(duration);
        }
      };

      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        saveSimulatedVoiceNote(duration);
      }
    } else {
      // Simulation mode fallback (used inside iframe blocks)
      saveSimulatedVoiceNote(duration);
    }
  };

  const saveSimulatedVoiceNote = async (duration: number) => {
    try {
      await dbService.sendMessage(chatId, language === 'ar' ? "رسالة صوتية" : "Voice Message", 'voice', {
        audio_url: 'mock_audio_stream',
        audio_duration: duration
      });
    } catch (err) {
      console.error("Voice simulation save fail", err);
    } finally {
      setAttaching(false);
    }
  };

  // Dedicated Play / Pause logic for chat list messages
  const playVoiceMessage = (msgId: string, audioUrlOrBase64: string) => {
    if (playingMessageId === msgId) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      setPlayingMessageId(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    // fallback playable track if it is a simulated note
    const src = (audioUrlOrBase64 && audioUrlOrBase64.startsWith('data:audio'))
      ? audioUrlOrBase64
      : 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

    try {
      const audio = new Audio(src);
      activeAudioRef.current = audio;
      setPlayingMessageId(msgId);
      setAudioCurrentTime(0);
      setAudioDurationState(0);

      const updateProgress = () => {
        setAudioCurrentTime(audio.currentTime);
      };
      const updateDuration = () => {
        setAudioDurationState(audio.duration || 0);
      };
      const finishAudio = () => {
        setPlayingMessageId(null);
        setAudioCurrentTime(0);
      };

      audio.addEventListener('timeupdate', updateProgress);
      audio.addEventListener('loadedmetadata', updateDuration);
      audio.addEventListener('ended', finishAudio);

      audio.play().catch((playErr) => {
        console.warn("Autoplay block or audio element render error", playErr);
        // Try fallback to standard SoundHelix if base64 play fails
        if (src !== 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3') {
          const fbAudio = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
          activeAudioRef.current = fbAudio;
          
          const updateFbProgress = () => {
            setAudioCurrentTime(fbAudio.currentTime);
          };
          const updateFbDuration = () => {
            setAudioDurationState(fbAudio.duration || 0);
          };
          const finishFbAudio = () => {
            setPlayingMessageId(null);
            setAudioCurrentTime(0);
          };

          fbAudio.addEventListener('timeupdate', updateFbProgress);
          fbAudio.addEventListener('loadedmetadata', updateFbDuration);
          fbAudio.addEventListener('ended', finishFbAudio);

          fbAudio.play().catch(() => {});
        } else {
          setPlayingMessageId(null);
        }
      });
    } catch (err) {
      console.error("Audio setup error", err);
      setPlayingMessageId(null);
    }
  };

  // Sends location message containing coordinates and/or textual address info safely
  const sendLocationMessage = async (addressDesc?: string, lat?: number, lng?: number) => {
    setShowLocationPicker(false);
    setAttaching(true);
    try {
      const isArabic = language === 'ar';
      const defaultText = addressDesc || (isArabic ? "موقع جغرافي مشترك" : "Shared location");
      // Use standard Saudi central coordinates as default fallback if only descriptive text is given
      const finalLat = lat !== undefined ? lat : 24.7136;
      const finalLng = lng !== undefined ? lng : 46.6753;

      await dbService.sendMessage(chatId, defaultText, 'location', {
        latitude: finalLat,
        longitude: finalLng,
        address: addressDesc || (isArabic ? "الموقع الجغرافي الفعلي" : "Current GPS coordinates")
      } as any);
    } catch (err) {
      console.error("Error sending location message", err);
    } finally {
      setAttaching(false);
    }
  };

  // Shares current approximate GPS location. Opens the location picker modal directly so they can obtain the actual live location.
  const sendCurrentLocation = () => {
    setShowLocationPicker(true);
  };

  // Barter Owner triggers confirmation request
  const requestExchangeConfirmation = () => {
    if (!listing || hasPendingOrCompletedExchange) return;
    setShowExchangeConfirmModal(true);
  };

  const executeExchangeConfirmation = async () => {
    if (!listing) return;
    setShowExchangeConfirmModal(false);

    try {
      const recipientId = otherUser?.id || 
        chat?.participantIds?.find(id => id !== currentUserId) ||
        (chat?.participant_one_id === currentUserId ? chat?.participant_two_id : chat?.participant_one_id);
      
      if (recipientId) {
        await dbService.requestExchange(listing.id, recipientId, chatId);
      } else {
        console.warn("Could not find recipient ID", chat, otherUser);
      }
    } catch (err) {
      console.error("Request exchanges error", err);
    }
  };

  // Recipient handles approve / reject
  const handleExchangeResponse = async (exchangeId: string, approved: boolean) => {
    if (!exchangeId) return;
    setProcessingExchangeId(exchangeId);
    setExchangeError(null);
    try {
      await dbService.respondToExchangeRequest(exchangeId, approved, chatId);
      
      // Reload listing details
      if (listing) {
        const refreshed = await dbService.getListingDetails(listing.id);
        setListing(refreshed);
      }
    } catch (err) {
      console.error("Respond exchanges error", err);
      setExchangeError(language === 'ar' ? 'عذراً، فشلت معالجة الطلب. يرجى المحاولة مرة أخرى.' : 'Failed to process request, please try again.');
    } finally {
      setProcessingExchangeId(null);
    }
  };

  // Details submitted post-exchange completion
  const handleDetailsSubmit = async (exchangeId: string, skipped: boolean) => {
    if (isUploadingExchangePhoto || isSubmittingRating) return;
    setIsUploadingExchangePhoto(true);
    setExchangeError(null);
    try {
      let uploadedUrls: string[] = [];
      if (!skipped && exchangePhotoFile) {
        const photoUrl = await dbService.uploadChatFile(chatId, exchangePhotoFile);
        uploadedUrls.push(photoUrl);
      }

      const descInput = skipped 
        ? (language === 'ar' ? "لا توجد تفاصيل مدرجة" : "No details provided") 
        : exchangeDetailsText;

      await dbService.submitExchangeDetails(
        exchangeId,
        descInput,
        uploadedUrls,
        skipped ? 5 : exchangeRatingValue,
        skipped ? "" : exchangeRatingReview,
        skipped,
        chatId
      );

      setExchangeDetailsText('');
      setExchangePhotoFile(null);
      setExchangePhotoPreview('');
      setExchangeRatingValue(5);
      setExchangeRatingReview('');
    } catch (e: any) {
      console.error("Exchange details submit fail", e);
      setExchangeError(
        language === 'ar'
          ? `فشل توثيق وتقييم المبادلة: ${e.message || 'حدث خطأ أثناء الاتصال بقاعدة البيانات. يرجى المحاولة لاحقاً.'}`
          : `Failed to document exchange: ${e.message || 'Database connection error. Please try again.'}`
      );
    } finally {
      setIsUploadingExchangePhoto(false);
    }
  };

  // Rating stars submit
  const handleRatingSubmit = async (exchangeId: string, skipped: boolean) => {
    if (!listing || !otherUser) return;
    if (isSubmittingRating || isUploadingExchangePhoto) return;
    setIsSubmittingRating(true);
    try {
      await dbService.submitRating(
        exchangeId,
        listing.id,
        otherUser.id,
        skipped ? 5 : ratingStars,
        ratingReview,
        chatId
      );
      setRatingReview('');
    } catch (err) {
      console.error("Rating submit err", err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 animate-pulse">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-sm">{language === 'ar' ? 'جاري فتح نافذة الدردشة الفورية للبائع والمقايض...' : 'Opening secure peer chat channel...'}</p>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 max-w-xl mx-auto bg-white border border-slate-150 rounded-3xl p-6 shadow-sm text-center">
        <AlertCircle className="h-10 w-10 text-rose-500 mb-4 mx-auto" />
        <p className="text-sm font-bold text-slate-800 mb-2">
          {language === 'ar' ? 'المحادثة غير موجودة' : 'Conversation not found'}
        </p>
        <p className="text-xs text-slate-400 mb-6">
          {language === 'ar' 
            ? 'عذراً، لم نتمكن من العثور على هذه المحادثة أو أنك لا تملك صلاحية الوصول إليها.' 
            : 'Sorry, we could not find this conversation or you do not have permission to access it.'}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-5 rounded-xl cursor-pointer transition-all"
        >
          {language === 'ar' ? 'العودة' : 'Go Back'}
        </button>
      </div>
    );
  }

  const isOwnerListing = listing?.owner_id === currentUserId;

  const hasPendingOrCompletedExchange = messages.some(m => 
    m.message_type === 'exchange_confirmation_request' || 
    m.message_type === 'exchange_details_request' ||
    m.message_type === 'exchange_details_response' ||
    (m.message_type === 'exchange_confirmation_result' && m.metadata?.result === 'approved')
  );

  return (
    <div className="w-full mx-auto flex flex-col h-screen h-[100dvh] bg-slate-50 overflow-hidden relative text-right">
      
      {/* Top Header info (RTL) */}
      <div className="bg-white border-b border-slate-100 p-3 sm:px-4 flex items-center justify-between flex-row-reverse shadow-sm z-10">
        <div className="flex items-center gap-3 flex-row-reverse">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-slate-50 rounded-full text-slate-500 cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* User profile details */}
          <div className="flex items-center gap-2 flex-row-reverse">
            <div className="h-9 w-9 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center overflow-hidden border border-emerald-100">
              {otherUser?.profile_image_url ? (
                <img src={otherUser.profile_image_url} alt="profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xs font-bold text-white font-sans">{otherUser?.display_name.slice(0, 2)}</span>
              )}
            </div>
            
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 leading-snug">
                {otherUser?.display_name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono leading-none">
                {otherUser?.average_rating} ★ · {language === 'ar' ? 'موثق' : 'Verified'}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Exchange state bar */}
        {listing && !isOwnerListing && listing.status === 'active' && (
          <span className="text-[10px] font-black text-rose-500 bg-rose-50 border border-rose-100 py-1.5 px-3 rounded-lg leading-none">
             {language === 'ar' ? 'مستلم المقايضة' : 'Barter Recipient'}
          </span>
        )}

        {listing && isOwnerListing && listing.status === 'active' && (
          <button
            disabled={hasPendingOrCompletedExchange}
            onClick={requestExchangeConfirmation}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs py-1.5 px-3.5 rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-sm"
          >
            <Check className="h-3.5 w-3.5" />
            <span>
              {hasPendingOrCompletedExchange 
                ? (language === 'ar' ? 'تم إرسال طلب التبادل' : 'Barter Request Sent')
                : (language === 'ar' ? 'تأكيد المبادلة' : 'Confirm Barter')}
            </span>
          </button>
        )}
      </div>

      {/* Item Context card displaying at the header */}
      {listing && (
        <div className="bg-slate-50 border-b border-slate-100 p-2 px-3 flex items-center justify-between flex-row-reverse bg-gradient-to-r from-emerald-500/5 to-teal-500/5 select-none text-[11px] leading-tight">
          <div className="flex items-center gap-2 flex-row-reverse">
            <img 
              src={listing.images[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'} 
              alt="" 
              className="h-8 w-8 rounded-lg object-cover" 
              referrerPolicy="no-referrer" 
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100';
              }}
            />
            <div className="text-right">
              <span className="font-bold text-slate-700 block truncate max-w-[150px]">{listing.title}</span>
              <span className="text-[9px] text-slate-400">{language === 'ar' ? `التصنيف: ${translateCategory(listing.category)}` : `Category: ${translateCategory(listing.category)}`}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onOpenListing(listing.id)}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-1 px-2.5 rounded-lg text-[10px] transition-all"
            >
              {language === 'ar' ? 'عرض الإعلان' : 'View Listing'}
            </button>
            {listing.status === 'exchanged' && (
              <span className="bg-amber-100 text-amber-900 font-bold py-1 px-2.5 rounded-lg text-[9px] block">{language === 'ar' ? 'تم التبادل' : 'Exchanged'}</span>
            )}
          </div>
        </div>
      )}

      {/* Messages stream scroller */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.length >= limitCount && (
          <div className="flex justify-center py-2 select-none">
            <button
              type="button"
              onClick={() => setLimitCount(prev => prev + 25)}
              style={{ minHeight: '36px' }}
              className="bg-emerald-50 hover:bg-emerald-100/90 text-emerald-800 border border-emerald-100 font-bold px-4 rounded-full text-xs transition-all shadow-sm cursor-pointer"
            >
              {language === 'ar' ? 'تحميل الرسائل السابقة...' : 'Load older messages...'}
            </button>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;

          {/* System information messages */}
          if (msg.message_type === 'system_message') {
            return (
              <div key={msg.id} className="text-center py-2 select-none">
                <span className="bg-slate-200/80 text-slate-700 text-[10px] font-semibold py-1 px-4 rounded-xl leading-normal">
                  {msg.text_content}
                </span>
              </div>
            );
          }

          {/* Core interactive Transaction confirmation widgets */}
          if (msg.message_type === 'exchange_confirmation_request') {
            const isReViewer = msg.sender_id !== currentUserId; // The recipient user can approve

            return (
              <div key={msg.id} className="max-w-[85%] mx-auto bg-white border border-emerald-100 p-4 rounded-2xl shadow-sm space-y-3 text-right">
                <div className="bg-emerald-50 text-emerald-900 text-[11px] font-bold py-1.5 px-3 rounded-xl flex items-center gap-2 flex-row-reverse leading-normal">
                  <Sparkles className="h-4 w-4 shrink-0 text-emerald-600 animate-spin" />
                  <span>{language === 'en' ? 'The item owner wants to confirm if the barter has completed successfully.' : 'يريد صاحب الإعلان تأكيد ما إذا كان التبادل قد انتهى بينكما بالفعل.'}</span>
                </div>
                
                {isReViewer ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-500 leading-normal">
                      {language === 'en' ? 'As the other trading partner, approving will officially document the exchange and change listing status to exchanged.' : 'بصفتك الطرف الآخر، الضغط على الموافقة سيقوم بالمصادقة الرسمية وتوثيق المبادلة في ممتلكاتك، وسيجعل الغرض مبادلاً تلقائياً.'}
                    </p>
                    {exchangeError && (
                      <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-2 rounded-xl text-center leading-normal">
                        {exchangeError}
                      </p>
                    )}
                    <div className="flex gap-2 font-sans">
                      <button
                        type="button"
                        disabled={processingExchangeId !== null}
                        onClick={() => handleExchangeResponse(msg.exchange_id || '', false)}
                        className={`flex-1 bg-slate-100 text-slate-700 font-semibold py-2 rounded-xl text-xs transition-colors ${
                          processingExchangeId !== null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200 cursor-pointer'
                        }`}
                      >
                        {processingExchangeId === msg.exchange_id ? (
                          <span className="flex items-center justify-center gap-1.5 flex-row-reverse">
                            <Loader2 className="h-3 w-3 animate-spin text-slate-600" />
                            <span>{language === 'en' ? 'Processing...' : 'جاري المعالجة...'}</span>
                          </span>
                        ) : (
                          language === 'en' ? 'Decline' : 'أرفض'
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={processingExchangeId !== null}
                        onClick={() => handleExchangeResponse(msg.exchange_id || '', true)}
                        className={`flex-1 bg-emerald-600 font-bold text-white py-2 rounded-xl text-xs transition-all ${
                          processingExchangeId !== null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700 shadow-sm cursor-pointer'
                        }`}
                      >
                        {processingExchangeId === msg.exchange_id ? (
                          <span className="flex items-center justify-center gap-1.5 flex-row-reverse">
                            <Loader2 className="h-3 w-3 animate-spin text-white" />
                            <span>{language === 'en' ? 'Approving...' : 'جاري التأكيد...'}</span>
                          </span>
                        ) : (
                          language === 'en' ? 'Agree to Barter' : 'أوافق على تمام المقايضة'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic text-center">{language === 'en' ? 'Waiting for the other party to approve barter...' : 'بانتظار موافقة الطرف الآخر على التبادل...'}</p>
                )}
              </div>
            );
          }

          {/* Exchange Result Bubble */}
          if (msg.message_type === 'exchange_confirmation_result') {
            const isApproved = msg.metadata?.result === 'approved';
            if (isApproved) return null; // Hide the approved message completely as requested!

            return (
              <div key={msg.id} className="max-w-[80%] mx-auto text-center py-2 select-none">
                <span className={`inline-block text-xs font-bold py-1.5 px-4 rounded-xl leading-normal ${
                  isApproved ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'
                }`}>
                  {isApproved 
                    ? (language === 'en' ? '🎉 Barter exchange completed successfully!' : '🎉 تمت مقايضة الغرض رسمياً وبنجاح!') 
                    : (language === 'en' ? '❌ Barter exchange confirmation request was declined.' : '❌ تم رفض طلب تأكيد المقايضة من قبل الطرف الآخر.')}
                </span>
              </div>
            );
          }

          {/* Exchange details descriptions overlay request */}
          if (msg.message_type === 'exchange_details_request') {
            const isRecipient = msg.sender_id !== currentUserId; // Only the counter party can submit what they gave
            
            const hasSubmittedThisDetails = messages.some(m => 
              m.message_type === 'exchange_details_response' && 
              m.sender_id === currentUserId && 
              m.exchange_id === msg.exchange_id
            );

            if (hasSubmittedThisDetails) {
              return (
                <div key={msg.id} className="max-w-[85%] mx-auto bg-white border border-emerald-100 p-5 rounded-3xl shadow-md text-center space-y-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <Check className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-emerald-800 font-sans leading-relaxed">
                    {language === 'en' 
                      ? '✓ Your rating and exchange details have been submitted successfully!' 
                      : '✓ تم تسجيل تقييمك وتفاصيل المقايضة بنجاح!'}
                  </p>
                </div>
              );
            }

            return (
              <div key={msg.id} className="max-w-[85%] mx-auto bg-white border border-emerald-200 p-5 rounded-3xl shadow-md space-y-4 text-right">
                <div className="flex items-center justify-between flex-row-reverse border-b border-slate-100 pb-2.5">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                    <span className="animate-pulse">●</span>
                    {language === 'en' ? 'Verified Swap Verification' : 'توثيق وتبادل معتمد ومضمون 🔒'}
                  </span>
                  <span className="text-[10px] text-slate-400">🛡️ {language === 'en' ? 'Step 2 of 2' : 'خطوة التوثيق النهائي'}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  {language === 'en' 
                    ? 'To finalize the exchange securely, please provide the purpose/details of the trade and rate your experience with this exchanger.' 
                    : 'لإكمال عملية التبادل بشكل آمن وموثق، يرجى تقديم الغرض من المقايضة وتفاصيل التبادل الفعلي، وترك تقييم لشريك المقايضة.'}
                </p>

                {isRecipient ? (
                  <div className="space-y-4 font-sans text-right">
                    
                    {/* Item Description block */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        {language === 'en' ? '1. Purpose/Details of the Trade:' : '١. الغرض من المقايضة أو تفاصيل التبادل:'}
                      </label>
                      <textarea
                        rows={2}
                        placeholder={language === 'en' ? 'Describe the purpose or details of the trade...' : 'اكتب الغرض من المقايضة أو تفاصيل التبادل هنا...'}
                        value={exchangeDetailsText}
                        onChange={(e) => setExchangeDetailsText(e.target.value)}
                        className="w-full text-right text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl py-2.5 px-3 outline-none"
                      />
                    </div>

                    {/* Exchanger Partner Rating Block */}
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        {language === 'en' ? '2. Rate Exchanger & Experience:' : '٢. تقييم شريك المقايضة وتعامله:'}
                      </label>
                      
                      <div className="flex gap-1.5 justify-center py-2 bg-slate-50 rounded-xl">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setExchangeRatingValue(s)}
                            className="p-1 cursor-pointer transition-transform hover:scale-115"
                          >
                            <Star 
                              className={`h-6 w-6 transition-all ${
                                exchangeRatingValue >= s ? 'fill-amber-400 text-amber-500 scale-105' : 'text-slate-300 hover:text-amber-300'
                              }`} 
                            />
                          </button>
                        ))}
                      </div>

                      <textarea
                        rows={1.5}
                        placeholder={language === 'en' ? 'Optional comments about credibility, fast delivery, polite behavior...' : 'تعليقات اختيارية حول مدى الصدق والالتزام بالوقت وحسن التجربة...'}
                        value={exchangeRatingReview}
                        onChange={(e) => setExchangeRatingReview(e.target.value)}
                        className="w-full text-right text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-500 rounded-xl py-2 px-3 outline-none"
                      />
                    </div>

                    {exchangeError && (
                      <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl text-center leading-normal">
                        {exchangeError}
                      </p>
                    )}

                    {/* Submit and Cancel Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleDetailsSubmit(msg.exchange_id || '', true)}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 font-semibold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                        disabled={isUploadingExchangePhoto}
                      >
                        {language === 'en' ? 'Skip Verification' : 'تخطي التوثيق'}
                      </button>
                      <button
                        type="button"
                        disabled={!exchangeDetailsText.trim() || isUploadingExchangePhoto}
                        onClick={() => handleDetailsSubmit(msg.exchange_id || '', false)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2 rounded-xl text-xs transition-transform flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                      >
                        {isUploadingExchangePhoto ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>{language === 'en' ? 'Uploading...' : 'جاري التوثيق...'}</span>
                          </>
                        ) : (
                          <span>{language === 'en' ? 'Verify & Finalize' : 'توثيق المبادلة رسمياً'}</span>
                        )}
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-500 mb-2" />
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {language === 'en' 
                        ? "Waiting for the other party to submit reciprocal documentation and feedback..." 
                        : 'بانتظار أن يقوم الطرف الآخر بتعبئة تقرير التوثيق والتقييم النهائي...'}
                    </p>
                  </div>
                )}
              </div>
            );
          }

          {/* Rating Request bubble */}
          if (msg.message_type === 'rating_request') {
            const isUserReviewer = msg.sender_id !== currentUserId; // Opponent reviews owner or owner reviews opponent

            return (
              <div key={msg.id} className="max-w-[85%] mx-auto bg-white border border-amber-100 p-4 rounded-2xl shadow-sm space-y-3.5 text-right">
                <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                  {language === 'en' ? 'Rate Partner' : 'تقييم شريكك'}
                </span>
                <p className="text-xs font-black text-slate-800 leading-normal">
                  {language === 'en' ? 'Please rate this user transaction during current barter to support platform security!' : 'يرجى تقييم معاملة هذا المستخدم خلال المقايضة الحالية لدعم أمان المنصة!'}
                </p>

                {isUserReviewer ? (
                  <div className="space-y-3 font-sans">
                    <div className="flex gap-1 justify-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          onClick={() => setRatingStars(s)}
                          className="p-1 cursor-pointer"
                        >
                          <Star 
                            className={`h-5 w-5 ${
                              ratingStars >= s ? 'fill-amber-500 text-amber-500' : 'text-slate-300'
                            }`} 
                          />
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      placeholder={language === 'en' ? 'Add a brief comment about credibility (optional)...' : 'أضف تعليقاً على سرعة التسليم والمصداقية (اختياري)...'}
                      value={ratingReview}
                      onChange={(e) => setRatingReview(e.target.value)}
                      className="w-full text-right text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-500 rounded-xl py-2 px-3 outline-none"
                    />

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={isSubmittingRating}
                        onClick={() => handleRatingSubmit(msg.exchange_id || '', true)}
                        className="flex-1 bg-slate-100 text-slate-500 font-semibold py-1.5 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {language === 'en' ? 'Skip' : 'تخطي'}
                      </button>
                      <button
                        type="button"
                        disabled={isSubmittingRating}
                        onClick={() => handleRatingSubmit(msg.exchange_id || '', false)}
                        className="flex-1 bg-amber-500 text-slate-900 font-bold py-1.5 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isSubmittingRating ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>{language === 'en' ? 'Submitting...' : 'جاري الإرسال...'}</span>
                          </>
                        ) : (
                          <span>{language === 'en' ? 'Submit' : 'إرسال التقييم'}</span>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic text-center">
                    {language === 'en' ? 'Rating forms enabled for both users' : 'نموذج التقييم مفعل لكلا الجانبين'}
                  </p>
                )}
              </div>
            );
          }


          {/* Normal dialog streams bubbles */}
          return (
            <div 
              key={msg.id} 
              className={`flex ${isMe ? 'justify-start' : 'justify-end'} text-right`}
            >
              {msg.message_type === 'voice' ? (
                /* Authentic WhatsApp-Style Voice Message Bubble */
                <div 
                  className={`max-w-[88%] sm:max-w-[75%] rounded-2xl p-3 shadow-xs flex items-center gap-3 border transition-all ${
                    isMe 
                      ? 'bg-[#d9fdd3] text-slate-800 border-[#c6e9cb] rounded-tl-none' 
                      : 'bg-white text-slate-800 border-slate-150 rounded-tr-none'
                  }`}
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                >
                  {/* Left part of the player: Play/Pause button */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => playVoiceMessage(msg.id, msg.media_url || (msg as any).audio_url)}
                      className="focus:outline-none block cursor-pointer"
                      title={playingMessageId === msg.id ? (language === 'ar' ? "إيقاف مؤقت" : "Pause") : (language === 'ar' ? "تشغيل" : "Play")}
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
                        isMe 
                          ? 'bg-slate-700/5 text-slate-700 hover:bg-slate-700/10' 
                          : 'bg-[#00a884] hover:bg-[#008f70] text-white shadow-xs'
                      }`}>
                        {playingMessageId === msg.id ? (
                          <Pause className="h-4.5 w-4.5" />
                        ) : (
                          <Play className="h-4.5 w-4.5 translate-x-0.5 fill-current" />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Middle part of the player: Custom interactive range slider timeline & metadata */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center w-full">
                      {/* Interactive sleek seek bar slider */}
                      <input
                        type="range"
                        min="0"
                        max={playingMessageId === msg.id ? audioDurationState || msg.audio_duration || 5 : msg.audio_duration || 5}
                        value={playingMessageId === msg.id ? audioCurrentTime : 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setAudioCurrentTime(val);
                          if (activeAudioRef.current && playingMessageId === msg.id) {
                            activeAudioRef.current.currentTime = val;
                          }
                        }}
                        disabled={playingMessageId !== msg.id}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00a884] focus:outline-none"
                        style={{
                          background: `linear-gradient(to right, #00a884 0%, #00a884 ${
                            playingMessageId === msg.id
                              ? ((audioCurrentTime / (audioDurationState || msg.audio_duration || 5)) * 100)
                              : 0
                          }%, #cbd5e1 ${
                            playingMessageId === msg.id
                              ? ((audioCurrentTime / (audioDurationState || msg.audio_duration || 5)) * 100)
                              : 0
                          }%, #cbd5e1 100%)`
                        }}
                      />
                    </div>

                    {/* Metadata: duration underneath seeking bar & status check ticks */}
                    <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400 font-medium">
                      <span className="font-mono text-[9px]">
                        {playingMessageId === msg.id ? (
                          `${Math.floor(audioCurrentTime / 60)}:${String(Math.floor(audioCurrentTime % 60)).padStart(2, '0')}`
                        ) : (
                          `00:${msg.audio_duration ? String(msg.audio_duration).padStart(2, '0') : '03'}`
                        )}
                      </span>

                      {/* Timestamp & read ticks icon */}
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[9px]">
                          {new Date(msg.created_at).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <CheckCheck 
                            className={`h-3.5 w-3.5 ${
                              msg.status === 'read' ? 'text-[#34b7f1]' : 'text-slate-400'
                            }`} 
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right part: WhatsApp typical Sender Avatar & standard Microphone Emblem overlaid indicator */}
                  <div className="relative shrink-0 select-none">
                    <div className="h-10 w-10 bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-200/50 rounded-full overflow-hidden flex items-center justify-center">
                      {isMe ? (
                        /* Current User display */
                        <span className="text-xs font-bold text-slate-500 font-sans">
                          {language === 'ar' ? 'أنا' : 'Me'}
                        </span>
                      ) : (
                        /* Partner display */
                        otherUser?.profile_image_url ? (
                          <img src={otherUser.profile_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-emerald-705 font-sans">
                            {otherUser?.display_name.slice(0, 2)}
                          </span>
                        )
                      )}
                    </div>
                    {/* Small microphone badge overlaid inside WhatsApp blue style bubble */}
                    <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center shadow-sm border ${
                      isMe 
                        ? 'bg-[#00a884] text-white border-[#d9fdd3]' 
                        : 'bg-[#34b7f1] text-white border-white'
                    }`}>
                      <Mic className="h-2.5 w-2.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm text-xs sm:text-sm ${
                  isMe 
                    ? 'bg-emerald-700 text-white rounded-tl-none' 
                    : 'bg-white text-slate-800 border border-slate-100 rounded-tr-none'
                }`}>
                  
                  {/* Text Messages content */}
                  {msg.message_type === 'text' && (
                    <p className="leading-relaxed whitespace-pre-line break-words text-right">
                      {msg.text_content}
                    </p>
                  )}

                  {/* Image message display */}
                  {msg.message_type === 'image' && msg.media_url && (
                    <div className="rounded-xl overflow-hidden mt-1 aspect-square bg-slate-100 max-w-[170px]">
                      <img src={msg.media_url} alt="attached images" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  {/* Video custom player bubble */}
                  {msg.message_type === 'video' && msg.media_url && (
                    <div className="rounded-xl overflow-hidden mt-1 aspect-video bg-black max-w-[200px] relative flex items-center justify-center p-1">
                      <video src={msg.media_url} controls className="w-full h-full object-contain" />
                    </div>
                  )}

                {/* Location pin shared bubble */}
                {msg.message_type === 'location' && (msg.latitude !== undefined || (msg as any).address) && (
                  <div className="space-y-2 text-right min-w-[150px]">
                    <div className="flex items-center gap-1 flex-row-reverse text-[10px] font-bold">
                      <MapPin className="h-4 w-4 shrink-0 text-amber-500 animate-bounce" />
                      <span>{language === 'ar' ? 'مربع الموقع المشترك' : 'Shared Location Box'}</span>
                    </div>
                    {((msg as any).address) && (
                      <p className="text-[11px] font-semibold leading-snug">
                        {(msg as any).address}
                      </p>
                    )}
                    {msg.latitude && msg.longitude && !((msg as any).address?.includes("GPS")) && (
                      <p className="text-[8px] font-mono leading-none text-slate-400">
                        {msg.latitude.toFixed(4)}°N, {msg.longitude?.toFixed(4)}°E
                      </p>
                    )}
                    <a
                      href={msg.latitude && msg.longitude && !((msg as any).address && !(msg as any).address.includes("GPS"))
                        ? `https://www.google.com/maps/search/?api=1&query=${msg.latitude},${msg.longitude}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((msg as any).address || `${msg.latitude},${msg.longitude}`)}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className={`block text-center py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all ${
                        isMe ? 'bg-white/20 hover:bg-white/35 text-white' : 'bg-slate-150 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      {language === 'en' ? 'Open in Google Maps' : 'فتح في خرائط جوجل'}
                    </a>
                  </div>
                )}

                {/* Optional response details message */}
                {msg.message_type === 'exchange_details_response' && (
                  <div className={`mt-2 rounded-2xl p-3.5 space-y-3 font-sans text-right max-w-sm ml-auto border ${
                    isMe 
                      ? 'bg-emerald-800/40 border-emerald-500/20 text-white' 
                      : 'bg-white border-slate-150 text-slate-800'
                  }`}>
                    {/* Header certificate badge */}
                    <div className="flex items-center justify-between flex-row-reverse border-b border-emerald-100 pb-2">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                        🛡️ {language === 'en' ? 'Verified Certificate' : 'وثيقة تبادل معتمدة'}
                      </span>
                      <span className={`text-[9px] font-mono ${isMe ? 'text-emerald-250' : 'text-[#34b7f1]'}`}>
                        ID: #{msg.exchange_id?.slice(9, 15) || 'verified'}
                      </span>
                    </div>

                    {/* Exchanged Item Photo (The Photo of the item exchanged!) */}
                    {msg.media_url && (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-150 shadow-inner">
                        <img 
                          src={msg.media_url} 
                          alt="Verified trade item" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* Description of the item exchanged */}
                    <div className="space-y-1">
                      <span className={`text-[9px] font-bold block ${isMe ? 'text-white/70' : 'text-slate-400'}`}>
                        {language === 'en' ? 'EXCHANGED ITEM:' : 'الغرض الذي تم تبادله:'}
                      </span>
                      <p className={`text-[11px] font-semibold leading-normal p-2 rounded-lg border italic ${
                        isMe ? 'bg-emerald-900/30 border-emerald-800/10 text-white' : 'bg-slate-50 border-slate-100 text-slate-800'
                      }`}>
                        {msg.metadata?.exchange_desc || msg.text_content || (language === 'en' ? 'Item details provided in record' : 'تم تسليم الغرض وتوثيقه بنجاح')}
                      </p>
                    </div>

                    {/* Rating and reviewer rating stars */}
                    {msg.metadata?.stars && (
                      <div className={`flex items-center justify-between flex-row-reverse p-2 rounded-lg border text-xs ${
                        isMe ? 'bg-amber-500/10 border-amber-500/20 text-white' : 'bg-amber-50/50 border-amber-100 text-slate-700'
                      }`}>
                        <div className="flex flex-col text-right">
                          <span className={`text-[9.5px] font-bold leading-none mb-1 ${isMe ? 'text-amber-400' : 'text-amber-800'}`}>
                            {language === 'en' ? 'PARTNER RATING:' : 'تقييم الشريك:'}
                          </span>
                          <span className={`text-[10px] max-w-[150px] truncate ${isMe ? 'text-amber-200/90' : 'text-slate-500'}`}>
                            {msg.metadata?.review || (language === 'en' ? 'No comments left' : 'بدون تعليق إضافي')}
                          </span>
                        </div>
                        <div className="flex gap-0.5 justify-end">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star 
                              key={s} 
                              className={`h-3.5 w-3.5 ${
                                msg.metadata?.stars >= s ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Timestamp and ticks check */}
                <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] leading-none ${
                    isMe ? 'text-white/70' : 'text-slate-400'
                  }`}
                >
                  <span className="font-mono">
                    {new Date(msg.created_at).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMe && (
                    <CheckCheck 
                      className={`h-3.5 w-3.5 ${
                        msg.status === 'read' ? 'text-[#34b7f1]' : 'text-white/70'
                      }`} 
                    />
                  )}
                </div>

              </div>
            )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar controls and microphones triggers */}
      <div className="bg-white border-t border-slate-150 p-2.5 sm:px-4 z-10 space-y-2">
        {attachmentError && (
          <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              <span>{attachmentError}</span>
            </div>
            <button 
              onClick={() => setAttachmentError(null)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {isRecording ? (
          /* Premium WhatsApp-Style Mobile Optimized Voice Recording Bar */
          <div className="flex items-center justify-between gap-3 bg-[#f0f2f5] p-2 rounded-full border border-slate-200/90 shadow-inner select-none font-sans" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            
            {/* Pulsing Dot, Timer Counter & Dynamic Recording Label */}
            <div className="flex items-center gap-3 px-3 min-w-0">
              {/* Dual-Stage Pulsing Recording Status Indicator */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                </span>
                <span className="text-xs font-bold text-rose-700 font-mono tracking-wider">
                  00:{String(recordingSeconds).padStart(2,'0')}
                </span>
              </div>
              
              {/* Responsive Text Label (removes extra words on small screens to fit mobile perfectly) */}
              <span className="text-xs text-slate-500 font-bold truncate max-w-[150px] sm:max-w-none">
                {language === 'ar' ? 'جاري تسجيل الصوت...' : 'Recording voice...'}
              </span>
            </div>
            
            {/* Highly Suitable Mobile Circular Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Cancel Trash Button */}
              <button
                type="button"
                onClick={() => stopAndSendVoice(true)}
                className="h-9 px-4 rounded-full flex items-center justify-center text-slate-500 hover:text-rose-650 hover:bg-rose-50 cursor-pointer text-xs font-black transition-all"
                title={language === 'ar' ? "إلغاء وتراجع" : "Cancel"}
              >
                <span>{language === 'ar' ? 'إلغاء' : 'Cancel'}</span>
              </button>

              {/* Send Button Circular Pill */}
              <button
                type="button"
                onClick={() => stopAndSendVoice(false)}
                className="h-10 w-10 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white flex items-center justify-center cursor-pointer shadow-md shadow-[#00a884]/15 hover:shadow-[#00a884]/30 transition-all active:scale-95 shrink-0"
                title={language === 'ar' ? "إرسال الصوت" : "Send Voice Note"}
              >
                <Send className="h-4.5 w-4.5 transform rotate-180 text-white" />
              </button>
            </div>

          </div>
        ) : (
          /* Normal inputs */
          <div className="flex items-center gap-2">
            
            {/* Left aligned send button */}
            <button
              onClick={() => handleSendText()}
              disabled={!inputText.trim()}
              className="p-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-100 text-white disabled:text-slate-300 rounded-2xl cursor-pointer shadow-md shadow-emerald-700/5 hover:shadow-emerald-700/15 transition-all outline-none shrink-0"
              title={language === 'ar' ? "إرسال" : "Send"}
            >
              <Send className="h-4.5 w-4.5 rotate-180" />
            </button>

            {/* Input texts bar fields */}
            <form 
              onSubmit={handleSendText}
              className="flex-1 relative"
            >
              <input
                type="text"
                placeholder={language === 'ar' ? "اكتب رسالتك لتمام المقايضة هنا..." : "Type your message to complete barter here..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full text-right bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500/10 rounded-2xl py-3 px-5 text-xs sm:text-sm text-slate-800 transition-all outline-none"
              />
            </form>

            {/* Quick Attachment trigger actions (RTL side aligns) */}
            <div className="flex items-center gap-1 shrink-0">
              
              {/* Mic trigger */}
              <button
                onClick={startRecordingVoice}
                className="p-2.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-50 rounded-xl border border-slate-100 cursor-pointer"
                title={language === 'ar' ? "تسجيل صوتي" : "Voice Note"}
              >
                <Mic className="h-4.5 w-4.5" />
              </button>

              {/* Combined "Send File" attachment trigger button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                    showAttachmentMenu 
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                      : 'text-slate-400 hover:text-emerald-700 hover:bg-slate-50 border-slate-100'
                  }`}
                  title={language === 'ar' ? "إرسال ملف" : "Send File"}
                >
                  <Paperclip className="h-4.5 w-4.5" />
                </button>

                {/* Animated Attachment dropdown popover */}
                <AnimatePresence>
                  {showAttachmentMenu && (
                    <>
                      {/* Invisible backdrop click handler to close menu */}
                      <div 
                        className="fixed inset-0 z-20 cursor-default" 
                        onClick={() => setShowAttachmentMenu(false)}
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute bottom-12 left-0 min-w-[170px] bg-white border border-slate-150 rounded-2xl shadow-xl p-2 z-35 flex flex-col gap-1 text-right"
                      >
                        {/* Option 1: Image attachment */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachmentMenu(false);
                            imageInputRef.current?.click();
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer w-full transition-colors flex-row-reverse text-right"
                        >
                          <div className="h-7 w-7 bg-sky-50 rounded-lg flex items-center justify-center text-sky-600 shrink-0">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                          <span>{language === 'ar' ? 'إرسال صورة' : 'Send Photo'}</span>
                        </button>

                        {/* Option 2: Video attachment */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachmentMenu(false);
                            videoInputRef.current?.click();
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer w-full transition-colors flex-row-reverse text-right"
                        >
                          <div className="h-7 w-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                            <VideoIcon className="h-4 w-4" />
                          </div>
                          <span>{language === 'ar' ? 'إرسال فيديو' : 'Send Video'}</span>
                        </button>

                        {/* Option 3: Location coordinate MapPin */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachmentMenu(false);
                            sendCurrentLocation();
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer w-full transition-colors flex-row-reverse text-right"
                        >
                          <div className="h-7 w-7 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <span>{language === 'ar' ? 'إرسال الموقع' : 'Send Location'}</span>
                        </button>

                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

            </div>

          </div>
        )}

        {/* Input elements (display none) files attachments */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSend}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoSend}
          className="hidden"
        />
      </div>

      {/* Beautiful Floating Location Picker Panel Overlay */}
      <AnimatePresence>
        {showLocationPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-right"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-100 flex flex-col gap-4 text-slate-800"
            >
              {/* Header */}
              <div className="flex items-center justify-between flex-row-reverse border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 flex-row-reverse">
                  <Map className="h-5 w-5 text-amber-500" />
                  <span>{language === 'ar' ? 'مشاركة الموقع الجغرافي 📍' : 'Share Current Location 📍'}</span>
                </h3>
                <button
                  onClick={() => {
                    setShowLocationPicker(false);
                    setCustomAddress('');
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Info Description */}
              <p className="text-[11px] leading-relaxed text-slate-500">
                {language === 'ar' 
                  ? 'يرجى الضغط على الزر أدناه لمشاركة إحداثيات موقعك الفعلي لتسهيل اللقاء وإتمام مبادلتك بنجاح.'
                  : 'Click the button below to retrieve your live device GPS parameters and share them directly within this conversation.'}
              </p>

              {/* Option: Live GPS button */}
              <button
                type="button"
                onClick={() => {
                  setAttaching(true);
                  if (!navigator.geolocation) {
                    alert(language === 'ar' ? "تحديد الموقع الجغرافي غير مدعوم في متصفحك." : "Geolocation is not supported in your browser.");
                    setAttaching(false);
                    return;
                  }

                  navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                      try {
                        await sendLocationMessage(
                          language === 'ar' ? "الموقع الجغرافي الفعلي (GPS) 📍" : "Current GPS coordinates 📍",
                          pos.coords.latitude,
                          pos.coords.longitude
                        );
                        setShowLocationPicker(false);
                      } catch (e) {
                        console.error("GPS coordinates dispatch fail", e);
                        alert(language === 'ar' ? "فشل إرسال إحداثيات الموقع." : "Failed to send coordinates.");
                      } finally {
                        setAttaching(false);
                      }
                    },
                    (err) => {
                      console.warn("GPS request rejected/blocked", err);
                      setAttaching(false);
                      alert(
                        language === 'ar' 
                          ? "لم نتمكن من الحصول على موقعك. يرجى تفعيل إذن الوصول للموقع الجغرافي في المتصفح أو فتح الرابط في نافذة جديدة." 
                          : "Could not request GPS location. Please allow location access or open the application in a new browser tab."
                      );
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                  );
                }}
                disabled={attaching}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                <MapPin className="h-4.5 w-4.5 text-white shrink-0 animate-pulse" />
                <span>
                  {attaching 
                    ? (language === 'ar' ? "جاري تحديد الموقع..." : "Fetching location...")
                    : (language === 'ar' ? "مشاركة موقعي الحالي عبر خرائط Google" : "Share My Current Location via Google Maps")
                  }
                </span>
              </button>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Beautiful Custom React Confirm Modal (Iframe Compatible) */}
      <AnimatePresence>
        {showExchangeConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-right"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 text-slate-800 font-sans"
            >
              {/* Icon & Title */}
              <div className="flex flex-col items-center justify-center text-center gap-2 border-b border-slate-100 pb-4">
                <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Sparkles className="h-6 w-6 animate-pulse" />
                </div>
                <h3 className="text-sm font-black text-slate-900 mt-2">
                  {language === 'ar' ? 'طلب تأكيد المبادلة 🔒' : 'Confirm Barter Request 🔒'}
                </h3>
                <p className="text-[11px] text-slate-500 leading-normal max-w-[260px] mx-auto">
                  {language === 'ar'
                    ? 'سيتم إرسال بطاقة توقيع تفاعلية إلى محادثة شريك المقايضة للموافقة الرسمية.'
                    : 'An interactive verification card will be sent directly to the chat room for review.'}
                </p>
              </div>

              {/* Middle item status card */}
              {listing && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center gap-3 flex-row-reverse text-right">
                  <img 
                    src={listing.images[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'} 
                    alt="" 
                    className="h-10 w-10 rounded-xl object-cover" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-slate-700 block truncate">{listing.title}</span>
                    <span className="text-[9px] text-emerald-600 font-semibold block">{language === 'ar' ? 'متاح للمقايضة' : 'Available for barter'}</span>
                  </div>
                </div>
              )}

              {/* Warning/Info disclaimer */}
              <p className="text-[10px] text-slate-400 leading-relaxed text-right">
                {language === 'ar'
                  ? 'بمجرد موافقة الطرف الآخر، سينتقل الإعلان لحالة "تم التبادل" وتبدأ عملية التوثيق والتقييم النهائية تلقائياً.'
                  : 'Once the other party accepts, the listing status shifts instantly and verification flow initiates.'}
              </p>

              {/* Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExchangeConfirmModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                  style={{ minHeight: '40px' }}
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={executeExchangeConfirmation}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-transform flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                  style={{ minHeight: '40px' }}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{language === 'ar' ? 'نعم، أرسل الطلب' : 'Yes, request'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
