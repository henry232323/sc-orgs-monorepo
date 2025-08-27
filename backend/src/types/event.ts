export interface Event {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  duration_minutes?: number;
  location?: string;
  languages: string[];
  playstyle_tags?: string[];
  activity_tags?: string[];
  max_participants?: number;
  is_public: boolean;
  is_active: boolean;
  registration_deadline?: Date;
  created_at: Date;
  updated_at: Date;
  // Creator information (when joined with users table)
  creator_handle?: string;
  creator_avatar?: string;
}

export interface CreateEventData {
  organization_id: string;
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

export interface UpdateEventData {
  title?: string;
  description?: string;
  start_time?: Date;
  end_time?: Date;
  duration_minutes?: number;
  location?: string;
  languages?: string[];
  playstyle_tags?: string[];
  activity_tags?: string[];
  max_participants?: number;
  is_public?: boolean;
  is_active?: boolean;
  registration_deadline?: Date;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: 'registered' | 'confirmed' | 'attended' | 'cancelled';
  notes?: string;
  registered_at: Date;
  updated_at: Date;
}

export interface CreateEventRegistrationData {
  event_id: string;
  user_id: string;
  status?: string;
  notes?: string;
}
