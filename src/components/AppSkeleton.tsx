import React from 'react';

export const HeaderSkeleton: React.FC = () => {
  return (
    <div className="w-full bg-white dark:bg-[#151d30] border-b border-slate-100 dark:border-slate-800/80 py-3 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand logo skeleton */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="hidden sm:block space-y-1.5">
            <div className="w-20 h-4 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="w-28 h-2.5 rounded-md bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          </div>
        </div>

        {/* Search bar skeleton */}
        <div className="flex-1 max-w-md h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />

        {/* Actions skeleton */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          <div className="w-24 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse hidden md:block" />
        </div>
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-[#1b2438] rounded-2xl p-3 border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
      <div>
        {/* Image placeholder */}
        <div className="w-full aspect-[4/5] rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse mb-3" />
        {/* Title placeholder */}
        <div className="w-3/4 h-4 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse mb-2" />
        {/* Location placeholder */}
        <div className="w-1/2 h-3 rounded-md bg-slate-100 dark:bg-slate-800/60 animate-pulse mb-3" />
      </div>
      {/* Footer exchange desired tag placeholder */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800/50">
        <div className="w-16 h-3 rounded-md bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
        <div className="w-20 h-3.5 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    </div>
  );
};

export const ListingDetailsSkeleton: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse" dir="rtl">
      {/* Image Gallery Skeleton */}
      <div className="w-full aspect-[16/9] sm:aspect-[21/9] rounded-3xl bg-slate-200 dark:bg-slate-800" />
      
      {/* Info Header */}
      <div className="bg-white dark:bg-[#1b2438] rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2 w-2/3">
            <div className="h-6 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-1/2 rounded-md bg-slate-100 dark:bg-slate-800/60" />
          </div>
          <div className="h-10 w-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-800/60" />
          </div>
          <div className="h-10 w-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
};

export const ChatRoomSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-80px)] bg-slate-50 dark:bg-[#0f172a] animate-pulse" dir="rtl">
      {/* Top Bar Skeleton */}
      <div className="bg-white dark:bg-[#151d30] p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-1">
            <div className="w-28 h-4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="w-16 h-3 rounded bg-slate-100 dark:bg-slate-800/60" />
          </div>
        </div>
      </div>

      {/* Messages List Skeleton */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        <div className="flex gap-2 max-w-[70%]">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="w-48 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="flex gap-2 max-w-[70%] mr-auto flex-row-reverse">
          <div className="w-48 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60" />
        </div>
        <div className="flex gap-2 max-w-[70%]">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="w-64 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* Input Bar Skeleton */}
      <div className="p-3 bg-white dark:bg-[#151d30] border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <div className="flex-1 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
};

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse" dir="rtl">
      {/* Profile Header Card Skeleton */}
      <div className="bg-white dark:bg-[#1b2438] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
        <div className="space-y-3 text-center sm:text-right flex-1">
          <div className="w-40 h-6 mx-auto sm:mx-0 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="w-28 h-4 mx-auto sm:mx-0 rounded-md bg-slate-100 dark:bg-slate-800/60" />
          <div className="flex gap-2 justify-center sm:justify-start">
            <div className="w-20 h-7 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="w-24 h-7 rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-[#1b2438] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-2">
            <div className="w-10 h-6 mx-auto rounded bg-slate-200 dark:bg-slate-800" />
            <div className="w-16 h-3 mx-auto rounded bg-slate-100 dark:bg-slate-800/60" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const AppSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] flex flex-col font-sans transition-colors" dir="rtl">
      {/* Header Skeleton */}
      <HeaderSkeleton />

      {/* Main Content Layout Simulation */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 space-y-6">
        {/* Hero / Banner Skeleton */}
        <div className="w-full h-36 sm:h-44 rounded-3xl bg-slate-200 dark:bg-slate-800/80 animate-pulse p-6 flex flex-col justify-between">
          <div className="space-y-2 max-w-md">
            <div className="w-2/3 h-5 rounded-lg bg-slate-300 dark:bg-slate-700 animate-pulse" />
            <div className="w-1/2 h-3.5 rounded-lg bg-slate-300/70 dark:bg-slate-700/70 animate-pulse" />
          </div>
          <div className="w-28 h-9 rounded-xl bg-slate-300 dark:bg-slate-700 animate-pulse" />
        </div>

        {/* Categories Bar Skeleton */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-9 px-5 rounded-full bg-slate-200 dark:bg-slate-800/80 animate-pulse shrink-0"
              style={{ width: `${60 + (i % 3) * 20}px` }}
            />
          ))}
        </div>

        {/* Section Title Skeleton */}
        <div className="flex items-center justify-between pt-2">
          <div className="w-36 h-5 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="w-16 h-4 rounded-md bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
        </div>

        {/* Card Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <CardSkeleton key={n} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default AppSkeleton;

