import React from 'react';
import { DomainEvent } from '../../../events/domain/Event';
import { formatTime, formatDate, isSameDay } from '../../../core/time/timeUtils';

interface UpcomingEventsListProps {
  events: DomainEvent[];
}

const UpcomingEventsList: React.FC<UpcomingEventsListProps> = ({ events }) => {
  return (
    <div className="flex-[3] flex flex-col min-h-0">
      <h2 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
         Upcoming
      </h2>
      
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
         {events.length > 0 ? (
           events.map((event) => {
             const isToday = isSameDay(new Date(event.startAt), new Date());
             return (
               <div key={event.id} className="bg-gray-900 border border-gray-800 p-5 rounded-xl flex items-center gap-6 hover:border-gray-700 transition-colors">
                  <div className="flex flex-col items-center justify-center w-28 flex-shrink-0 border-r border-gray-800 pr-4">
                     <span className="text-blue-400 font-bold text-lg md:text-xl text-center">
                       {event.isAllDay ? 'All Day' : formatTime(event.startAt)}
                     </span>
                     <span className={`text-xs mt-1 font-medium ${isToday ? 'text-gray-500' : 'text-yellow-500'}`}>
                       {isToday ? 'Today' : formatDate(event.startAt).split(',')[0]}
                     </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                     <h3 className="text-2xl font-semibold text-gray-200 truncate">{event.title}</h3>
                     <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>Ends {formatTime(event.endAt)}</span>
                        {event.location && (
                          <span className="flex items-center gap-1 truncate">
                            📍 {event.location}
                          </span>
                        )}
                     </div>
                  </div>

                  {event.isAllDay && (
                    <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded text-xs uppercase font-bold tracking-wider">All Day</span>
                  )}
               </div>
             );
           })
         ) : (
           <div className="h-32 flex items-center justify-center border border-dashed border-gray-800 rounded-xl text-gray-600">
              No upcoming events.
           </div>
         )}
      </div>
    </div>
  );
};

export default React.memo(UpcomingEventsList);