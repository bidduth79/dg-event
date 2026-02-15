import { useState, useCallback, useEffect } from 'react';
import { DomainEvent, CalendarInfo } from '../../../events/domain/Event';
import { EventStatus } from '../../../core/config/constants';
import { fetchCalendarList } from '../../../calendar/data/calendarApi';
import { fetchEventsForCalendar } from '../../../events/data/eventsApi';
import { startOfDay, addDays, calculateEventStatus } from '../../../core/time/timeUtils';

const EVENTS_CACHE_KEY = 'dashboard_cached_events';
const LAST_UPDATED_KEY = 'dashboard_last_updated';

interface UseDashboardDataProps {
  accessToken: string | null;
  selectedCalendars: string[];
  setInitialCalendars: (ids: string[]) => void;
  handleAuthError: (error: any) => void;
}

export const useDashboardData = ({ 
  accessToken, 
  selectedCalendars, 
  setInitialCalendars,
  handleAuthError 
}: UseDashboardDataProps) => {
  
  // 1. Initialize Events from LocalStorage
  const [events, setEvents] = useState<DomainEvent[]>(() => {
    try {
      const cached = localStorage.getItem(EVENTS_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      console.warn("Failed to load cached events", e);
      return [];
    }
  });

  // 2. Initialize Last Updated Time from LocalStorage
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => {
    try {
      const cached = localStorage.getItem(LAST_UPDATED_KEY);
      return cached ? new Date(cached) : null;
    } catch (e) {
      return null;
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [availableCalendars, setAvailableCalendars] = useState<CalendarInfo[]>([]);
  const [loading, setLoading] = useState(false);
  
  // --- MOCK DATA GENERATOR ---
  const generateMockData = useCallback(() => {
    const mockCals: CalendarInfo[] = [
        { id: '1', summary: 'Personal', backgroundColor: '#4285F4', selected: true },
        { id: '2', summary: 'Work', backgroundColor: '#EA4335', selected: true },
    ];
    setAvailableCalendars(mockCals);
    if (selectedCalendars.length === 0) {
        setInitialCalendars(['1', '2']);
    }

    const now = new Date();
    
    const mockEvents: DomainEvent[] = [
        {
            id: 'm1',
            title: 'Morning Briefing (Expired)',
            startAt: new Date(now.getTime() - 7200000).toISOString(), // -2 hours
            endAt: new Date(now.getTime() - 3600000).toISOString(),   // -1 hour
            isAllDay: false,
            calendarId: '2',
            status: EventStatus.EXPIRED, 
        },
        {
            id: 'm2',
            title: 'Running Event (Critical Test)',
            // Starts 30 mins ago, ends in 1 min 30 sec (to test blinking immediately)
            startAt: new Date(now.getTime() - 1800000).toISOString(), 
            endAt: new Date(now.getTime() + 90000).toISOString(), 
            isAllDay: false,
            calendarId: '2',
            status: EventStatus.ONGOING, 
            location: 'Conference Room A'
        },
        {
            id: 'm3',
            title: 'Lunch with Client',
            startAt: new Date(now.getTime() + 7200000).toISOString(), // +2 hours
            endAt: new Date(now.getTime() + 10800000).toISOString(),
            isAllDay: false,
            calendarId: '1',
            status: EventStatus.UPCOMING,
        },
        {
            id: 'm4',
            title: 'Weekly Team Sync',
            startAt: new Date(now.getTime() + 86400000).toISOString(), // +1 day
            endAt: new Date(now.getTime() + 86400000 + 3600000).toISOString(),
            isAllDay: false,
            calendarId: '2',
            status: EventStatus.UPCOMING,
        },
        {
            id: 'm5',
            title: 'Project Deadline',
            startAt: new Date(now.getTime() + 172800000).toISOString(), // +2 days
            endAt: new Date(now.getTime() + 172800000 + 7200000).toISOString(),
            isAllDay: true,
            calendarId: '2',
            status: EventStatus.UPCOMING,
        },
        {
            id: 'm6',
            title: 'Client Workshop',
            startAt: new Date(now.getTime() + 259200000).toISOString(), // +3 days
            endAt: new Date(now.getTime() + 259200000 + 14400000).toISOString(),
            isAllDay: false,
            calendarId: '1',
            status: EventStatus.UPCOMING,
        }
    ];
    setEvents(mockEvents);
    
    // Update Last Synced Time for Mock
    const nowTime = new Date();
    setLastUpdated(nowTime);
    localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(mockEvents));
    localStorage.setItem(LAST_UPDATED_KEY, nowTime.toISOString());

  }, [selectedCalendars.length, setInitialCalendars]);

  // --- FETCH CALENDAR LIST ---
  useEffect(() => {
    const initCalendars = async () => {
      if (!accessToken) {
          generateMockData();
          return;
      }
      try {
        const cals = await fetchCalendarList(accessToken);
        setAvailableCalendars(cals);
        if (selectedCalendars.length === 0) {
          const primary = cals.find(c => c.selected) || cals[0];
          if (primary) setInitialCalendars([primary.id]);
        }
      } catch (e) {
        handleAuthError(e);
      }
    };
    initCalendars();
  }, [accessToken, handleAuthError, selectedCalendars.length, setInitialCalendars, generateMockData]);

  // --- FETCH EVENTS LOGIC ---
  const loadEvents = useCallback(async () => {
    if (!accessToken) {
        generateMockData();
        return;
    }
    if (selectedCalendars.length === 0) {
        setEvents([]);
        localStorage.removeItem(EVENTS_CACHE_KEY);
        localStorage.removeItem(LAST_UPDATED_KEY);
        setLastUpdated(null);
        return;
    }

    setLoading(true);
    try {
      const timeMin = startOfDay(new Date()).toISOString();
      const timeMax = addDays(new Date(), 30).toISOString(); 

      const promises = selectedCalendars.map(calId => 
        fetchEventsForCalendar(calId, accessToken, timeMin, timeMax)
      );

      const results = await Promise.all(promises);
      const allEvents = results.flat();
      allEvents.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

      setEvents(allEvents);
      
      // Update Timestamp
      const now = new Date();
      setLastUpdated(now);
      
      // Save to LocalStorage
      localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(allEvents));
      localStorage.setItem(LAST_UPDATED_KEY, now.toISOString());

    } catch (err) {
      console.error("Failed to load events", err);
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedCalendars, handleAuthError, generateMockData]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // --- LOCAL STATUS UPDATE (5 SECONDS) ---
  useEffect(() => {
    const uiInterval = setInterval(() => {
       setEvents(prev => prev.map(ev => ({
          ...ev,
          status: calculateEventStatus(ev.startAt, ev.endAt)
       })));
    }, 5000); 
    return () => clearInterval(uiInterval);
  }, []);

  return { events, loading, lastUpdated, refresh: loadEvents };
};