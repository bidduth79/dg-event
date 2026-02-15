import React from 'react';
import { DomainEvent } from '../domain/Event';
import { EventStatus } from '../../core/config/constants';
import { useSettings } from '../../state/SettingsContext';
import { formatTime, isSameDay } from '../../core/time/timeUtils';

interface ScheduleViewProps {
  events: DomainEvent[];
  viewDate: Date;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ events }) => {
  const { blinkEnabled } = useSettings();

  const eventsByDate: { [key: string]: DomainEvent[] } = {};
  
  const sortedEvents = [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  sortedEvents.forEach(event => {
    const d = new Date(event.startAt);
    const key = d.toDateString(); 
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(event);
  });

  const dates = Object.keys(eventsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  if (dates.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm bg-black h-full">
        No events in this range.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-black px-4 py-6 text-gray-300">
      <div className="max-w-4xl mx-auto space-y-8">
         {dates.map(dateStr => {
            const date = new Date(dateStr);
            const dateEvents = eventsByDate[dateStr];
            const isToday = isSameDay(date, new Date());

            return (
               <div key={dateStr} className="flex gap-6">
                  {/* Date Column */}
                  <div className="w-24 flex-shrink-0 pt-1 text-right">
                     <div className={`text-xs font-medium uppercase mb-0.5 ${isToday ? 'text-blue-400' : 'text-gray-500'}`}>
                        {date.toLocaleString('en-US', { weekday: 'short' })}
                     </div>
                     <div className={`text-2xl font-normal ${isToday ? 'text-blue-400' : 'text-gray-300'}`}>
                        {date.getDate()}
                     </div>
                  </div>

                  {/* Events Column */}
                  <div className="flex-1 space-y-4 pt-1 border-t border-gray-800 w-full">
                     {dateEvents.map(event => {
                        const isExpired = event.status === EventStatus.EXPIRED;
                        const blinkClass = isExpired && blinkEnabled ? 'animate-pulse' : '';
                        
                        return (
                           <div key={event.id} className={`flex items-start gap-4 group ${blinkClass}`}>
                              {/* Dot / Color Indicator */}
                              <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${event.isAllDay ? 'bg-green-600' : 'bg-blue-500'}`}></div>
                              
                              <div className="flex-1">
                                 <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500 w-24 flex-shrink-0">
                                       {event.isAllDay ? 'All day' : `${formatTime(event.startAt)} - ${formatTime(event.endAt)}`}
                                    </span>
                                    <span className="text-sm font-medium text-gray-300">{event.title}</span>
                                 </div>
                                 {event.location && (
                                    <div className="text-xs text-gray-600 ml-28 mt-0.5">{event.location}</div>
                                 )}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            );
         })}
      </div>
    </div>
  );
};

export default ScheduleView;