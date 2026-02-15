import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { addDays } from '../core/time/timeUtils';

export type ViewMode = 'day' | 'week' | 'month' | 'year' | 'schedule' | '4days';
export type UserRole = 'boss' | 'pa' | null;

interface SettingsState {
  blinkEnabled: boolean;
  refreshInterval: number; // in minutes
  selectedCalendars: string[]; // IDs of selected calendars
  viewDate: Date; // Current date being viewed
  viewMode: ViewMode;
  userRole: UserRole;
  flashMessage: string;
  // Sound Settings
  soundEnabledBoss: boolean;
  soundEnabledPA: boolean;
  voiceEnabled: boolean; // New: Voice Assistant
  voiceURI: string; // New: Selected Voice Model ID
}

interface SettingsContextType extends SettingsState {
  toggleBlink: () => void;
  setRefreshInterval: (minutes: number) => void;
  toggleCalendarSelection: (calendarId: string) => void;
  setInitialCalendars: (calendarIds: string[]) => void;
  setViewDate: (date: Date) => void;
  setViewMode: (mode: ViewMode) => void;
  navigate: (direction: 'prev' | 'next' | 'today') => void;
  setUserRole: (role: UserRole) => void;
  updateFlashMessage: (message: string) => void;
  toggleSoundBoss: () => void;
  toggleSoundPA: () => void;
  toggleVoice: () => void;
  setVoiceURI: (uri: string) => void; // New Action
}

const defaultSettings: SettingsState = {
  blinkEnabled: true,
  refreshInterval: 2,
  selectedCalendars: [],
  viewDate: new Date(),
  viewMode: 'day',
  userRole: null,
  flashMessage: '',
  soundEnabledBoss: true,
  soundEnabledPA: true,
  voiceEnabled: false, 
  voiceURI: '', // Default system voice
};

const STORAGE_KEY = 'app_user_settings';
const FLASH_MSG_KEY = 'app_flash_message_sync';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state from LocalStorage or default
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedFlash = localStorage.getItem(FLASH_MSG_KEY);
      
      const parsed = stored ? JSON.parse(stored) : {};
      
      return {
        ...defaultSettings,
        ...parsed,
        viewDate: new Date(),
        flashMessage: storedFlash || '',
        // Ensure new settings have defaults if reading from old localstorage
        soundEnabledBoss: parsed.soundEnabledBoss ?? true,
        soundEnabledPA: parsed.soundEnabledPA ?? true,
        voiceEnabled: parsed.voiceEnabled ?? false,
        voiceURI: parsed.voiceURI ?? '',
      };
    } catch (error) {
      console.error('Failed to load settings from storage:', error);
    }
    return defaultSettings;
  });

  // Persist general settings
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { viewDate, flashMessage, ...settingsToSave } = settings;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
  }, [settings]);

  // Flash Message Sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FLASH_MSG_KEY) {
        setSettings(prev => ({ ...prev, flashMessage: e.newValue || '' }));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateFlashMessage = (message: string) => {
    localStorage.setItem(FLASH_MSG_KEY, message);
    setSettings(prev => ({ ...prev, flashMessage: message }));
  };

  const toggleBlink = () => {
    setSettings(prev => ({ ...prev, blinkEnabled: !prev.blinkEnabled }));
  };
  
  const toggleSoundBoss = () => {
    setSettings(prev => ({ ...prev, soundEnabledBoss: !prev.soundEnabledBoss }));
  };

  const toggleSoundPA = () => {
    setSettings(prev => ({ ...prev, soundEnabledPA: !prev.soundEnabledPA }));
  };

  const toggleVoice = () => {
    setSettings(prev => ({ ...prev, voiceEnabled: !prev.voiceEnabled }));
  };
  
  const setVoiceURI = (uri: string) => {
    setSettings(prev => ({ ...prev, voiceURI: uri }));
  };

  const setRefreshInterval = (minutes: number) => {
    setSettings(prev => ({ ...prev, refreshInterval: minutes }));
  };

  const toggleCalendarSelection = (calendarId: string) => {
    setSettings(prev => {
      const isSelected = prev.selectedCalendars.includes(calendarId);
      const newSelection = isSelected
        ? prev.selectedCalendars.filter(id => id !== calendarId)
        : [...prev.selectedCalendars, calendarId];
      return { ...prev, selectedCalendars: newSelection };
    });
  };

  const setInitialCalendars = (calendarIds: string[]) => {
    setSettings(prev => {
       if (prev.selectedCalendars.length === 0) {
           return { ...prev, selectedCalendars: calendarIds };
       }
       return prev;
    });
  };

  const setViewDate = (date: Date) => {
    setSettings(prev => ({ ...prev, viewDate: date }));
  };

  const setViewMode = (mode: ViewMode) => {
    setSettings(prev => ({ ...prev, viewMode: mode }));
  };

  const navigate = (direction: 'prev' | 'next' | 'today') => {
    setSettings(prev => {
      let newDate: Date;
      if (direction === 'today') {
        newDate = new Date();
      } else {
        const factor = direction === 'next' ? 1 : -1;
        newDate = new Date(prev.viewDate);
        switch (prev.viewMode) {
          case 'day':
          case 'schedule':
            newDate = addDays(prev.viewDate, 1 * factor);
            break;
          case '4days':
            newDate = addDays(prev.viewDate, 4 * factor);
            break;
          case 'week':
            newDate = addDays(prev.viewDate, 7 * factor);
            break;
          case 'month':
            newDate.setMonth(newDate.getMonth() + 1 * factor);
            break;
          case 'year':
            newDate.setFullYear(newDate.getFullYear() + 1 * factor);
            break;
          default:
            newDate = addDays(prev.viewDate, 1 * factor);
        }
      }
      return { ...prev, viewDate: newDate };
    });
  };

  const setUserRole = (role: UserRole) => {
    setSettings(prev => ({ ...prev, userRole: role }));
  };

  return (
    <SettingsContext.Provider value={{
      ...settings,
      toggleBlink,
      setRefreshInterval,
      toggleCalendarSelection,
      setInitialCalendars,
      setViewDate,
      setViewMode,
      navigate,
      setUserRole,
      updateFlashMessage,
      toggleSoundBoss,
      toggleSoundPA,
      toggleVoice,
      setVoiceURI
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
};