import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { addDays } from '../core/time/timeUtils';
import { db } from '../core/config/firebase';
import { ref, onValue, set, update } from 'firebase/database';

export type ViewMode = 'day' | 'week' | 'month' | 'year' | 'schedule' | '4days';
export type UserRole = 'boss' | 'pa' | null;

interface SettingsState {
  // SYNCED SETTINGS (Shared across devices via Firebase)
  blinkEnabled: boolean;
  refreshInterval: number;
  selectedCalendars: string[];
  viewDate: Date;
  viewMode: ViewMode;
  flashMessage: string;
  voiceEnabled: boolean;
  voiceURI: string;

  // LOCAL SETTINGS (Device specific, stored in LocalStorage)
  userRole: UserRole;
  soundEnabledBoss: boolean;
  soundEnabledPA: boolean;
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
  setVoiceURI: (uri: string) => void;
}

const defaultSyncedSettings = {
  blinkEnabled: true,
  refreshInterval: 2,
  selectedCalendars: [] as string[],
  viewDate: new Date().toISOString(), // Store as string in DB
  viewMode: 'day' as ViewMode,
  flashMessage: '',
  voiceEnabled: false,
  voiceURI: '',
};

const LOCAL_STORAGE_KEY = 'app_local_device_settings';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. LOCAL STATE (Identity & Audio)
  const [localSettings, setLocalSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      return {
        userRole: parsed.userRole || null,
        soundEnabledBoss: parsed.soundEnabledBoss ?? true,
        soundEnabledPA: parsed.soundEnabledPA ?? true,
      };
    } catch {
      return { userRole: null, soundEnabledBoss: true, soundEnabledPA: true };
    }
  });

  // Save Local Settings on change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localSettings));
  }, [localSettings]);

  // 2. SYNCED STATE (Content & View)
  // We initialize with defaults, but Firebase will overwrite this instantly on mount
  const [syncedSettings, setSyncedSettings] = useState(defaultSyncedSettings);
  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState(false);

  // --- FIREBASE LISTENER ---
  useEffect(() => {
    const settingsRef = ref(db, 'settings');
    
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSyncedSettings(prev => ({
          ...prev,
          ...data,
          // Ensure array exists (Firebase doesn't store empty arrays)
          selectedCalendars: data.selectedCalendars || []
        }));
      } else {
        // If DB is empty, initialize it with defaults
        set(settingsRef, defaultSyncedSettings);
      }
      setIsFirebaseLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  // --- ACTIONS (Write to Firebase for Synced, Write to State for Local) ---

  const updateFirebase = (updates: Partial<typeof defaultSyncedSettings>) => {
    update(ref(db, 'settings'), updates).catch(err => console.error("Firebase update failed", err));
  };

  const updateFlashMessage = (message: string) => {
    updateFirebase({ flashMessage: message });
  };

  const toggleBlink = () => {
    updateFirebase({ blinkEnabled: !syncedSettings.blinkEnabled });
  };
  
  const toggleSoundBoss = () => {
    setLocalSettings(prev => ({ ...prev, soundEnabledBoss: !prev.soundEnabledBoss }));
  };

  const toggleSoundPA = () => {
    setLocalSettings(prev => ({ ...prev, soundEnabledPA: !prev.soundEnabledPA }));
  };

  const toggleVoice = () => {
    // Explicitly cast to boolean to handle any potential undefined/null from partial DB states
    const currentValue = Boolean(syncedSettings.voiceEnabled);
    const newState = !currentValue;
    updateFirebase({ voiceEnabled: newState });
  };
  
  const setVoiceURI = (uri: string) => {
    updateFirebase({ voiceURI: uri });
  };

  const setRefreshInterval = (minutes: number) => {
    updateFirebase({ refreshInterval: minutes });
  };

  const toggleCalendarSelection = (calendarId: string) => {
    const currentList = syncedSettings.selectedCalendars || [];
    const newList = currentList.includes(calendarId)
      ? currentList.filter(id => id !== calendarId)
      : [...currentList, calendarId];
    
    updateFirebase({ selectedCalendars: newList });
  };

  const setInitialCalendars = (calendarIds: string[]) => {
    // Only set if currently empty (first load)
    if ((syncedSettings.selectedCalendars || []).length === 0) {
        updateFirebase({ selectedCalendars: calendarIds });
    }
  };

  const setViewDate = (date: Date) => {
    updateFirebase({ viewDate: date.toISOString() });
  };

  const setViewMode = (mode: ViewMode) => {
    updateFirebase({ viewMode: mode });
  };

  const navigate = (direction: 'prev' | 'next' | 'today') => {
    let newDate: Date;
    const currentDate = new Date(syncedSettings.viewDate);

    if (direction === 'today') {
      newDate = new Date();
    } else {
      const factor = direction === 'next' ? 1 : -1;
      newDate = new Date(currentDate);
      switch (syncedSettings.viewMode) {
        case 'day':
        case 'schedule':
          newDate = addDays(currentDate, 1 * factor);
          break;
        case '4days':
          newDate = addDays(currentDate, 4 * factor);
          break;
        case 'week':
          newDate = addDays(currentDate, 7 * factor);
          break;
        case 'month':
          newDate.setMonth(newDate.getMonth() + 1 * factor);
          break;
        case 'year':
          newDate.setFullYear(newDate.getFullYear() + 1 * factor);
          break;
        default:
          newDate = addDays(currentDate, 1 * factor);
      }
    }
    updateFirebase({ viewDate: newDate.toISOString() });
  };

  const setUserRole = (role: UserRole) => {
    setLocalSettings(prev => ({ ...prev, userRole: role }));
  };

  // Combine Synced and Local state for the Consumer
  // Use explicit defaults fallback to ensure 'voiceEnabled' is never undefined
  const combinedState: SettingsState = {
    ...localSettings,
    ...defaultSyncedSettings, 
    ...syncedSettings,
    // Convert string date back to Object for app consumption
    viewDate: new Date(syncedSettings.viewDate || defaultSyncedSettings.viewDate), 
  };

  return (
    <SettingsContext.Provider value={{
      ...combinedState,
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