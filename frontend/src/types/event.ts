export interface Event {
  id: string;
  // organization_id is removed from frontend - backend no longer exposes internal IDs
  organization_spectrum_id?: string | null; // RSI org ID from backend
  created_by: string;
  title: string;
  description?: string;
  start_time: number; // Unix timestamp from API
  end_time: number; // Unix timestamp from API
  duration_minutes?: number;
  location?: string;
  languages: string[];
  playstyle_tags: string[];
  activity_tags: string[];
  max_participants?: number;
  is_public: boolean;
  is_active: boolean;
  registration_deadline?: number; // Unix timestamp from API
  created_at: number; // Unix timestamp from API
  updated_at: number; // Unix timestamp from API
  // Creator information (when joined with users table)
  creator_handle?: string;
  creator_avatar?: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: RegistrationStatus;
  notes?: string;
  registered_at: Date;
  updated_at: Date;
}

export enum RegistrationStatus {
  REGISTERED = 'registered',
  CONFIRMED = 'confirmed',
  ATTENDED = 'attended',
  CANCELLED = 'cancelled',
}

export interface EventTag {
  id: string;
  event_id: string;
  tag_type: EventTagType;
  value: string;
  created_at: Date;
}

export enum EventTagType {
  CATEGORY = 'category',
  DIFFICULTY = 'difficulty',
  LOCATION = 'location',
  TYPE = 'type',
}

export interface EventWithDetails extends Event {
  organization?: {
    id: string; // RSI org ID
    name: string;
    icon_url?: string;
  };
  registrations: EventRegistration[];
  tags: EventTag[];
  participant_count: number;
}

export interface CreateEventData {
  organization_id: string | null; // RSI org ID - will be converted by backend
  created_by: string;
  title: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  duration_minutes?: number;
  location?: string;
  languages?: string[];
  playstyle_tags?: string[];
  activity_tags?: string[];
  max_participants?: number;
  is_public?: boolean;
  registration_deadline?: Date;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string;
}
