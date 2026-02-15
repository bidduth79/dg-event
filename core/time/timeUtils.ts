import { EventStatus, APP_CONFIG } from '../config/constants';

export const getCurrentTime = (): number => {
  return Date.now();
};

export const formatTime = (isoString: string | Date, timeZone: string = APP_CONFIG.DEFAULT_TIMEZONE): string => {
  try {
    const date = typeof isoString === 'string' ? new Date(isoString) : isoString;
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZone,
    }).format(date);
  } catch (e) {
    return '--:--';
  }
};

export const formatDate = (isoString: string | Date, timeZone: string = APP_CONFIG.DEFAULT_TIMEZONE): string => {
  try {
    const date = typeof isoString === 'string' ? new Date(isoString) : isoString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone,
    }).format(date); // e.g., "February 14, 2026"
  } catch (e) {
    return 'Invalid Date';
  }
};

export const formatDuration = (startAt: string, endAt: string): string => {
  try {
    const start = new Date(startAt).getTime();
    const end = new Date(endAt).getTime();
    const diffMs = end - start;
    
    if (diffMs < 0) return '0m';

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  } catch (e) {
    return '';
  }
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const startOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

export const endOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

export const startOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfWeek = (date: Date): Date => {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const startOfMonth = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfMonth = (date: Date): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0); // Last day of previous month
  d.setHours(23, 59, 59, 999);
  return d;
};

export const startOfYear = (date: Date): Date => {
  const d = new Date(date);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfYear = (date: Date): Date => {
  const d = new Date(date);
  d.setMonth(11, 31);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
};

/**
 * Calculates the status of an event based on current time.
 */
export const calculateEventStatus = (startAt: string, endAt: string): EventStatus => {
  const now = getCurrentTime();
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();

  if (now >= end) {
    return EventStatus.EXPIRED;
  } else if (now >= start && now < end) {
    return EventStatus.ONGOING;
  } else {
    return EventStatus.UPCOMING;
  }
};