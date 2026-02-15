import React from 'react';
import { DomainEvent } from '../domain/Event';
import { EventStatus } from '../../core/config/constants';
import { formatTime, formatDate } from '../../core/time/timeUtils';
import { useSettings } from '../../state/SettingsContext';

interface EventRowProps {
  event: DomainEvent;
}

const EventRow: React.FC<EventRowProps> = ({ event }) => {
  const { blinkEnabled } = useSettings();
  const isExpired = event.status === EventStatus.EXPIRED;
  const isOngoing = event.status === EventStatus.ONGOING;

  // Blinking Logic: Apply 'animate-pulse' if expired and setting is enabled
  const blinkClass = isExpired && blinkEnabled ? 'animate-pulse' : '';

  // Status Styling
  let statusBadgeClass = 'bg-gray-700 text-gray-300';
  let rowBorderClass = 'border-gray-800';
  let textClass = 'text-gray-100';

  if (isOngoing) {
    statusBadgeClass = 'bg-green-900 text-green-200 border border-green-700';
    rowBorderClass = 'border-green-900/50 bg-green-900/10';
  } else if (isExpired) {
    statusBadgeClass = 'bg-red-900/80 text-red-200 border border-red-800';
    rowBorderClass = 'border-red-900/30 bg-red-900/5';
    textClass = 'text-gray-400'; // Muted text for expired
  } else {
    // Upcoming
    statusBadgeClass = 'bg-blue-900/50 text-blue-200 border border-blue-800';
  }

  return (
    <div className={`p-4 mb-3 rounded-lg border ${rowBorderClass} transition-all duration-300 ${blinkClass}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className={`font-semibold text-lg ${textClass} mb-1`}>
            {event.title}
          </h3>
          
          <div className="flex items-center text-sm text-gray-500 space-x-3">
             <span className={`${isOngoing ? 'text-green-400 font-bold' : ''}`}>
               {event.isAllDay ? 'All Day' : `${formatTime(event.startAt)} - ${formatTime(event.endAt)}`}
             </span>
             <span>|</span>
             <span>{formatDate(event.startAt)}</span>
          </div>

          {event.location && (
            <p className="text-xs text-gray-600 mt-1 truncate max-w-md">
              📍 {event.location}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end space-y-2">
          <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${statusBadgeClass}`}>
            {event.status}
          </span>
          {isExpired && blinkEnabled && (
             <span className="text-[10px] text-red-400 font-mono animate-none">EXPIRED</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(EventRow);