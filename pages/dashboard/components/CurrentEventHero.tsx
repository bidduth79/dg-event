import React, { useMemo, useState, useRef, useEffect } from 'react';
import { DomainEvent } from '../../../events/domain/Event';
import { formatTime } from '../../../core/time/timeUtils';
import { useSettings } from '../../../state/SettingsContext';

interface CurrentEventHeroProps {
  ongoingEvent: DomainEvent | undefined;
  nextEvent?: DomainEvent | undefined; // Optional next event
  remainingTime: string;
  isCritical: boolean;
  onExtend: (minutes: number) => void;
  onFinish: () => void;
  readOnly?: boolean;
}

const CurrentEventHero: React.FC<CurrentEventHeroProps> = ({ 
  ongoingEvent, 
  nextEvent,
  remainingTime, 
  isCritical, // Note: We will calculate precise timing locally for the 60s rule
  onExtend,
  onFinish,
  readOnly
}) => {
  const { blinkEnabled } = useSettings();
  
  // Dropdown State
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- TIME CALCULATION FOR STYLING ---
  // We calculate this on every render (triggered by parent's remainingTime update)
  const timeStatus = useMemo(() => {
    if (!ongoingEvent) return 'idle';

    const now = new Date().getTime();
    const end = new Date(ongoingEvent.endAt).getTime();
    const diffMs = end - now;
    const diffSec = diffMs / 1000;

    if (diffSec <= 0) return 'expired';
    if (diffSec <= 30) return 'danger'; // Last 30 seconds (Red)
    if (diffSec <= 60) return 'warning'; // 60s to 30s (Yellow)
    return 'normal';
  }, [ongoingEvent, remainingTime]); // Depend on remainingTime to force update

  // --- PROGRESS BAR LOGIC ---
  const progressPercentage = useMemo(() => {
    if (!ongoingEvent) return 0;
    const now = new Date().getTime();
    const start = new Date(ongoingEvent.startAt).getTime();
    const end = new Date(ongoingEvent.endAt).getTime();
    const totalDuration = end - start;
    const elapsed = now - start;
    
    let percent = (elapsed / totalDuration) * 100;
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;
    
    return percent;
  }, [ongoingEvent, remainingTime]);

  // Background Styles (Inner fill)
  const getHeroBackground = () => {
     if (!ongoingEvent) return 'bg-gray-900/30';
     
     // Animation class
     const pulseClass = blinkEnabled ? 'animate-pulse' : '';

     switch (timeStatus) {
        case 'expired':
            // Solid Red for expired
            return `bg-red-900 shadow-[0_0_30px_rgba(239,68,68,0.4)] ${pulseClass}`;
        case 'danger':
            // Red Blink (0-30s)
            return `bg-red-900/80 shadow-[0_0_30px_rgba(239,68,68,0.4)] ${pulseClass}`;
        case 'warning':
            // Yellow Blink (30-60s)
            return `bg-yellow-900/60 shadow-[0_0_30px_rgba(234,179,8,0.4)] ${pulseClass}`;
        default:
            // Normal Green
            return 'bg-green-900/20';
     }
  };

  const getHeroTextStyles = () => {
    if (!ongoingEvent) return 'text-gray-400';
    
    switch (timeStatus) {
        case 'expired':
        case 'danger':
            return 'text-white'; // White text on red background
        case 'warning':
            return 'text-yellow-200'; // Light yellow text on yellow background
        default:
            return 'text-green-400';
    }
  };

  // Border Color based on status
  const getBorderColor = () => {
    switch (timeStatus) {
        case 'expired':
        case 'danger':
            return '#EF4444'; // Red-500
        case 'warning':
            return '#EAB308'; // Yellow-500
        default:
            return '#22C55E'; // Green-500
    }
  };

  // Status Label Dot Color
  const getStatusDotClass = () => {
      if (blinkEnabled) {
          if (timeStatus === 'danger' || timeStatus === 'expired') return 'bg-red-500 animate-pulse';
          if (timeStatus === 'warning') return 'bg-yellow-500 animate-pulse';
      }
      return 'bg-green-500';
  };

  return (
    <div className="flex-[2] flex flex-col min-h-[220px]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-2 flex-shrink-0">
        
        {/* Left: Label */}
        <div className="flex items-center justify-between">
           <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              {ongoingEvent && <span className={`w-3 h-3 rounded-full ${getStatusDotClass()}`}></span>}
              {ongoingEvent ? (
                  timeStatus === 'danger' || timeStatus === 'expired' ? 'Critical Event' : 
                  timeStatus === 'warning' ? 'Ending Soon' : 'Current Event'
              ) : 'Status'}
           </h2>
           
           {/* Mobile-only Buttons */}
           {ongoingEvent && !readOnly && (
             <div className="flex md:hidden gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onFinish(); }}
                  className="bg-red-900/80 hover:bg-red-800 text-red-100 text-[10px] font-bold py-1.5 px-2.5 rounded border border-red-700 flex items-center gap-1"
                >
                  End
                </button>
                
                {/* Mobile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDropdownOpen(!isDropdownOpen); }}
                      className="bg-gray-800 hover:bg-gray-700 text-white text-[10px] font-bold py-1.5 px-2.5 rounded border border-gray-600 flex items-center gap-1"
                    >
                      Extend
                      <svg className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute top-full mt-1 right-0 bg-gray-900 border border-gray-700 rounded shadow-xl z-50 flex flex-col min-w-[100px] overflow-hidden">
                           {[2, 3, 5].map(min => (
                             <button
                                key={min}
                                onClick={(e) => { e.stopPropagation(); onExtend(min); setDropdownOpen(false); }}
                                className="px-3 py-2 text-left text-xs text-gray-200 hover:bg-gray-800 border-b border-gray-800 last:border-0"
                             >
                                +{min} Min
                             </button>
                           ))}
                        </div>
                    )}
                </div>
             </div>
           )}
        </div>

        {/* Right: Timer & Desktop Buttons */}
        <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4">
             {/* Timer Display */}
             {ongoingEvent && remainingTime && (
                <div className={`font-mono text-3xl md:text-4xl font-bold ${
                    timeStatus === 'danger' || timeStatus === 'expired' ? 'text-red-500' : 
                    timeStatus === 'warning' ? 'text-yellow-500' : 'text-blue-400'
                }`}>
                  {remainingTime}
                </div>
             )}

             {ongoingEvent && !readOnly && (
                <div className="hidden md:flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onFinish(); }}
                    className="bg-red-900/80 hover:bg-red-800 text-red-100 text-xs font-bold py-1.5 px-3 rounded border border-red-700 transition-colors flex items-center gap-1"
                    title="End event immediately"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    End Now
                  </button>

                  {/* Desktop Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDropdownOpen(!isDropdownOpen); }}
                        className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold py-1.5 px-3 rounded border border-gray-600 transition-colors flex items-center gap-1"
                        title="Extend event duration"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        Extend Time
                        <svg className={`w-3 h-3 ml-1 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      
                      {isDropdownOpen && (
                          <div className="absolute top-full mt-2 right-0 bg-gray-900 border border-gray-700 rounded shadow-xl z-50 flex flex-col min-w-[120px] overflow-hidden">
                             {[2, 3, 5].map(min => (
                               <button
                                  key={min}
                                  onClick={(e) => { e.stopPropagation(); onExtend(min); setDropdownOpen(false); }}
                                  className="px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-gray-800 border-b border-gray-800 last:border-0 hover:text-white transition-colors"
                               >
                                  +{min} Minutes
                               </button>
                             ))}
                          </div>
                      )}
                  </div>
                </div>
             )}
        </div>
      </div>
      
      {/* CARD CONTENT WITH BORDER PROGRESS */}
      <div className={`flex-1 rounded-2xl relative flex flex-col justify-center overflow-hidden transition-all duration-300 ${getHeroBackground()}`}>
        
        {/* BORDER PROGRESS OVERLAY */}
        {ongoingEvent ? (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
             {/* 1. Track (Gray background border) */}
             <rect 
               x="2" y="2" 
               width="calc(100% - 4px)" 
               height="calc(100% - 4px)" 
               rx="14" ry="14" 
               fill="none" 
               stroke="rgba(75, 85, 99, 0.4)" 
               strokeWidth="4"
             />
             
             {/* 2. Progress (Colored moving border) */}
             <rect 
               x="2" y="2" 
               width="calc(100% - 4px)" 
               height="calc(100% - 4px)" 
               rx="14" ry="14" 
               fill="none" 
               stroke={getBorderColor()} 
               strokeWidth="4"
               pathLength="100" 
               strokeDasharray="100"
               strokeDashoffset={100 - progressPercentage}
               strokeLinecap="round"
               className="transition-all duration-1000 ease-linear"
               style={{ transformOrigin: 'center', transform: 'rotate(-90deg) translateX(-100%)' }} 
             />
          </svg>
        ) : (
          /* Static border when no event */
          <div className="absolute inset-0 border border-gray-800 rounded-2xl pointer-events-none"></div>
        )}

        {/* Background Icon Decoration */}
        {ongoingEvent && (
             <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none z-0">
                <svg className={`w-48 h-48 md:w-64 md:h-64 ${
                    timeStatus === 'normal' ? 'text-green-500' : 
                    timeStatus === 'warning' ? 'text-yellow-500' : 'text-white'
                }`} fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z"></path></svg>
             </div>
        )}
             
        {/* Content */}
        <div className="relative z-10 p-6 md:p-8 w-full m-auto">
            {ongoingEvent ? (
              <div>
               <div className={`text-xl md:text-3xl font-medium mb-2 md:mb-3 ${getHeroTextStyles()}`}>
                 {formatTime(ongoingEvent.startAt)} - {formatTime(ongoingEvent.endAt)}
               </div>
               
               <h1 className="text-4xl md:text-7xl font-bold text-white leading-tight mb-4 md:mb-6 line-clamp-3">
                 {ongoingEvent.title}
               </h1>
               
               {ongoingEvent.location && (
                 <div className={`flex items-center text-lg md:text-2xl mt-2 md:mt-4 ${
                    timeStatus === 'warning' ? 'text-yellow-200' :
                    timeStatus === 'danger' || timeStatus === 'expired' ? 'text-red-200' : 'text-gray-300'
                 }`}>
                   <svg className="w-5 h-5 md:w-8 md:h-8 mr-2 md:mr-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                   </svg>
                   <span className="truncate">{ongoingEvent.location}</span>
                 </div>
               )}
             </div>
            ) : (
              <div className="text-center text-gray-500">
                 <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 text-gray-600">
                   <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 
                 {nextEvent ? (
                    <>
                      <p className="text-lg md:text-xl font-medium text-gray-300">Next: <span className="text-blue-400">{nextEvent.title}</span></p>
                      <p className="text-2xl md:text-4xl font-light mt-2 text-white">
                         Starts at {formatTime(nextEvent.startAt)}
                      </p>
                    </>
                 ) : (
                    <>
                      <p className="text-2xl md:text-3xl font-light">No event is currently running.</p>
                      <p className="text-base md:text-lg mt-2 opacity-60">Enjoy your free time!</p>
                    </>
                 )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(CurrentEventHero);