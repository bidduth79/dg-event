import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useSettings } from '../state/SettingsContext';
import { useNavigate } from 'react-router-dom';

// Hooks
import { useDashboardData } from './dashboard/hooks/useDashboardData';
import { useEventTiming } from './dashboard/hooks/useEventTiming';

// Components
import DashboardHeader from './dashboard/components/DashboardHeader';
import CurrentEventHero from './dashboard/components/CurrentEventHero';
import UpcomingEventsList from './dashboard/components/UpcomingEventsList';
import FlashMessageTicker from './dashboard/components/FlashMessageTicker';
import { DomainEvent } from '../events/domain/Event';

// Sound & Voice
import { playEndingTone, speakText } from '../core/sound/soundUtils';

const Dashboard: React.FC = () => {
  const { accessToken, isAuthenticated, logout } = useAuth();
  const { 
    selectedCalendars, setInitialCalendars, userRole, 
    soundEnabledBoss, soundEnabledPA, voiceEnabled, voiceURI
  } = useSettings();
  const navigate = useNavigate();

  // Check if read only (Boss Mode)
  const isReadOnly = userRole === 'boss';

  // 1. Auth Error Handler
  const handleAuthError = useCallback((error: any) => {
    if (error.message === "UNAUTHORIZED") {
      logout();
      navigate('/login');
    }
  }, [logout, navigate]);

  // 2. Data Fetching Hook
  const { events: initialEvents, lastUpdated, loading, refresh } = useDashboardData({
    accessToken,
    selectedCalendars,
    setInitialCalendars,
    handleAuthError
  });

  // Local state to manage overrides (extensions)
  const [localEvents, setLocalEvents] = useState<DomainEvent[]>([]);

  // Sync local events when initialEvents update
  // CRITICAL FIX: Ensure pushed start times are preserved AND handled "Ended" events
  useEffect(() => {
    setLocalEvents(prevLocal => {
       if (prevLocal.length === 0) return initialEvents;
       
       return initialEvents.map(apiEvent => {
         const existingLocal = prevLocal.find(e => e.id === apiEvent.id);
         
         if (existingLocal) {
            const apiStart = new Date(apiEvent.startAt).getTime();
            const apiEnd = new Date(apiEvent.endAt).getTime();
            const localStart = new Date(existingLocal.startAt).getTime();
            const localEnd = new Date(existingLocal.endAt).getTime();
            const now = new Date().getTime();

            // Logic to preserve local overrides:
            // 1. Extended: Local end is later than API end
            // 2. Pushed: Local start is later than API start
            // 3. Ended Manually: Local end is earlier than API end AND it is in the past (expired)
            const isExtended = localEnd > apiEnd;
            const isPushed = localStart > apiStart;
            const isEndedManually = localEnd < apiEnd && localEnd < now;

            if (isExtended || isPushed || isEndedManually) {
                return { 
                    ...apiEvent, 
                    startAt: existingLocal.startAt,
                    endAt: existingLocal.endAt 
                };
            }
         }
         
         return apiEvent;
       });
    });
  }, [initialEvents]);

  // 3. Timing & Clock Hook
  const { currentTime, remainingTime, isCritical } = useEventTiming(localEvents);

  // 4. Handle Extend Logic (Smart Shift)
  const handleExtendEvent = useCallback((minutes: number) => {
    if (isReadOnly) return;
    const now = new Date().getTime();
    
    setLocalEvents(prev => {
      // Find active event (simple check: now is within start and end)
      // Or if it just ended recently (within last 5 mins) allows extending too
      const activeIndex = prev.findIndex(e => {
        const start = new Date(e.startAt).getTime();
        const end = new Date(e.endAt).getTime();
        return (now >= start && now < end) || (now >= end && now - end < 5 * 60 * 1000); 
      });

      if (activeIndex === -1) return prev;

      const newEvents = [...prev];
      const activeEvent = newEvents[activeIndex];
      const oldEnd = new Date(activeEvent.endAt).getTime();
      const shiftAmount = minutes * 60 * 1000;
      const newEnd = oldEnd + shiftAmount;
      
      // Update Active Event
      newEvents[activeIndex] = { ...activeEvent, endAt: new Date(newEnd).toISOString() };

      // Update subsequent events ONLY if they overlap (Chain Reaction)
      let currentBoundary = newEnd;

      for (let i = activeIndex + 1; i < newEvents.length; i++) {
        const currentEvent = newEvents[i];
        const oldStart = new Date(currentEvent.startAt).getTime();
        
        // If the current event starts BEFORE the previous event ends (overlap)
        // We push it to start at the previous event's end time.
        if (oldStart < currentBoundary) {
            const oldEvtEnd = new Date(currentEvent.endAt).getTime();
            const duration = oldEvtEnd - oldStart;
            
            const newStart = currentBoundary;
            const newEvtEnd = newStart + duration;
            
            newEvents[i] = { 
                ...currentEvent, 
                startAt: new Date(newStart).toISOString(), 
                endAt: new Date(newEvtEnd).toISOString() 
            };
            
            // Update boundary for the next iteration
            currentBoundary = newEvtEnd;
        } else {
            // No overlap found, so the chain breaks here. 
            // Subsequent events are already safe.
            break;
        }
      }
      return newEvents;
    });
  }, [isReadOnly]);

  // 5. Handle Finish Logic (Simple End, No Pull)
  const handleFinishEvent = useCallback(() => {
    if (isReadOnly) return;
    const now = new Date().getTime();
    
    setLocalEvents(prev => {
      const activeIndex = prev.findIndex(e => {
        const start = new Date(e.startAt).getTime();
        const end = new Date(e.endAt).getTime();
        return now >= start && now < end;
      });

      if (activeIndex === -1) return prev;

      const newEvents = [...prev];
      const activeEvent = newEvents[activeIndex];
      
      // End exactly now (minus 1s to ensure status update)
      const forcedEnd = now - 1000;
      
      // Only update the current event. Do NOT touch subsequent events.
      newEvents[activeIndex] = { ...activeEvent, endAt: new Date(forcedEnd).toISOString() };

      return newEvents;
    });
  }, [isReadOnly]);

  // 6. Derived State for UI
  const ongoingEvent = localEvents.find(e => {
    const now = new Date().getTime();
    return now >= new Date(e.startAt).getTime() && now < new Date(e.endAt).getTime();
  });
  
  const upcomingEvents = localEvents.filter(e => {
    const now = new Date().getTime();
    return new Date(e.startAt).getTime() > now;
  }).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  // --- SOUND & VOICE LOGIC ---
  const prevOngoingIdRef = useRef<string | null>(null);

  useEffect(() => {
    const shouldPlaySound = (userRole === 'boss' && soundEnabledBoss) || (userRole === 'pa' && soundEnabledPA);
    
    // CASE 1: Event Just Finished
    if (prevOngoingIdRef.current) {
        if (!ongoingEvent || ongoingEvent.id !== prevOngoingIdRef.current) {
            if (shouldPlaySound) playEndingTone();
            
            // Voice announcement for next event
            if (voiceEnabled && upcomingEvents.length > 0) {
               setTimeout(() => {
                  speakText(`The next event is ${upcomingEvents[0].title}.`, voiceURI);
               }, 1500); // Delay so it doesn't overlap with the tone
            } else if (voiceEnabled && !ongoingEvent && upcomingEvents.length === 0) {
               setTimeout(() => {
                  speakText("You have no more events for today.", voiceURI);
               }, 1500);
            }
        }
    }
    
    // CASE 2: Event Just Started (Newly detected)
    if (!prevOngoingIdRef.current && ongoingEvent) {
       if (voiceEnabled) {
          speakText(`Starting now: ${ongoingEvent.title}`, voiceURI);
       }
    }
    
    // Update ref for next render
    prevOngoingIdRef.current = ongoingEvent ? ongoingEvent.id : null;
  }, [ongoingEvent, userRole, soundEnabledBoss, soundEnabledPA, voiceEnabled, upcomingEvents, voiceURI]);


  // --- RENDER ---
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full">
        <h2 className="text-2xl font-normal text-gray-300 mb-4">Sign in required</h2>
        <button onClick={() => navigate('/settings')} className="bg-blue-600 px-6 py-2 rounded">Connect</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full font-sans overflow-hidden relative w-full items-center">
      
      {/* Centered Container with Semi-Transparent Background */}
      <div className="w-full max-w-[1440px] h-full flex flex-col shadow-2xl bg-black/80 backdrop-blur-md border-x border-gray-900/50">
          <DashboardHeader 
             currentTime={currentTime} 
             lastUpdated={lastUpdated} 
             onRefresh={refresh}
             loading={loading}
             readOnly={isReadOnly}
          />
          <div className="flex-1 flex flex-col p-6 gap-6 overflow-hidden w-full">
            <CurrentEventHero 
               ongoingEvent={ongoingEvent} 
               nextEvent={upcomingEvents[0]} 
               remainingTime={remainingTime} 
               isCritical={isCritical}
               onExtend={handleExtendEvent}
               onFinish={handleFinishEvent}
               readOnly={isReadOnly}
            />
            <UpcomingEventsList events={upcomingEvents} />
          </div>
      </div>

      <FlashMessageTicker />
    </div>
  );
};

export default Dashboard;