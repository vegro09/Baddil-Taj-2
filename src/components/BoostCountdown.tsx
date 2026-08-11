import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from './LanguageContext';
import { dbService } from '../db/dbService';

interface BoostCountdownProps {
  boostedUntil?: string;
  ownerId: string;
  onExpired?: () => void;
  className?: string;
}

export default function BoostCountdown({ boostedUntil, ownerId, onExpired, className = "" }: BoostCountdownProps) {
  const { t, language } = useTranslation();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>(getRemainingTime());

  useEffect(() => {
    let active = true;
    dbService.getCurrentUserId().then(uid => {
      if (active) {
        setCurrentUserId(uid);
      }
    }).catch(err => {
      console.error("Failed to load current user ID inside BoostCountdown", err);
    });
    return () => {
      active = false;
    };
  }, []);

  function getRemainingTime() {
    if (!boostedUntil) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }
    const difference = new Date(boostedUntil).getTime() - Date.now();
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((difference / 1000 / 60) % 60);
    const seconds = Math.floor((difference / 1000) % 60);

    return { days, hours, minutes, seconds, isExpired: false };
  }

  useEffect(() => {
    // Initial check
    const initialTime = getRemainingTime();
    setTimeLeft(initialTime);
    if (initialTime.isExpired && onExpired) {
      onExpired();
    }

    let intervalId: any;
    if (boostedUntil && !initialTime.isExpired) {
      intervalId = setInterval(() => {
        const time = getRemainingTime();
        setTimeLeft(time);
        if (time.isExpired) {
          clearInterval(intervalId);
          if (onExpired) onExpired();
        }
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [boostedUntil]);

  if (!currentUserId || currentUserId !== ownerId) {
    return null;
  }

  if (timeLeft.isExpired) {
    return null;
  }

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  const totalHours = (timeLeft.days * 24) + timeLeft.hours;
  const formattedTime = `${formatNumber(totalHours)}:${formatNumber(timeLeft.minutes)}:${formatNumber(timeLeft.seconds)}`;

  return (
    <div className={`flex items-center gap-1.5 text-[10px] sm:text-xs font-mono font-medium ${className}`}>
      <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse shrink-0" />
      <span className="text-slate-500 font-sans">{t('details.boost_countdown')}:</span>
      <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-semibold border border-amber-200">
        {formattedTime}
      </span>
    </div>
  );
}
