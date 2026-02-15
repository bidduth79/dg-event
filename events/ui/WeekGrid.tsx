import React from 'react';
import { DomainEvent } from '../domain/Event';
import { EventStatus } from '../../core/config/constants';
import { useSettings } from '../../state/SettingsContext';
import { startOfWeek, addDays, isSameDay, formatTime } from '../../core/time/timeUtils';

interface WeekGridProps {
  events: DomainEvent[];
  viewDate: Date;
  daysToShow?: number; // 7 for week, 4 for 4-day view
}

const WeekGrid: React.FC<WeekGridProps> = ({ events, viewDate, daysToShow = 7 }) => {
  const { blinkEnabled } = useSettings();

  const startDate = daysToShow === 7 ? startOfWeek(viewDate) : new Date(viewDate);
  const weekDays = Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));

  const rangeStart = weekDays[0];
  const rangeEnd = new Date(weekDays[weekDays.length - 1]);
  rangeEnd.setHours(23, 59, 59, 999);

  const isEventInRange = (e: DomainEvent) => {
    const eStart = new Date(e.startAt);
    const eEnd = new Date(e.endAt);
    return eEnd >= rangeStart && eStart <= rangeEnd;
  };

  const visibleEvents = events.filter(isEventInRange);
  const allDayEvents = visibleEvents.filter(e => e.isAllDay);
  const timedEvents = visibleEvents.filter(e => !e.isAllDay);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const PIXELS_PER_HOUR = 60;

  const getAllDayStyle = (event: DomainEvent) => {
    const start = new Date(event.startAt) < rangeStart ? rangeStart : new Date(event.startAt);
    const end = new Date(event.endAt) > rangeEnd ? rangeEnd : new Date(event.endAt);
    const diffTime = start.getTime() - startDate.getTime();
    const startDayIndex = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
    const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const left = Math.max(0, startDayIndex);
    const width = Math.min(daysToShow - left, durationDays);

    return {
      left: `${(left / daysToShow) * 100}%`,
      width: `${(width / daysToShow) * 100}%`,
    };
  };

  const getTimedEventStyle = (event: DomainEvent) => {
    const start = new Date(event.startAt);
    const end = new Date(event.endAt);
    const diffTime = start.getTime() - startDate.getTime();
    const dayIndex = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (dayIndex < 0 || dayIndex >= daysToShow) return null;

    const startHour = start.getHours();
    const startMin = start.getMinutes();
    const top = (startHour * 60 + startMin) * (PIXELS_PER_HOUR / 60);
    const durationMs = end.getTime() - start.getTime();
    const durationMins = durationMs / (1000 * 60);
    const height = Math.max(durationMins * (PIXELS_PER_HOUR / 60), 20);

    return {
      top: `${top}px`,
      height: `${height}px`,
      left: `${(dayIndex / daysToShow) * 100}%`,
      width: `${(1 / daysToShow) * 100}%`,
    };
  };

  const getEventColorClass = (event: DomainEvent) => {
     const isExpired = event.status === EventStatus.EXPIRED;
     const blinkClass = isExpired && blinkEnabled ? 'animate-pulse' : '';
     
     if (event.status === EventStatus.ONGOING) return `bg-green-900/50 border-green-500 text-green-100 ${blinkClass}`;
     if (isExpired) return `bg-red-900/40 border-red-500 text-red-200 opacity-80 ${blinkClass}`;
     return 'bg-blue-900/40 border-blue-500 text-blue-100'; 
  };
  
  const getAllDayColorClass = (event: DomainEvent) => {
     const isExpired = event.status === EventStatus.EXPIRED;
     const blinkClass = isExpired && blinkEnabled ? 'animate-pulse' : '';
     return `bg-green-800 text-green-100 border-green-700 ${blinkClass}`;
  };

  return (
    <div className="flex flex-col h-full bg-black text-gray-300 overflow-hidden">
      
      {/* HEADER: Days of Week */}
      <div className="flex border-b border-gray-800 flex-none ml-16">
        {weekDays.map((date, i) => {
           const isToday = isSameDay(date, new Date());
           return (
             <div key={i} className={`flex-1 text-center py-2 border-l border-gray-800 ${isToday ? 'text-blue-400' : 'text-gray-400'}`}>
                <div className="text-xs uppercase font-medium">{date.toLocaleString('en-US', { weekday: 'short' })}</div>
                <div className={`text-2xl font-normal rounded-full w-10 h-10 flex items-center justify-center mx-auto ${isToday ? 'bg-blue-600 text-white' : ''}`}>
                  {date.getDate()}
                </div>
             </div>
           );
        })}
      </div>

      {/* ALL DAY SECTION */}
      <div className="flex border-b border-gray-800 flex-none bg-black z-10 shadow-sm relative">
         <div className="w-16 flex-shrink-0 border-r border-gray-800 p-2 text-xs text-gray-500 text-right pt-3 bg-black">
            GMT+06
         </div>
         
         <div className="flex-1 relative" style={{ maxHeight: '140px', minHeight: '30px', overflowY: 'auto' }}>
            <div className="absolute inset-0 flex h-full pointer-events-none">
              {weekDays.map((_, i) => (
                <div key={i} className="flex-1 border-l border-gray-800 h-full"></div>
              ))}
            </div>

            <div className="py-1 relative min-h-[24px]">
               {allDayEvents.map(event => {
                  const style = getAllDayStyle(event);
                  return (
                    <div 
                      key={event.id}
                      className={`absolute px-1 py-0.5 m-0.5 text-xs rounded truncate font-medium cursor-pointer ${getAllDayColorClass(event)}`}
                      style={{ 
                        ...style, 
                        top: 'auto', 
                        position: 'relative', 
                        marginBottom: '2px'
                      }}
                    >
                      {event.title}
                    </div>
                  );
               })}
            </div>
         </div>
      </div>

      {/* TIME GRID */}
      <div className="flex-1 overflow-y-auto relative w-full custom-scrollbar">
         <div className="relative min-h-[1440px]"> 
            {hours.map(hour => (
              <div key={hour} className="flex h-[60px] relative">
                 <div className="w-16 flex-shrink-0 border-r border-gray-800 text-right pr-2 text-xs text-gray-500 -mt-2 bg-black sticky left-0 z-20">
                    {hour === 0 ? '' : `${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`}
                 </div>
                 <div className="flex-1 border-t border-gray-800 relative">
                    <div className="absolute inset-0 flex">
                        {weekDays.map((_, i) => (
                           <div key={i} className="flex-1 border-l border-gray-800 h-full"></div>
                        ))}
                    </div>
                 </div>
              </div>
            ))}

            <div className="absolute top-0 left-16 right-0 bottom-0 pointer-events-none z-10">
               {timedEvents.map(event => {
                 const style = getTimedEventStyle(event);
                 if (!style) return null;
                 return (
                   <div 
                     key={event.id}
                     style={style}
                     className={`absolute rounded-md border-l-4 p-1 overflow-hidden text-xs cursor-pointer shadow-sm pointer-events-auto transition-all hover:z-30 hover:shadow-md ${getEventColorClass(event)}`}
                   >
                     <div className="font-bold truncate">{event.title}</div>
                     <div className="truncate opacity-90">{formatTime(event.startAt)}</div>
                   </div>
                 );
               })}
            </div>
         </div>
      </div>
    </div>
  );
};

export default WeekGrid;