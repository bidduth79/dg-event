import { APP_CONFIG } from '../../core/config/constants';
import { DomainEvent } from '../domain/Event';
import { mapGoogleEventToDomain, GoogleEventResource } from './mapGoogleEvent';

export const fetchEventsForCalendar = async (
  calendarId: string,
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<DomainEvent[]> => {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250', // Limit to prevent overload
  });

  try {
    const url = `${APP_CONFIG.API_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401) {
      throw new Error("UNAUTHORIZED");
    }

    if (!response.ok) {
      // Handle specific error for deleted/inaccessible calendars gracefully
      if (response.status === 404 || response.status === 410) {
        return [];
      }
      throw new Error(`Failed to fetch events for ${calendarId}`);
    }

    const data = await response.json();
    const rawEvents: GoogleEventResource[] = data.items || [];

    const domainEvents: DomainEvent[] = [];
    for (const raw of rawEvents) {
      const mapped = mapGoogleEventToDomain(raw, calendarId);
      if (mapped) {
        domainEvents.push(mapped);
      }
    }
    return domainEvents;
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      throw error; // Re-throw to be caught by the caller for logout
    }
    console.error(`API Error (fetchEvents for ${calendarId}):`, error);
    return []; // Return empty on other errors to allow Promise.all to continue
  }
};