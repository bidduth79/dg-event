import React from 'react';
import { useSettings } from '../../../state/SettingsContext';

const FlashMessageTicker: React.FC = () => {
  const { flashMessage } = useSettings();

  if (!flashMessage) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-yellow-400 text-black shadow-[0_-5px_20px_rgba(250,204,21,0.3)] border-t-4 border-yellow-600 overflow-hidden">
      <div className="flex items-center h-12 md:h-14">
        {/* Label Box */}
        <div className="bg-yellow-600 text-yellow-900 font-black text-xs md:text-sm px-4 h-full flex items-center justify-center uppercase tracking-wider z-10 shadow-lg shrink-0">
          Message
        </div>
        
        {/* Static Content */}
        <div className="flex-1 relative overflow-hidden h-full flex items-center justify-center">
            <div className="font-bold text-lg md:text-2xl px-4 w-full text-center whitespace-nowrap overflow-hidden text-ellipsis">
              {flashMessage}
            </div>
        </div>
        
        {/* Close hint (Optional, mainly for Boss to know it's there) */}
        <div className="pr-4 pl-2 text-yellow-800 opacity-50 shrink-0">
           <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
           </svg>
        </div>
      </div>
    </div>
  );
};

export default FlashMessageTicker;