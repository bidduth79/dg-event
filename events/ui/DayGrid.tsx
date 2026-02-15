import React from 'react';
import { DomainEvent } from '../domain/Event';
import { EventStatus } from '../../core/config/constants';
import { useSettings } from '../../state/SettingsContext';
import { isSameDay, formatTime } from '../../core/time/timeUtils';

interface DayGridProps {
  events: DomainEvent[];
  viewDate: Date;
}

const DayGrid: React.FC<DayGridProps> = ({ events, viewDate }) => {
  const { blinkEnabled } = useSettings();
  
  // Separate All-Day events from Timed events
  const allDayEvents = events.filter(e => e.isAllDay);
  const timedEvents = events.filter(e => !e.isAllDay);

  // Time slots (0 to 23 hours)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const PIXELS_PER_HOUR = 60;
  
  const getEventStyle = (event: DomainEvent) => {
    const start = new Date(event.startAt);
    const end = new Date(event.endAt);
    
    // Normalize to viewDate if spanning multiple days
    const startHour = start.getHours();
    const startMin = start.getMinutes();
    const top = (startHour * 60 + startMin) * (PIXELS_PER_HOUR / 60);
    
    const durationMs = end.getTime() - start.getTime();
    const durationMins = durationMs / (1000 * 60);
    const height = Math.max(durationMins * (PIXELS_PER_HOUR / 60), 20); // Min height 20px

    // Blink Logic
    const isExpired = event.status === EventStatus.EXPIRED;
    const blinkClass = isExpired && blinkEnabled ? 'animate-pulse' : '';
    
    return {
      style: {
        top: `${top}px`,
        height: `${height}px`,
        left: '0.5rem',
        right: '10px',
      },
      className: `absolute rounded border-l-4 p-1 overflow-hidden text-xs cursor-pointer shadow-sm transition-all hover:z-20 hover:shadow-md ${blinkClass} ${
        event.status === EventStatus.ONGOING 
          ? 'bg-green-900/50 border-green-500 text-green-100' // Darker Ongoing
          : isExpired
            ? 'bg-red-900/40 border-red-500 text-red-200' // Darker Expired
            : 'bg-blue-900/40 border-blue-500 text-blue-100' // Darker Upcoming
      }`
    };
  };

  const isToday = isSameDay(viewDate, new Date());

  return (
    <div className="flex flex-col h-full bg-transparent text-gray-300 overflow-hidden">
      
      {/* 1. Date Header */}
      <div className="flex border-b border-gray-800 flex-none ml-16">
          <div className={`flex-1 text-left pl-3 py-3 border-l border-gray-800 ${isToday ? 'text-blue-400' : 'text-gray-400'}`}>
            <span className="text-xs font-medium uppercase mr-1.5">{viewDate.toLocaleString('en-US', { weekday: 'short' })}</span>
            <span className={`text-2xl font-normal inline-flex items-center justify-center w-8 h-8 rounded-full ${isToday ? 'bg-blue-600 text-white' : ''}`}>
               {viewDate.getDate()}
            </span>
          </div>
      </div>

      {/* 2. All Day Section */}
      <div className="flex border-b border-gray-800 flex-none bg-transparent z-10 shadow-sm relative">
         <div className="w-16 flex-shrink-0 border-r border-gray-800 p-2 text-xs text-gray-500 text-right pt-2 bg-transparent">
            GMT+06
         </div>
         {/* Container for All Day Events */}
         <div 
           className="flex-1 p-1 space-y-1 overflow-y-auto custom-scrollbar" 
           style={{ maxHeight: '140px', minHeight: 'auto' }}
         >
           {/* Vertical line matching the grid */}
           <div className="absolute left-0 top-0 bottom-0 border-l border-gray-800 h-full pointer-events-none"></div>

           {allDayEvents.length === 0 && <div className="h-1"></div>}

           {allDayEvents.map(event => (
             <div 
               key={event.id}
               className={`text-xs px-2 py-1 rounded truncate font-medium relative z-10 border border-green-900/50 ${
                 event.status === EventStatus.EXPIRED && blinkEnabled ? 'animate-pulse' : ''
               } bg-green-800 text-green-100`}
             >
               {event.title}
             </div>
           ))}
         </div>
      </div>

      {/* 3. Main Time Grid */}
      <div className="flex-1 overflow-y-auto relative w-full custom-scrollbar">
         <div className="relative min-h-[1440px]"> 
            
            {/* Grid Lines & Labels */}
            {hours.map(hour => (
              <div key={hour} className="flex h-[60px] relative">
                 {/* Time Label */}
                 <div className="w-16 flex-shrink-0 border-r border-gray-800 text-right pr-2 text-xs text-gray-500 -mt-2.5 bg-transparent sticky left-0 z-20">
                    {hour === 0 ? '' : <span className="relative -top-1">{hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}</span>}
                 </div>
                 <div className="flex-1 border-t border-gray-800 relative">
                     {/* Vertical Day Line */}
                     <div className="absolute left-0 top-0 bottom-0 border-l border-gray-800 h-full"></div>
                 </div>
              </div>
            ))}

            {/* Events Overlay */}
            <div className="absolute top-0 left-16 right-0 bottom-0 pointer-events-none z-10">
              {timedEvents.map(event => {
                const { style, className } = getEventStyle(event);
                return (
                  <div 
                    key={event.id}
                    style={style}
                    className={`${className} pointer-events-auto`}
                    title={`${event.title} (${formatTime(event.startAt)})`}
                  >
                    <div className="font-medium truncate text-xs leading-tight">{event.title}</div>
                    <div className="truncate opacity-80 text-[10px]">
                      {formatTime(event.startAt)} - {formatTime(event.endAt)}
                    </div>
                  </div>
                );
              })}
            </div>
         </div>
      </div>
    </div>
  );
};

export default DayGrid;