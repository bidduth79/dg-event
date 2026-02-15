import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useSettings, EventOverride } from '../state/SettingsContext';
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
    soundEnabledBoss, soundEnabledPA, voiceEnabled, voiceURI,
    eventOverrides, updateEventOverrides
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

  // 3. Compute Effective Events (Merge API Data with Firebase Overrides)
  const effectiveEvents = useMemo(() => {
     return initialEvents.map(evt => {
         const override = eventOverrides[evt.id];
         if (override) {
             return {
                 ...evt,
                 startAt: override.startAt || evt.startAt,
                 endAt: override.endAt || evt.endAt
             };
         }
         return evt;
     });
  }, [initialEvents, eventOverrides]);

  // 4. Timing & Clock Hook
  const { currentTime, remainingTime, isCritical } = useEventTiming(effectiveEvents);

  // 5. Handle Extend Logic (Smart Shift) - SYNCED
  const handleExtendEvent = useCallback((minutes: number) => {
    if (isReadOnly) return;
    const now = new Date().getTime();
    
    // Find active event index in the currently calculated effectiveEvents
    const activeIndex = effectiveEvents.findIndex(e => {
      const start = new Date(e.startAt).getTime();
      const end = new Date(e.endAt).getTime();
      return (now >= start && now < end) || (now >= end && now - end < 5 * 60 * 1000); 
    });

    if (activeIndex === -1) return;

    const updates: Record<string, EventOverride> = {};
    const activeEvent = effectiveEvents[activeIndex];
    const oldEnd = new Date(activeEvent.endAt).getTime();
    const shiftAmount = minutes * 60 * 1000;
    const newEnd = oldEnd + shiftAmount;
    
    // Update Active Event
    updates[activeEvent.id] = { endAt: new Date(newEnd).toISOString() };

    // Update subsequent events ONLY if they overlap (Chain Reaction)
    let currentBoundary = newEnd;

    for (let i = activeIndex + 1; i < effectiveEvents.length; i++) {
      const currentEvent = effectiveEvents[i];
      const oldStart = new Date(currentEvent.startAt).getTime();
      
      // If the current event starts BEFORE the previous event ends (overlap)
      if (oldStart < currentBoundary) {
          const oldEvtEnd = new Date(currentEvent.endAt).getTime();
          const duration = oldEvtEnd - oldStart;
          
          const newStart = currentBoundary;
          const newEvtEnd = newStart + duration;
          
          updates[currentEvent.id] = { 
              startAt: new Date(newStart).toISOString(),
              endAt: new Date(newEvtEnd).toISOString()
          };
          
          // Update boundary for the next iteration
          currentBoundary = newEvtEnd;
      } else {
          // No overlap found, chain breaks
          break;
      }
    }
    
    updateEventOverrides(updates);

  }, [isReadOnly, effectiveEvents, updateEventOverrides]);

  // 6. Handle Finish Logic (Simple End) - SYNCED
  const handleFinishEvent = useCallback(() => {
    if (isReadOnly) return;
    const now = new Date().getTime();
    
    const activeIndex = effectiveEvents.findIndex(e => {
      const start = new Date(e.startAt).getTime();
      const end = new Date(e.endAt).getTime();
      return now >= start && now < end;
    });

    if (activeIndex === -1) return;

    const activeEvent = effectiveEvents[activeIndex];
    // End exactly now (minus 1s to ensure status update)
    const forcedEnd = now - 1000;
    
    updateEventOverrides({
        [activeEvent.id]: { endAt: new Date(forcedEnd).toISOString() }
    });
  }, [isReadOnly, effectiveEvents, updateEventOverrides]);

  // 7. Derived State for UI
  const ongoingEvent = effectiveEvents.find(e => {
    const now = new Date().getTime();
    return now >= new Date(e.startAt).getTime() && now < new Date(e.endAt).getTime();
  });
  
  const upcomingEvents = effectiveEvents.filter(e => {
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