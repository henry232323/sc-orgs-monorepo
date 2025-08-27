import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  Input,
  MarkdownEditor,
  Paper,
  TimezoneDateTimePicker,
  TagInput,
  FormPage,
  ToggleSwitch,
  Listbox,
} from '../ui';
import {
  CalendarIcon,
  TagIcon,
  CheckIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import {
  useGetUserDashboardOrganizationsQuery,
  useCreateEventMutation,
  useGetEventQuery,
  useUpdateEventMutation,
} from '../../services/apiSlice';
import { useAuth } from '../../contexts/AuthContext';
import {
  getSortedLanguageOptions,
  convertNamesToCodes,
  convertCodesToNames,
} from '../../utils/languageMapping';
import { SEARCH_TAGS, TagType } from '../../components/tags';
import {
  getUserTimezone,
  findBestTimezoneMatch,
  convertLocalToUTC,
  convertUTCToLocal,
} from '../../utils/timezone';

interface EventFormProps {
  mode: 'create' | 'edit';
}

const EventForm: React.FC<EventFormProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    max_participants: 0,
    playstyle_tags: [] as string[],
    activity_tags: [] as string[],
    languages: ['English'],
    organization_id: null as string | null,
    is_public: true,
  });

  // Timezone state
  const [selectedTimezone, setSelectedTimezone] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch user's organizations for the dropdown
  const { data: userOrganizations = [], isLoading: organizationsLoading } =
    useGetUserDashboardOrganizationsQuery();

  // Fetch event data for editing
  const {
    data: eventData,
    isLoading: eventLoading,
    error: eventError,
  } = useGetEventQuery(id || '', {
    skip: mode !== 'edit' || !id,
  });

  // Handle org parameter from URL
  const orgParam = searchParams.get('org');

  // Event creation mutation
  const [createEvent, { isLoading: isCreating }] = useCreateEventMutation();

  // Event update mutation
  const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();

  // Language options for suggestions
  const languagesOptions = getSortedLanguageOptions();

  // Available tags for suggestions
  const playstyleTags = SEARCH_TAGS[TagType.PLAYSTYLE].tags;
  const activityTags = SEARCH_TAGS[TagType.ACTIVITY].tags;

  // Initialize timezone on component mount
  useEffect(() => {
    if (!selectedTimezone) {
      const userTz = getUserTimezone();
      const bestMatch = findBestTimezoneMatch(userTz);
      setSelectedTimezone(bestMatch);
    }
  }, [selectedTimezone]);

  // Populate form with event data when editing
  useEffect(() => {
    if (mode === 'edit' && eventData) {
      // Convert UTC times to local timezone for editing
      const startDate = eventData.start_time
        ? convertUTCToLocal(eventData.start_time.toString(), selectedTimezone || 'UTC')
        : '';
      const endDate = eventData.end_time
        ? convertUTCToLocal(eventData.end_time.toString(), selectedTimezone || 'UTC')
        : '';

      setFormData({
        title: eventData.title || '',
        description: eventData.description || '',
        start_date: startDate,
        end_date: endDate,
        location: eventData.location || '',
        max_participants: eventData.max_participants || 0,
        playstyle_tags: eventData.playstyle_tags || [],
        activity_tags: eventData.activity_tags || [],
        languages:
          eventData.languages && Array.isArray(eventData.languages)
            ? convertCodesToNames(eventData.languages)
            : ['English'],
        organization_id: eventData.organization_spectrum_id || null,
        is_public:
          eventData.is_public !== undefined ? eventData.is_public : true,
      });
    } else if (mode === 'create') {
      // Check for clone data in sessionStorage
      const cloneData = sessionStorage.getItem('eventCloneData');
      if (cloneData) {
        try {
          const parsedData = JSON.parse(cloneData);
          // Convert UTC times to local timezone for cloning
          const startDate = parsedData.start_time
            ? convertUTCToLocal(parsedData.start_time.toString(), selectedTimezone || 'UTC')
            : '';
          const endDate = parsedData.end_time
            ? convertUTCToLocal(parsedData.end_time.toString(), selectedTimezone || 'UTC')
            : '';

          setFormData({
            title: parsedData.title || '',
            description: parsedData.description || '',
            start_date: startDate,
            end_date: endDate,
            location: parsedData.location || '',
            max_participants: parsedData.max_participants || 0,
            playstyle_tags: parsedData.playstyle_tags || [],
            activity_tags: parsedData.activity_tags || [],
            languages:
              parsedData.languages && Array.isArray(parsedData.languages)
                ? convertCodesToNames(parsedData.languages)
                : ['English'],
            organization_id: parsedData.organization_spectrum_id || null,
            is_public:
              parsedData.is_public !== undefined ? parsedData.is_public : true,
          });

          // Clear the clone data after using it
          sessionStorage.removeItem('eventCloneData');
        } catch (error) {
          console.error('Failed to parse clone data:', error);
        }
      }
    }
  }, [mode, eventData]);

  // Handle org parameter from URL when organizations are loaded
  useEffect(() => {
    if (orgParam && userOrganizations.length > 0 && mode === 'create') {
      // Try to find organization by RSI ID first, then by name
      const orgByRsiId = userOrganizations.find(
        org => org.rsi_org_id === orgParam
      );
      const orgByName = userOrganizations.find(
        org =>
          org.name.toLowerCase().includes(orgParam.toLowerCase()) ||
          orgParam.toLowerCase().includes(org.name.toLowerCase())
      );

      const selectedOrg = orgByRsiId || orgByName;
      if (selectedOrg && formData.organization_id !== selectedOrg.rsi_org_id) {
        setFormData(prev => ({ ...prev, organization_id: selectedOrg.rsi_org_id }));
      }
    }
  }, [orgParam, userOrganizations, mode, formData.organization_id]);

  // Show loading state while fetching event data
  if (mode === 'edit' && eventLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-transparent'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-white/60 mx-auto mb-4'></div>
          <p className='text-white/80'>Loading event details...</p>
        </div>
      </div>
    );
  }

  // Show error state if event fetch failed
  if (mode === 'edit' && eventError) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-transparent'>
        <div className='text-center'>
          <p className='text-red-400 mb-4'>Failed to load event details</p>
          <Button variant='primary' onClick={() => navigate('/events')}>
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | string[] | number | null
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Event description is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (startDate >= endDate) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Event location is required';
    }

    if (formData.max_participants < 0) {
      newErrors.max_participants = 'Maximum participants cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!user) {
      setErrors({ submit: 'You must be logged in to create an event.' });
      return;
    }

    try {
      // Convert local times to UTC before sending to API
      const startTimeUTC = convertLocalToUTC(formData.start_date, selectedTimezone);
      const endTimeUTC = convertLocalToUTC(formData.end_date, selectedTimezone);

      if (mode === 'edit' && id) {
        // Update mode - only include fields that can be updated
        const updateData = {
          id: id!,
          title: formData.title,
          description: formData.description,
          start_time: new Date(startTimeUTC),
          end_time: new Date(endTimeUTC),
          location: formData.location,
          ...(formData.max_participants > 0 && {
            max_participants: formData.max_participants,
          }),
          playstyle_tags: formData.playstyle_tags,
          activity_tags: formData.activity_tags,
          is_public: formData.is_public,
          languages: convertNamesToCodes(formData.languages),
        };
        await updateEvent({ id, data: updateData }).unwrap();

        // Navigate to event details page after successful update
        navigate(`/events/${id}`);
      } else {
        // Create mode - include all required fields
        const createData = {
          organization_id: formData.organization_id || null,
          created_by: user.id,
          title: formData.title,
          description: formData.description,
          start_time: new Date(startTimeUTC),
          end_time: new Date(endTimeUTC),
          location: formData.location,
          ...(formData.max_participants > 0 && {
            max_participants: formData.max_participants,
          }),
          playstyle_tags: formData.playstyle_tags,
          activity_tags: formData.activity_tags,
          is_public: formData.is_public,
          languages: convertNamesToCodes(formData.languages),
        };
        const newEvent = await createEvent(createData).unwrap();

        // Navigate to the newly created event details page
        navigate(`/events/${newEvent.id}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to save event. Please try again.' });
    }
  };

  const handleCancel = () => {
    navigate('/events');
  };

  return (
    <FormPage
      title={mode === 'create' ? 'Create Event' : 'Edit Event'}
      subtitle={
        mode === 'create'
          ? 'Plan and organize your next Star Citizen event'
          : 'Update your event details'
      }
    >
      <form
        onSubmit={handleSubmit}
        className='space-y-[var(--spacing-section)]'
      >
        {/* Organization Selection */}
        <div className='space-y-2'>
          <label className='block text-sm font-medium text-primary'>
            Organization (optional)
          </label>
          {(() => {
            // Always include "No Organization" option
            const orgOptions = [
              {
                id: null,
                label: 'No Organization (Personal Event)',
                description:
                  'Create a personal event not tied to any organization',
                ...(user?.avatar_url && { avatar: user.avatar_url }),
                ...(!user?.avatar_url && { icon: UserIcon }),
              },
              ...userOrganizations.map(org => ({
                id: org.rsi_org_id,
                label: org.name,
                description: org.rsi_org_id
                  ? `RSI ID: ${org.rsi_org_id}`
                  : 'No RSI ID',
                ...(org.icon_url && { avatar: org.icon_url }),
              })),
            ];

            const selectedOrg =
              orgOptions.find(opt => opt.id === formData.organization_id) ||
              orgOptions[0] ||
              null; // Default to "No Organization"

            return (
              <Listbox
                selected={selectedOrg}
                onChange={option =>
                  handleInputChange('organization_id', option?.id || null)
                }
                options={orgOptions}
                placeholder='Select an organization'
                disabled={organizationsLoading}
              />
            );
          })()}
        </div>

        {/* Basic Information */}
        <Paper variant='glass-strong' size='lg'>
          <div className='mb-[var(--spacing-card-lg)]'>
            <h2 className='text-xl font-semibold text-primary mb-[var(--spacing-element)] flex items-center'>
              <CalendarIcon className='w-6 h-6 mr-3 text-tertiary' />
              Event Details
            </h2>
            <p className='text-tertiary text-sm'>
              Provide the essential information about your event
            </p>
          </div>

          <div className='space-y-[var(--spacing-element)]'>
            <Input
              label='Event Title'
              value={formData.title}
              onChange={value => handleInputChange('title', value)}
              placeholder='Enter event title'
              error={errors.title || ''}
            />

            <MarkdownEditor
              label='Description'
              value={formData.description}
              onChange={value => handleInputChange('description', value)}
              placeholder='Describe your event using markdown...'
              error={errors.description || ''}
              height={200}
            />

            {/* Privacy Toggle */}
            <ToggleSwitch
              checked={formData.is_public}
              onChange={() =>
                setFormData(prev => ({ ...prev, is_public: !prev.is_public }))
              }
              label='Public Event'
              description={
                formData.is_public
                  ? 'Anyone can see and join this event'
                  : 'Only organization members can see and join this event'
              }
            />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-[var(--gap-grid-sm)]'>
              <TimezoneDateTimePicker
                label='Start Date & Time'
                value={formData.start_date}
                onChange={value => handleInputChange('start_date', value)}
                placeholder='Select start date and time'
                timezone={selectedTimezone}
                onTimezoneChange={setSelectedTimezone}
                required={true}
                {...(errors.start_date && { error: errors.start_date })}
              />

              <TimezoneDateTimePicker
                label='End Date & Time'
                value={formData.end_date}
                onChange={value => handleInputChange('end_date', value)}
                placeholder='Select end date and time'
                timezone={selectedTimezone}
                onTimezoneChange={setSelectedTimezone}
                required={true}
                {...(errors.end_date && { error: errors.end_date })}
              />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-[var(--gap-grid-sm)]'>
              <Input
                label='Location'
                value={formData.location}
                onChange={value => handleInputChange('location', value)}
                placeholder='Enter event location'
                error={errors.location || ''}
              />

              <Input
                label='Maximum Participants'
                value={formData.max_participants.toString()}
                onChange={value =>
                  handleInputChange('max_participants', parseInt(value) || 0)
                }
                placeholder='Enter max participants (0 = unlimited)'
                error={errors.max_participants || ''}
              />
              <p className='mt-1 text-xs text-white/50'>
                Set to 0 for unlimited participants
              </p>
            </div>

            <div>
              <label className='block text-sm font-medium text-primary mb-2'>
                Supported Languages
              </label>
              <TagInput
                value={formData.languages}
                onChange={languagess => handleInputChange('languages', languagess)}
                suggestions={languagesOptions.map(option => option.label)}
                placeholder='Add supported languagess (e.g., English, German, French)'
                maxTags={10}
              />
            </div>
            <p className='mt-1 text-xs text-white/50'>
              Select all languagess your event will be conducted in
            </p>
          </div>
        </Paper>

        {/* Playstyle Tags */}
        <Paper variant='glass-strong' size='lg'>
          <div className='mb-[var(--spacing-card-lg)]'>
            <h2 className='text-xl font-semibold text-primary mb-[var(--spacing-element)] flex items-center'>
              <TagIcon className='w-6 h-6 mr-3 text-tertiary' />
              {SEARCH_TAGS[TagType.PLAYSTYLE].title}
            </h2>
            <p className='text-tertiary text-sm'>
              Select the playstyle that best describes your event
            </p>
          </div>

          <TagInput
            value={formData.playstyle_tags}
            onChange={tags => handleInputChange('playstyle_tags', tags)}
            suggestions={playstyleTags}
            placeholder='Add playstyle tags (e.g., Casual, Hardcore, Roleplay)'
            maxTags={5}
          />

          <p className='mt-[var(--spacing-tight)] text-sm text-tertiary'>
            Choose playstyle tags that describe the intensity and style of
            gameplay.
          </p>
        </Paper>

        {/* Activity Tags */}
        <Paper variant='glass-strong' size='lg'>
          <div className='mb-[var(--spacing-card-lg)]'>
            <h2 className='text-xl font-semibold text-primary mb-[var(--spacing-element)] flex items-center'>
              <TagIcon className='w-6 h-6 mr-3 text-tertiary' />
              {SEARCH_TAGS[TagType.ACTIVITY].title}
            </h2>
            <p className='text-tertiary text-sm'>
              Select the activities that will take place during your event
            </p>
          </div>

          <TagInput
            value={formData.activity_tags}
            onChange={tags => handleInputChange('activity_tags', tags)}
            suggestions={activityTags}
            placeholder='Add activity tags (e.g., Combat, Trading, Mining)'
            maxTags={10}
          />

          <p className='mt-[var(--spacing-tight)] text-sm text-tertiary'>
            Choose activity tags that describe what players will be doing during
            the event.
          </p>
        </Paper>

        {/* Form Actions */}
        <div className='flex items-center justify-end gap-[var(--spacing-element)]'>
          <Button
            type='button'
            variant='glass'
            onClick={handleCancel}
            disabled={isCreating || isUpdating}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            variant='primary'
            disabled={isCreating || isUpdating}
            className='min-w-[120px]'
          >
            {isCreating || isUpdating ? (
              <div className='w-5 h-5 border-2 border-glass border-t-primary rounded-full animate-spin' />
            ) : (
              <>
                <CheckIcon className='w-5 h-5 mr-2' />
                {mode === 'create' ? 'Create Event' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>

        {errors.submit && (
          <div className='text-center'>
            <p className='text-error text-sm'>{errors.submit}</p>
          </div>
        )}
      </form>
    </FormPage>
  );
};

export default EventForm;
