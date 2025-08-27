export interface CalendarEvent {
  title: string;
  description?: string | undefined;
  location?: string | undefined;
  startTime: Date;
  endTime: Date;
  url?: string;
}

export interface CalendarProvider {
  name: string;
  iconType: 'calendar' | 'envelope' | 'globe' | 'device-tablet';
  generateUrl: (event: CalendarEvent) => string;
}

// Format date for different calendar providers
const formatDateForGoogle = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

const formatDateForOutlook = (date: Date): string => {
  return date.toISOString();
};

const formatDateForYahoo = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

// Calendar providers
export const calendarProviders: CalendarProvider[] = [
  {
    name: 'Google Calendar',
    iconType: 'calendar',
    generateUrl: (event: CalendarEvent) => {
      const baseUrl = 'https://calendar.google.com/calendar/render';
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${formatDateForGoogle(event.startTime)}/${formatDateForGoogle(event.endTime)}`,
        details: event.description || '',
        location: event.location || '',
        ...(event.url && { sprop: `website:${event.url}` }),
      });
      return `${baseUrl}?${params.toString()}`;
    },
  },
  {
    name: 'Outlook',
    iconType: 'envelope',
    generateUrl: (event: CalendarEvent) => {
      const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
      const params = new URLSearchParams({
        subject: event.title,
        startdt: formatDateForOutlook(event.startTime),
        enddt: formatDateForOutlook(event.endTime),
        body: event.description || '',
        location: event.location || '',
        ...(event.url && { path: '/calendar/action/compose', rru: 'addevent' }),
      });
      return `${baseUrl}?${params.toString()}`;
    },
  },
  {
    name: 'Yahoo Calendar',
    iconType: 'globe',
    generateUrl: (event: CalendarEvent) => {
      const baseUrl = 'https://calendar.yahoo.com/';
      const params = new URLSearchParams({
        v: '60',
        title: event.title,
        st: formatDateForYahoo(event.startTime),
        et: formatDateForYahoo(event.endTime),
        desc: event.description || '',
        in_loc: event.location || '',
      });
      return `${baseUrl}?${params.toString()}`;
    },
  },
  {
    name: 'Apple Calendar',
    iconType: 'device-tablet',
    generateUrl: (event: CalendarEvent) => {
      // Generate ICS file content for Apple Calendar
      const formatICSDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Star Citizen Organizations//Event//EN',
        'BEGIN:VEVENT',
        `DTSTART:${formatICSDate(event.startTime)}`,
        `DTEND:${formatICSDate(event.endTime)}`,
        `SUMMARY:${event.title}`,
        ...(event.description
          ? [`DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`]
          : []),
        ...(event.location ? [`LOCATION:${event.location}`] : []),
        `UID:${Date.now()}@starcitizenorgs.com`,
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar' });
      return URL.createObjectURL(blob);
    },
  },
];

// Generate calendar event from our event data
export const createCalendarEvent = (eventData: {
  title: string;
  description?: string | undefined;
  location?: string | undefined;
  start_time: number; // Unix timestamp
  end_time?: number; // Unix timestamp
  duration_hours?: number;
}): CalendarEvent => {
  const startTime = new Date(eventData.start_time);
  let endTime: Date;

  if (eventData.end_time) {
    endTime = new Date(eventData.end_time);
  } else if (eventData.duration_hours) {
    endTime = new Date(
      startTime.getTime() + eventData.duration_hours * 60 * 60 * 1000
    );
  } else {
    // Default to 2 hours if no end time or duration specified
    endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
  }

  return {
    title: eventData.title,
    description: eventData.description,
    location: eventData.location,
    startTime,
    endTime,
  };
};

// Handle calendar link click
export const handleCalendarClick = async (
  provider: CalendarProvider,
  event: CalendarEvent
): Promise<void> => {
  const url = provider.generateUrl(event);

  if (provider.name === 'Apple Calendar') {
    // For Apple Calendar, we download the ICS file
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the blob URL
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    // For web-based calendars, open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
