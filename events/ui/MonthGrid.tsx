import React from 'react';
import { DomainEvent } from '../domain/Event';
import { EventStatus } from '../../core/config/constants';
import { useSettings } from '../../state/SettingsContext';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, formatTime } from '../../core/time/timeUtils';

interface MonthGridProps {
  events: DomainEvent[];
  viewDate: Date;
}

const MonthGrid: React.FC<MonthGridProps> = ({ events, viewDate }) => {
  const { blinkEnabled } = useSettings();

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getEventsForDay = (date: Date) => {
    return events.filter(e => {
       const start = new Date(e.startAt);
       const end = new Date(e.endAt);
       start.setHours(0,0,0,0);
       end.setHours(23,59,59,999);
       
       const target = new Date(date);
       target.setHours(12,0,0,0);
       
       return target >= start && target <= end;
    });
  };

  const getEventClass = (event: DomainEvent) => {
    const isExpired = event.status === EventStatus.EXPIRED;
    const blinkClass = isExpired && blinkEnabled ? 'animate-pulse' : '';
    
    return `text-[10px] px-1.5 py-0.5 rounded truncate mb-0.5 font-medium ${
      event.isAllDay 
        ? 'bg-green-800 text-green-100' 
        : 'text-gray-300 hover:bg-gray-800' 
    } ${blinkClass}`;
  };

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="flex flex-col h-full bg-transparent text-gray-300">
      {/* Header Days */}
      <div className="grid grid-cols-7 border-b border-gray-800 flex-none">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-rows-5 md:grid-rows-5 lg:grid-rows-6">
        {weeks.map((week, wIndex) => (
          <div key={wIndex} className="grid grid-cols-7 border-b border-gray-800 min-h-0">
             {week.map((date, dIndex) => {
               const isCurrentMonth = date.getMonth() === monthStart.getMonth();
               const isToday = isSameDay(date, new Date());
               const dayEvents = getEventsForDay(date);

               return (
                 <div key={dIndex} className={`border-r border-gray-800 relative p-1 overflow-hidden flex flex-col ${!isCurrentMonth ? 'bg-gray-900/40' : 'bg-transparent'}`}>
                    <div className="text-center mb-1">
                       <span className={`text-xs font-medium inline-block w-6 h-6 leading-6 rounded-full ${isToday ? 'bg-blue-600 text-white' : (isCurrentMonth ? 'text-gray-300' : 'text-gray-600')}`}>
                         {date.getDate()}
                         {date.getDate() === 1 && <span className="ml-1 font-normal">{date.toLocaleString('default', { month: 'short' })}</span>}
                       </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5">
                       {dayEvents.slice(0, 5).map(event => (
                         <div key={event.id} className={getEventClass(event)}>
                            {!event.isAllDay && <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${event.status === EventStatus.ONGOING ? 'bg-green-500' : 'bg-blue-500'}`}></span>}
                            {!event.isAllDay && <span className="mr-1">{formatTime(event.startAt)}</span>}
                            {event.title}
                         </div>
                       ))}
                       {dayEvents.length > 5 && (
                         <div className="text-[10px] text-gray-500 pl-1 font-medium hover:bg-gray-800 cursor-pointer rounded">
                           {dayEvents.length - 5} more
                         </div>
                       )}
                    </div>
                 </div>
               );
             })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthGrid;