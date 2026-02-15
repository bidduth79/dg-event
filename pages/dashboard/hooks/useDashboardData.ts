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
    console.log("Generating Mock Data...");
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
        }
    ];
    setEvents(mockEvents);
    
    const nowTime = new Date();
    setLastUpdated(nowTime);

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
        
        if (cals.length === 0) {
            console.warn("No calendars found via API. Using Mock Data.");
            generateMockData();
            return;
        }

        setAvailableCalendars(cals);
        
        // Logic Update: Respect Google's 'selected' state.
        // If the user has NOT manually configured calendars in the App yet (length 0),
        // we populate based on what is checked in Google Calendar UI.
        if (selectedCalendars.length === 0) {
          const preSelected = cals.filter(c => c.selected).map(c => c.id);
          
          if (preSelected.length > 0) {
             setInitialCalendars(preSelected);
          } else {
             // Fallback: If nothing is selected in Google (rare), select primary
             const primary = cals.find(c => c.id.includes('group.calendar.google.com') === false) || cals[0];
             if (primary) setInitialCalendars([primary.id]);
          }
        }
      } catch (e) {
        if ((e as any).message === "UNAUTHORIZED") {
             handleAuthError(e);
        } else {
             console.warn("Failed to fetch calendars (Network/API Error). Using Mock Data.", e);
             generateMockData();
        }
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
        return; 
    }

    setLoading(true);
    try {
      const timeMin = startOfDay(new Date()).toISOString();
      const timeMax = addDays(new Date(), 30).toISOString(); 

      // Fetch fresh data
      const promises = selectedCalendars.map(calId => 
        fetchEventsForCalendar(calId, accessToken, timeMin, timeMax)
      );

      const results = await Promise.all(promises);
      const allEvents = results.flat();
      allEvents.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

      // Only fallback to mock if the API explicitly fails, not just because list is empty.
      // An empty list is valid (free day).
      // However, for this UI design phase, if 0 events, we might still want mock, 
      // BUT for sync debugging, we trust the API result.
      
      // If we got a successful empty array, we update state to empty.
      setEvents(allEvents);
      
      const now = new Date();
      setLastUpdated(now);
      
      localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(allEvents));
      localStorage.setItem(LAST_UPDATED_KEY, now.toISOString());

    } catch (err) {
      if ((err as any).message === "UNAUTHORIZED") {
          handleAuthError(err);
      } else {
          console.warn("Failed to fetch events (Network/API Error).", err);
           // Optional: Keep old data or show error
      }
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