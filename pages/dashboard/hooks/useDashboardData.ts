import { useState, useCallback, useEffect } from 'react';
import { DomainEvent, CalendarInfo } from '../../../events/domain/Event';
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
  setInitialCalendars,
  handleAuthError 
}: UseDashboardDataProps) => {
  
  // 1. Initialize State
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // --- HELPER: SAVE TO CACHE ---
  const saveToCache = (newEvents: DomainEvent[], date: Date) => {
    try {
      localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(newEvents));
      localStorage.setItem(LAST_UPDATED_KEY, date.toISOString());
    } catch (e) {
      console.error("Cache save failed", e);
    }
  };

  // --- HELPER: MOCK DATA (Fallback) ---
  const generateMockData = useCallback(() => {
    // Only generate if we have absolutely no data
    const now = new Date();
    // ... (Mock data generation logic same as before if needed, or simple fallback)
    // For brevity in this specific update, we will assume if manual sync fails, we keep old data
    // If cache is empty and sync fails, we show empty state or could trigger mock here.
  }, []);

  // --- MAIN SYNC FUNCTION (Manual Trigger) ---
  const syncWithGoogle = useCallback(async () => {
    if (!accessToken) {
        return;
    }

    setLoading(true);
    try {
      // 1. Fetch Fresh Calendar List from Google
      // We ignore local settings here to ensure we match Google's "Checked/Unchecked" state exactly.
      const googleCalendars = await fetchCalendarList(accessToken);
      
      // 2. Filter strictly by 'selected' property from Google
      const activeCalendars = googleCalendars.filter(c => c.selected);
      const activeIds = activeCalendars.map(c => c.id);

      // Update app state to reflect what we found
      if (activeIds.length > 0) {
          setInitialCalendars(activeIds);
      } else {
          // If user has unchecked EVERYTHING in Google, we clear events
          setEvents([]);
          saveToCache([], new Date());
          setLastUpdated(new Date());
          setLoading(false);
          return;
      }

      // 3. Fetch Events for these calendars
      const timeMin = startOfDay(new Date()).toISOString();
      const timeMax = addDays(new Date(), 30).toISOString(); 

      const promises = activeIds.map(calId => 
        fetchEventsForCalendar(calId, accessToken, timeMin, timeMax)
      );

      const results = await Promise.all(promises);
      const allEvents = results.flat();
      
      // Sort
      allEvents.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

      // 4. Update State & Cache
      const now = new Date();
      setEvents(allEvents);
      setLastUpdated(now);
      saveToCache(allEvents, now);

    } catch (err) {
      if ((err as any).message === "UNAUTHORIZED") {
          handleAuthError(err);
      } else {
          console.error("Sync failed:", err);
          // Optional: Show error toast
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, setInitialCalendars, handleAuthError]);

  // --- INITIAL LOAD (Offline First) ---
  useEffect(() => {
    const loadFromCache = () => {
      try {
        const cachedEvents = localStorage.getItem(EVENTS_CACHE_KEY);
        const cachedTime = localStorage.getItem(LAST_UPDATED_KEY);

        if (cachedEvents && cachedTime) {
          setEvents(JSON.parse(cachedEvents));
          setLastUpdated(new Date(cachedTime));
          console.log("Loaded data from cache.");
          return true; // Cache hit
        }
      } catch (e) {
        console.warn("Cache load error", e);
      }
      return false; // Cache miss
    };

    const hasCache = loadFromCache();

    // If no cache exists and we have a token, attempt first sync automatically
    // Otherwise wait for manual refresh
    if (!hasCache && accessToken) {
        syncWithGoogle();
    }
  }, [accessToken, syncWithGoogle]);

  // --- LOCAL UI STATUS UPDATE (Does not fetch data) ---
  useEffect(() => {
    const uiInterval = setInterval(() => {
       setEvents(prev => prev.map(ev => ({
          ...ev,
          status: calculateEventStatus(ev.startAt, ev.endAt)
       })));
    }, 5000); 
    return () => clearInterval(uiInterval);
  }, []);

  return { events, loading, lastUpdated, refresh: syncWithGoogle };
};