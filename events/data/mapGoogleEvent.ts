import { DomainEvent } from '../domain/Event';
import { calculateEventStatus } from '../../core/time/timeUtils';

// Partial type definition for what we expect from Google API
export interface GoogleEventResource {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  status?: string;
  location?: string;
  htmlLink?: string;
  colorId?: string;
}

export const mapGoogleEventToDomain = (rawEvent: GoogleEventResource, calendarId: string): DomainEvent | null => {
  // Filter cancelled events at mapper level if not filtered by API
  if (rawEvent.status === 'cancelled') {
    return null;
  }

  const isAllDay = !!rawEvent.start?.date;
  let startAt: string;
  let endAt: string;

  if (isAllDay) {
    // All day events have 'date' like "2023-10-27"
    // We treat start as 00:00:00 of that day (user timezone implicit in date usually)
    // We can append T00:00:00 to make it ISO-like for easy parsing
    startAt = rawEvent.start?.date ? `${rawEvent.start.date}T00:00:00` : new Date().toISOString();
    // End date for all-day is usually exclusive (next day).
    endAt = rawEvent.end?.date ? `${rawEvent.end.date}T00:00:00` : startAt;
  } else {
    startAt = rawEvent.start?.dateTime || new Date().toISOString();
    endAt = rawEvent.end?.dateTime || new Date().toISOString();
  }

  // Handle missing title
  const title = rawEvent.summary || '(No Title)';

  const status = calculateEventStatus(startAt, endAt);

  return {
    id: rawEvent.id,
    title,
    startAt,
    endAt,
    isAllDay,
    calendarId,
    location: rawEvent.location,
    status,
    htmlLink: rawEvent.htmlLink,
  };
};