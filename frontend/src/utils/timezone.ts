// Timezone utilities for proper event scheduling

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

// Common timezones for Star Citizen players (UTC-12 to UTC+14)
export const COMMON_TIMEZONES: TimezoneOption[] = [
  { value: 'Pacific/Kwajalein', label: 'UTC-12 (Kwajalein)', offset: '-12:00' },
  { value: 'Pacific/Samoa', label: 'UTC-11 (Samoa)', offset: '-11:00' },
  { value: 'Pacific/Honolulu', label: 'UTC-10 (Hawaii)', offset: '-10:00' },
  { value: 'America/Anchorage', label: 'UTC-9 (Alaska)', offset: '-09:00' },
  { value: 'America/Los_Angeles', label: 'UTC-8 (Pacific)', offset: '-08:00' },
  { value: 'America/Denver', label: 'UTC-7 (Mountain)', offset: '-07:00' },
  { value: 'America/Chicago', label: 'UTC-6 (Central)', offset: '-06:00' },
  { value: 'America/New_York', label: 'UTC-5 (Eastern)', offset: '-05:00' },
  { value: 'America/Caracas', label: 'UTC-4 (Venezuela)', offset: '-04:00' },
  { value: 'America/Argentina/Buenos_Aires', label: 'UTC-3 (Argentina)', offset: '-03:00' },
  { value: 'Atlantic/South_Georgia', label: 'UTC-2 (South Georgia)', offset: '-02:00' },
  { value: 'Atlantic/Azores', label: 'UTC-1 (Azores)', offset: '-01:00' },
  { value: 'UTC', label: 'UTC+0 (UTC)', offset: '+00:00' },
  { value: 'Europe/London', label: 'UTC+1 (London)', offset: '+01:00' },
  { value: 'Europe/Paris', label: 'UTC+2 (Paris)', offset: '+02:00' },
  { value: 'Europe/Moscow', label: 'UTC+3 (Moscow)', offset: '+03:00' },
  { value: 'Asia/Dubai', label: 'UTC+4 (Dubai)', offset: '+04:00' },
  { value: 'Asia/Karachi', label: 'UTC+5 (Pakistan)', offset: '+05:00' },
  { value: 'Asia/Kolkata', label: 'UTC+5:30 (India)', offset: '+05:30' },
  { value: 'Asia/Dhaka', label: 'UTC+6 (Bangladesh)', offset: '+06:00' },
  { value: 'Asia/Bangkok', label: 'UTC+7 (Thailand)', offset: '+07:00' },
  { value: 'Asia/Shanghai', label: 'UTC+8 (China)', offset: '+08:00' },
  { value: 'Asia/Tokyo', label: 'UTC+9 (Japan)', offset: '+09:00' },
  { value: 'Australia/Sydney', label: 'UTC+10 (Sydney)', offset: '+10:00' },
  { value: 'Pacific/Noumea', label: 'UTC+11 (New Caledonia)', offset: '+11:00' },
  { value: 'Pacific/Auckland', label: 'UTC+12 (New Zealand)', offset: '+12:00' },
  { value: 'Pacific/Tongatapu', label: 'UTC+13 (Tonga)', offset: '+13:00' },
  { value: 'Pacific/Kiritimati', label: 'UTC+14 (Kiribati)', offset: '+14:00' },
];

// Get user's detected timezone
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Could not detect user timezone, defaulting to UTC:', error);
    return 'UTC';
  }
};

// Find the best match for user's timezone from our common timezones
export const findBestTimezoneMatch = (userTimezone: string): string => {
  // Direct match
  const directMatch = COMMON_TIMEZONES.find(tz => tz.value === userTimezone);
  if (directMatch) {
    return directMatch.value;
  }

  // Try to match by offset
  try {
    const now = new Date();
    const userOffset = -now.getTimezoneOffset() / 60; // Convert to hours
    const userOffsetString = userOffset >= 0 ? `+${userOffset}:00` : `${userOffset}:00`;
    
    const offsetMatch = COMMON_TIMEZONES.find(tz => tz.offset === userOffsetString);
    if (offsetMatch) {
      return offsetMatch.value;
    }
  } catch (error) {
    console.warn('Could not match timezone by offset:', error);
  }

  // Default to UTC
  return 'UTC';
};

// Convert local datetime string to UTC
export const convertLocalToUTC = (
  localDateTimeString: string,
  timezone: string
): string => {
  try {
    // Parse the datetime string (format: "YYYY-MM-DDTHH:MM")
    const [datePart, timePart] = localDateTimeString.split('T');
    if (!datePart || !timePart) {
      throw new Error('Invalid datetime format');
    }
    
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    
    if (year === undefined || month === undefined || day === undefined || 
        hour === undefined || minute === undefined) {
      throw new Error('Invalid datetime components');
    }
    
    // Create a date object representing the local time
    const localDate = new Date(year, month - 1, day, hour, minute, 0, 0);
    
    // Use a simpler approach: create a date in the target timezone and compare with UTC
    // This is more reliable than trying to calculate offsets manually
    const testDate = new Date(localDate.getTime());
    
    // Get the timezone offset by comparing how the same moment appears in different timezones
    const utcString = testDate.toLocaleString('en-US', { timeZone: 'UTC' });
    const tzString = testDate.toLocaleString('en-US', { timeZone: timezone });
    
    const utcDate = new Date(utcString);
    const tzDate = new Date(tzString);
    
    // Calculate the offset
    const offset = utcDate.getTime() - tzDate.getTime();
    
    // Apply the offset to convert from local time to UTC
    const result = new Date(localDate.getTime() + offset);
    
    return result.toISOString();
  } catch (error) {
    console.error('Error converting local time to UTC:', error);
    // Fallback: treat the input as UTC
    return new Date(localDateTimeString).toISOString();
  }
};

// Convert UTC datetime string to local timezone for display
export const convertUTCToLocal = (
  utcDateTimeString: string,
  timezone: string
): string => {
  try {
    const utcDate = new Date(utcDateTimeString);
    
    // Format the date in the target timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(utcDate);
    const year = parts.find(p => p.type === 'year')!.value;
    const month = parts.find(p => p.type === 'month')!.value;
    const day = parts.find(p => p.type === 'day')!.value;
    const hour = parts.find(p => p.type === 'hour')!.value;
    const minute = parts.find(p => p.type === 'minute')!.value;
    
    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch (error) {
    console.error('Error converting UTC to local time:', error);
    // Fallback to original string
    return utcDateTimeString.slice(0, 16);
  }
};

// Format datetime for display with timezone info
export const formatDateTimeWithTimezone = (
  utcDateTimeString: string,
  timezone: string
): string => {
  try {
    const date = new Date(utcDateTimeString);
    const timezoneName = COMMON_TIMEZONES.find(tz => tz.value === timezone)?.label || timezone;
    
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }) + ` (${timezoneName})`;
  } catch (error) {
    console.error('Error formatting datetime with timezone:', error);
    return new Date(utcDateTimeString).toLocaleString();
  }
};

// Validate that a datetime is in the future
export const isDateTimeInFuture = (
  localDateTimeString: string,
  timezone: string
): boolean => {
  try {
    const utcTime = convertLocalToUTC(localDateTimeString, timezone);
    const now = new Date();
    return new Date(utcTime) > now;
  } catch (error) {
    console.error('Error validating future datetime:', error);
    return false;
  }
};
