import { APP_CONFIG } from '../../core/config/constants';
import { CalendarInfo } from '../../events/domain/Event';

export const fetchCalendarList = async (accessToken: string): Promise<CalendarInfo[]> => {
  try {
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/users/me/calendarList?minAccessRole=reader`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401) {
      throw new Error("UNAUTHORIZED");
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch calendars: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.items || []).map((item: any) => ({
      id: item.id,
      summary: item.summaryOverride || item.summary,
      backgroundColor: item.backgroundColor,
      selected: item.selected || false,
    }));
  } catch (error) {
    console.error('API Error (fetchCalendarList):', error);
    throw error;
  }
};