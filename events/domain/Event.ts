import { EventStatus } from '../../core/config/constants';

export interface DomainEvent {
  id: string;
  title: string;
  startAt: string; // ISO string
  endAt: string;   // ISO string
  isAllDay: boolean;
  calendarId: string;
  color?: string;
  location?: string;
  status: EventStatus; // Computed
  htmlLink?: string;
}

export interface CalendarInfo {
  id: string;
  summary: string;
  backgroundColor?: string;
  selected: boolean;
}