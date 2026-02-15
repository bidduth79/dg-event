import React from 'react';
import { DomainEvent } from '../domain/Event';
import EventRow from './EventRow';

interface EventListProps {
  events: DomainEvent[];
  loading: boolean;
}

const EventList: React.FC<EventListProps> = ({ events, loading }) => {
  if (loading && events.length === 0) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-800 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No events found for the selected range.</p>
        <p className="text-sm mt-2">Make sure you have selected a calendar in Settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <EventRow key={`${event.calendarId}-${event.id}`} event={event} />
      ))}
    </div>
  );
};

export default EventList;