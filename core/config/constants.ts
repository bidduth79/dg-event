export const APP_CONFIG = {
  API_BASE_URL: 'https://www.googleapis.com/calendar/v3',
  DEFAULT_TIMEZONE: 'Asia/Dhaka',
  SCOPES: 'https://www.googleapis.com/auth/calendar.readonly',
  // Note: In a real app, Client ID should be in env variables.
  // This is a placeholder or requires user input in the UI.
  GOOGLE_CLIENT_ID: '', 
  
  // Update Intervals
  UI_UPDATE_INTERVAL_MS: 5000, // 5 seconds
  API_REFETCH_INTERVAL_MIN_MS: 120000, // 2 minutes
  API_REFETCH_INTERVAL_MAX_MS: 300000, // 5 minutes
};

export enum EventStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  EXPIRED = 'EXPIRED',
}