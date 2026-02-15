import { useState, useEffect } from 'react';
import { DomainEvent } from '../../../events/domain/Event';

const CRITICAL_THRESHOLD_MS = 2 * 60 * 1000; // 2 Minutes

export const useEventTiming = (events: DomainEvent[]) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [isCritical, setIsCritical] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Find current ongoing event locally to ensure instant UI updates
      const currentOngoing = events.find(e => {
          const start = new Date(e.startAt).getTime();
          const end = new Date(e.endAt).getTime();
          return now.getTime() >= start && now.getTime() < end;
      });

      if (currentOngoing) {
        const endTime = new Date(currentOngoing.endAt).getTime();
        const diff = endTime - now.getTime();

        if (diff > 0) {
           // Format: -HH:MM:SS
           const hours = Math.floor(diff / (1000 * 60 * 60));
           const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
           const seconds = Math.floor((diff % (1000 * 60)) / 1000);
           
           const formatted = `-${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
           setRemainingTime(formatted);

           // Critical Check (Last 2 Minutes)
           setIsCritical(diff <= CRITICAL_THRESHOLD_MS);
        } else {
           setRemainingTime('00:00:00');
           setIsCritical(true);
        }
      } else {
        setRemainingTime('');
        setIsCritical(false);
      }

    }, 1000);
    return () => clearInterval(timer);
  }, [events]);

  return { currentTime, remainingTime, isCritical };
};