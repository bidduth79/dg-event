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

  // --- INITIAL LOAD: FETCH CALENDARS ON MOUNT ---
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
        
        // Populate initial selection if empty
        if (selectedCalendars.length === 0) {
          // Strictly respect Google's 'selected' state
          const preSelected = cals.filter(c => c.selected).map(c => c.id);
          
          if (preSelected.length > 0) {
             setInitialCalendars(preSelected);
          } else {
             // Fallback
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

  // --- FORCE REFRESH & LOAD LOGIC ---
  const loadEvents = useCallback(async (isForceRefresh = false) => {
    if (!accessToken) {
        generateMockData();
        return;
    }

    setLoading(true);
    try {
      let targetCalendarIds = selectedCalendars;

      // FORCE REFRESH LOGIC:
      // If manually refreshing, fetch the Calendar List FIRST to see what is currently checked in Google.
      // This solves the issue where users uncheck 'Holidays' in Google, but the App still shows them.
      if (isForceRefresh) {
         try {
           const freshCalendars = await fetchCalendarList(accessToken);
           setAvailableCalendars(freshCalendars);
           
           // Filter strictly by Google's 'selected' status
           const activeIds = freshCalendars.filter(c => c.selected).map(c => c.id);
           
           if (activeIds.length > 0) {
             targetCalendarIds = activeIds;
             // Note: We don't overwrite user's local manual settings in SettingsContext here to avoid confusion,
             // but we use the fresh Google state for *this* dashboard render.
           }
         } catch (e) {
           console.warn("Could not refresh calendar list, using existing selection", e);
         }
      }

      if (targetCalendarIds.length === 0) {
        setLoading(false);
        return; 
      }

      const timeMin = startOfDay(new Date()).toISOString();
      const timeMax = addDays(new Date(), 30).toISOString(); 

      // Fetch fresh data
      const promises = targetCalendarIds.map(calId => 
        fetchEventsForCalendar(calId, accessToken, timeMin, timeMax)
      );

      const results = await Promise.all(promises);
      const allEvents = results.flat();
      allEvents.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

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
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedCalendars, handleAuthError, generateMockData]);

  // --- INITIAL LOAD EVENTS ---
  useEffect(() => {
    // Standard load on mount (uses cached settings)
    if (selectedCalendars.length > 0) {
      loadEvents(false);
    }
  }, [selectedCalendars.length, loadEvents]);

  // Wrapper for manual button click
  const handleManualRefresh = () => {
    loadEvents(true); // Pass true to force sync from Google
  };

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

  return { events, loading, lastUpdated, refresh: handleManualRefresh };
};