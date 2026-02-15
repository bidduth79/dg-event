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
    soundEnabledBoss, soundEnabledPA, voiceEnabled
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
  useEffect(() => {
    setLocalEvents(prevLocal => {
       if (prevLocal.length === 0) return initialEvents;
       
       return initialEvents.map(apiEvent => {
         const existingLocal = prevLocal.find(e => e.id === apiEvent.id);
         
         if (existingLocal && new Date(existingLocal.endAt).getTime() > new Date(apiEvent.endAt).getTime()) {
           return { ...apiEvent, endAt: existingLocal.endAt };
         }
         
         if (existingLocal && new Date(existingLocal.endAt).getTime() < new Date(apiEvent.endAt).getTime()) {
            if (new Date(existingLocal.endAt).getTime() < new Date().getTime()) {
               return { ...apiEvent, endAt: existingLocal.endAt };
            }
         }
         
         return apiEvent;
       });
    });
  }, [initialEvents]);

  // 3. Timing & Clock Hook
  const { currentTime, remainingTime, isCritical } = useEventTiming(localEvents);

  // 4. Handle Extend Logic (PUSH Logic)
  const handleExtendEvent = useCallback((minutes: number) => {
    if (isReadOnly) return;
    const now = new Date().getTime();
    
    setLocalEvents(prev => {
      const activeIndex = prev.findIndex(e => {
        const start = new Date(e.startAt).getTime();
        const end = new Date(e.endAt).getTime();
        return (now >= start && now < end) || (now >= end && now - end < 5 * 60 * 1000); 
      });

      if (activeIndex === -1) return prev;

      const newEvents = [...prev];
      const activeEvent = newEvents[activeIndex];
      const oldEnd = new Date(activeEvent.endAt).getTime();
      const newEnd = oldEnd + (minutes * 60 * 1000);
      
      newEvents[activeIndex] = { ...activeEvent, endAt: new Date(newEnd).toISOString() };

      // Chain reaction logic (PUSH)
      let prevEventEnd = newEnd;

      for (let i = activeIndex + 1; i < newEvents.length; i++) {
        const currentEvent = newEvents[i];
        const currentEventStart = new Date(currentEvent.startAt).getTime();
        const duration = new Date(currentEvent.endAt).getTime() - currentEventStart;

        // Gap relative to the NEW end of previous event
        const gap = currentEventStart - prevEventEnd;

        // RULE 1: If gap is 5 minutes or more, STOP cascading.
        if (gap >= 5 * 60 * 1000) {
          break;
        }

        // RULE 2: If gap is less than 2 minutes (unsafe), PUSH the event.
        if (gap < 2 * 60 * 1000) {
          const newStart = prevEventEnd + (2 * 60 * 1000); // Enforce 2 min buffer
          const newEventEnd = newStart + duration;
          
          newEvents[i] = { 
            ...currentEvent, 
            startAt: new Date(newStart).toISOString(), 
            endAt: new Date(newEventEnd).toISOString() 
          };
          
          prevEventEnd = newEventEnd;
        } else {
          break;
        }
      }
      return newEvents;
    });
  }, [isReadOnly]);

  // 5. Handle Finish Logic (PULL Forward Logic)
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
      
      // Capture the scheduled end BEFORE we cut it short.
      // We use this to check if the next event was chained to this schedule.
      let previousOriginalEnd = new Date(activeEvent.endAt).getTime();

      // 1. End Current Event Immediately
      const forcedEnd = now - 1000;
      newEvents[activeIndex] = { ...activeEvent, endAt: new Date(forcedEnd).toISOString() };

      // 2. Chain Reaction (PULL)
      let previousNewEnd = forcedEnd;

      for (let i = activeIndex + 1; i < newEvents.length; i++) {
         const currentEvent = newEvents[i];
         const originalStart = new Date(currentEvent.startAt).getTime();
         const duration = new Date(currentEvent.endAt).getTime() - originalStart;
         
         // CHECK RELATIONSHIP: Was this event originally chained?
         // We look at the gap between its scheduled start and the previous event's scheduled end.
         const originalGap = originalStart - previousOriginalEnd;

         // RULE: If the original gap was >= 5 minutes, it means they were NOT chained.
         // Ending early should not affect this distant event.
         if (originalGap >= 5 * 60 * 1000) {
            break;
         }

         // IF CHAINED (Gap < 5m):
         // We snap this event to follow the NEW end time + 2 minute buffer.
         // This effectively "Pulls" the event forward if we saved time.
         const newStart = previousNewEnd + (2 * 60 * 1000);
         const newEnd = newStart + duration;
            
         newEvents[i] = { 
            ...currentEvent, 
            startAt: new Date(newStart).toISOString(), 
            endAt: new Date(newEnd).toISOString() 
         };
            
         // Update pointers for next iteration
         // The "Original End" for the next loop is the end time of THIS event before we shifted it.
         previousOriginalEnd = originalStart + duration; 
         // The "New End" is where we just placed it.
         previousNewEnd = newEnd;
      }
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
                  speakText(`The next event is ${upcomingEvents[0].title}.`);
               }, 1500); // Delay so it doesn't overlap with the tone
            } else if (voiceEnabled && !ongoingEvent && upcomingEvents.length === 0) {
               setTimeout(() => {
                  speakText("You have no more events for today.");
               }, 1500);
            }
        }
    }
    
    // CASE 2: Event Just Started (Newly detected)
    if (!prevOngoingIdRef.current && ongoingEvent) {
       if (voiceEnabled) {
          speakText(`Starting now: ${ongoingEvent.title}`);
       }
    }
    
    // Update ref for next render
    prevOngoingIdRef.current = ongoingEvent ? ongoingEvent.id : null;
  }, [ongoingEvent, userRole, soundEnabledBoss, soundEnabledPA, voiceEnabled, upcomingEvents]);


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