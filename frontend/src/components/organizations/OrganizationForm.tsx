import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useGetOrganizationQuery,
  useGetUserVerificationCodeQuery,
} from '../../services/apiSlice';
import { Paper, Button, Input, TagInput, FormPage } from '../ui';
import { MarkdownEditor } from '../ui';
import {
  BuildingOfficeIcon,
  MapPinIcon,
  TagIcon,
  ExclamationTriangleIcon,
  LanguageIcon,
} from '@heroicons/react/24/outline';
import {
  getSortedLanguageOptions,
  convertCodesToNames,
  convertNamesToCodes,
  isValidLanguageName,
} from '../../utils/languageMapping';
import { 
  extractValidationErrors, 
  hasValidationErrors
} from '../../utils/errorHandling';
import { ErrorDisplay } from '../ui/ErrorDisplay';
import { SEARCH_TAGS, TagType } from '../tags';

interface OrganizationFormData {
  rsi_org_id: string;
  name?: string;
  description?: string;
  website?: string;
  discord?: string;
  location?: string;
  languages: string[];
  playstyle_tags: string[];
  focus_tags: string[];
}

interface FormErrors {
  rsi_org_id?: string;
  name?: string;
  description?: string;
  website?: string;
  discord?: string;
  location?: string;
  languages?: string[];
  playstyle_tags?: string;
  focus_tags?: string;
}

interface OrganizationFormProps {
  mode: 'create' | 'edit';
}

const OrganizationForm: React.FC<OrganizationFormProps> = () => {
  const navigate = useNavigate();
  const { spectrumId } = useParams<{ spectrumId: string }>();
  const isEditing = !!spectrumId;

  const [formData, setFormData] = useState<OrganizationFormData>({
    rsi_org_id: '',
    name: '',
    description: '',
    website: '',
    discord: '',
    location: '',
    languages: ['English'],
    playstyle_tags: [],
    focus_tags: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<any>(null);

  // RTK Query hooks for data fetching and mutations
  const {
    data: organization,
    isLoading: isLoadingOrganization,
    error: fetchError,
    refetch: refetchOrganization,
  } = useGetOrganizationQuery(spectrumId!, {
    skip: !isEditing, // Only fetch if we're editing
  });

  const [createOrganization, { isLoading: isCreating }] =
    useCreateOrganizationMutation();
  const [updateOrganization, { isLoading: isUpdating }] =
    useUpdateOrganizationMutation();

  // Get user's verification code
  const {
    data: verificationData,
    isLoading: isLoadingVerification,
    error: verificationError,
  } = useGetUserVerificationCodeQuery();

  // Debug logging
  console.log('Verification data:', verificationData);
  console.log('Verification loading:', isLoadingVerification);
  console.log('Verification error:', verificationError);

  // Available tags for suggestions - using standardized tags from TagManager
  const playstyleTags = SEARCH_TAGS[TagType.PLAYSTYLE].tags;
  const activityTags = SEARCH_TAGS[TagType.ACTIVITY].tags;

  // Available language options
  const languageOptions = getSortedLanguageOptions();

  // Set form data when editing
  useEffect(() => {
    if (organization) {
      // Convert languages codes to names for display
      const languagesNames =
        organization.languages && organization.languages.length > 0
          ? convertCodesToNames(organization.languages)
          : ['English'];

      setFormData({
        rsi_org_id: organization.rsi_org_id || '',
        name: organization.name,
        description: organization.description || '',
        website: organization.website || '',
        discord: organization.discord || '',
        location: organization.location || '',
        languages: languagesNames,
        playstyle_tags: organization.playstyle_tags || [],
        focus_tags: organization.focus_tags || [],
      });
    }
  }, [organization]);

  const handleInputChange = (
    field: keyof OrganizationFormData,
    value: string | string[] | number | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.rsi_org_id.trim()) {
      newErrors.rsi_org_id = 'Spectrum ID is required';
    } else if (!/^[A-Z0-9]+$/.test(formData.rsi_org_id.trim())) {
      newErrors.rsi_org_id = 'Spectrum ID can only contain letters and numbers';
    } else if (formData.rsi_org_id.length > 20) {
      newErrors.rsi_org_id = 'Spectrum ID cannot exceed 20 characters';
    }

    // Only require name and description during editing
    if (isEditing) {
      if (!formData.name?.trim()) {
        newErrors.name = 'Organization name is required';
      }

      if (!formData.description?.trim()) {
        newErrors.description = 'Description is required';
      }
    }

    // Validate languages tags
    if (formData.languages.length === 0) {
      newErrors.languages = ['At least one languages must be selected'];
    } else {
      // Validate each languages name
      const invalidLanguages = formData.languages.filter(
        lang => !isValidLanguageName(lang)
      );
      if (invalidLanguages.length > 0) {
        newErrors.languages = [
          `Invalid languages(s): ${invalidLanguages.join(', ')}`,
        ];
      }
    }

    // Tags are optional during creation, but can be required during editing if needed
    // For now, tags are always optional

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Convert languages names to codes for backend
      const formDataWithCodes = {
        ...formData,
        languages: convertNamesToCodes(formData.languages),
      };

      if (isEditing && spectrumId) {
        await updateOrganization({
          rsi_org_id: spectrumId,
          data: formDataWithCodes,
        }).unwrap();
      } else {
        await createOrganization(formDataWithCodes).unwrap();
      }

      // Navigate back to organizations list
      navigate('/organizations');
    } catch (error) {
      console.error('Failed to save organization:', error);
      
      // Handle validation errors
      if (hasValidationErrors(error)) {
        const validationErrors = extractValidationErrors(error);
        setErrors(validationErrors);
      } else {
        setErrors({});
      }
      
      setApiError(error);
    }
  };

  const handleCancel = () => {
    if (isEditing && spectrumId) {
      navigate(`/organizations/${spectrumId}`);
    } else {
      navigate('/organizations');
    }
  };

  const isLoading =
    isCreating || isUpdating || (isEditing && isLoadingOrganization);

  // Show loading state only for initial data fetch, not for form submission
  if (isEditing && isLoadingOrganization) {
    return (
      <div className='max-w-4xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-white mb-2'>
            Edit Organization
          </h1>
          <p className='text-white/60'>Loading organization details...</p>
        </div>

        <div className='flex items-center justify-center min-h-[400px]'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-white'></div>
        </div>
      </div>
    );
  }

  return (
    <FormPage
      title={isEditing ? 'Edit Organization' : 'Register Organization'}
      subtitle={
        isEditing
          ? 'Update your organization details'
          : 'Start building your Star Citizen organization'
      }
    >
      {/* Fetch Error Display - Only show when editing and can't load data */}
      {isEditing && fetchError && (
        <Paper
          variant='glass'
          size='lg'
          className='border-red-500/20 bg-red-500/10 mb-6'
        >
          <div className='flex items-center space-x-3 text-red-400'>
            <ExclamationTriangleIcon className='w-5 h-5 flex-shrink-0' />
            <div className='flex-1'>
              <p className='font-semibold'>Unable to load organization</p>
              <p className='text-sm text-red-400/80'>
                There was a problem loading the organization details. You can
                still edit the form below.
              </p>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetchOrganization()}
              className='border-red-500/30 text-red-400 hover:bg-red-500/10'
            >
              Retry
            </Button>
          </div>
        </Paper>
      )}

      {/* Form Submission Error Display */}
      {apiError && (
        <ErrorDisplay 
          error={apiError} 
          title="Failed to save organization"
          className="mb-6"
        />
      )}

      <form onSubmit={handleSubmit} className='space-y-8'>
        {/* Basic Information */}
        <Paper variant='glass' size='lg'>
          <div className='flex items-center gap-3 mb-6'>
            <BuildingOfficeIcon className='w-6 h-6 text-tertiary' />
            <h2 className='text-xl font-semibold text-primary'>
              Basic Information
            </h2>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <Input
              label='Spectrum ID'
              value={formData.rsi_org_id}
              onChange={value => {
                // Convert to uppercase and remove non-alphanumeric characters
                const cleanValue = value
                  .replace(/[^a-zA-Z0-9]/g, '')
                  .toUpperCase();
                // Limit to 20 characters
                const limitedValue = cleanValue.slice(0, 20);
                handleInputChange('rsi_org_id', limitedValue);
              }}
              placeholder='Enter your Spectrum organization ID'
              error={errors.rsi_org_id || ''}
              required
            />

            {!isEditing && (
              <div>
                <label className='block text-sm font-medium text-secondary mb-2'>
                  Verification Code
                </label>
                <div className='bg-glass-elevated p-3 rounded border border-[var(--color-accent-blue)]/30'>
                  <div className='flex items-center justify-between mb-3'>
                    <code className='text-[var(--color-accent-blue)] font-mono text-sm'>
                      {verificationData?.verification_code || 'Loading...'}
                    </code>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        navigator.clipboard.writeText(
                          verificationData?.verification_code || ''
                        )
                      }
                      disabled={!verificationData?.verification_code}
                      className='border-brand-secondary/30 text-brand-secondary hover:bg-brand-secondary'
                    >
                      Copy Code
                    </Button>
                  </div>

                  <div className='p-3 bg-blue-500/20 border border-blue-500/30 rounded mb-3'>
                    <p className='text-blue-300 text-xs'>
                      <strong>Note:</strong> Copy this code and place it in your
                      RSI organization's bio/content section to verify ownership
                      and enable organization creation.
                    </p>
                  </div>

                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      if (formData.rsi_org_id) {
                        window.open(
                          `https://robertsspaceindustries.com/en/orgs/${formData.rsi_org_id}/admin/content`,
                          '_blank'
                        );
                      }
                    }}
                    disabled={!formData.rsi_org_id}
                    className='w-full border-blue-500/30 text-blue-300 hover:bg-blue-500/30'
                  >
                    Open RSI Organization Admin
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Only show name field during editing - it will be auto-populated during creation */}
          {isEditing && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-6'>
              <Input
                label='Organization Name'
                value={formData.name || ''}
                onChange={value => handleInputChange('name', value)}
                placeholder='Enter organization name'
                error={errors.name || ''}
              />
            </div>
          )}

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-6'>
            <Input
              label='Website (Optional)'
              value={formData.website || ''}
              onChange={value => handleInputChange('website', value)}
              placeholder='https://example.com'
              type='url'
            />
          </div>

          {/* Only show description field during editing - it will be auto-populated during creation */}
          {isEditing && (
            <div className='mt-6'>
              <label className='block text-sm font-medium text-white/80 mb-2'>
                Description
              </label>
              <MarkdownEditor
                value={formData.description || ''}
                onChange={value =>
                  handleInputChange('description', value || '')
                }
                height={200}
                preview='edit'
              />
              {errors.description && (
                <p className='text-red-400 text-sm mt-1'>
                  {errors.description}
                </p>
              )}
            </div>
          )}
        </Paper>

        {/* Contact & Location */}
        <Paper variant='glass' size='lg'>
          <div className='flex items-center gap-3 mb-6'>
            <MapPinIcon className='w-6 h-6 text-white/60' />
            <h2 className='text-xl font-semibold text-white'>
              Contact & Location
            </h2>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <Input
              label='Discord Server (Optional)'
              value={formData.discord || ''}
              onChange={value => handleInputChange('discord', value)}
              placeholder='Discord invite link or server name'
            />

            <Input
              label='Location (Optional)'
              value={formData.location || ''}
              onChange={value => handleInputChange('location', value)}
              placeholder='Primary location or timezone'
            />
          </div>
        </Paper>

        {/* Language Settings */}
        <Paper variant='glass' size='lg'>
          <div className='flex items-center gap-3 mb-6'>
            <LanguageIcon className='w-6 h-6 text-white/60' />
            <h2 className='text-xl font-semibold text-white'>
              Language Support
            </h2>
          </div>

          <div>
            <label className='block text-sm font-medium text-white mb-2'>
              Supported Languages
            </label>
            <TagInput
              value={formData.languages}
              onChange={languages => handleInputChange('languages', languages)}
              suggestions={languageOptions.map(option => option.label)}
              placeholder='Add supported languages (e.g., English, German, French)'
              maxTags={10}
            />
            {errors.languages && (
              <p className='text-red-400 text-sm mt-1'>{errors.languages}</p>
            )}
            <p className='mt-1 text-xs text-white/50'>
              Select all languages your organization supports for communication
            </p>
          </div>
        </Paper>


        {/* Tags */}
        <Paper variant='glass' size='lg'>
          <div className='flex items-center gap-3 mb-6'>
            <TagIcon className='w-6 h-6 text-white/60' />
            <h2 className='text-xl font-semibold text-white'>Tags</h2>
          </div>

          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-white mb-2'>
                Playstyle Tags
              </label>
              <TagInput
                value={formData.playstyle_tags}
                onChange={tags => handleInputChange('playstyle_tags', tags)}
                suggestions={playstyleTags}
                placeholder='Add playstyle tags (e.g., Casual, Hardcore, Roleplay)'
                maxTags={15}
              />
              <p className='mt-1 text-xs text-white/50'>
                How your organization prefers to play (e.g., Casual, Hardcore, Roleplay, Competitive, Social, Military)
              </p>
            </div>

            <div>
              <label className='block text-sm font-medium text-white mb-2'>
                Focus Tags
              </label>
              <TagInput
                value={formData.focus_tags}
                onChange={tags => handleInputChange('focus_tags', tags)}
                suggestions={activityTags}
                placeholder='Add focus tags (e.g., Combat, Trading, Mining)'
                maxTags={15}
              />
              <p className='mt-1 text-xs text-white/50'>
                Primary activities and areas of focus (e.g., Combat, Trading, Mining, Exploration, Piracy, Bounty Hunting, Mercenary, Industrial, Medical, Science, Transport, Security)
              </p>
            </div>
          </div>

          <p className='mt-3 text-sm text-white/60'>
            Tags help other players find and understand your organization.
            Choose tags that best represent your focus areas, playstyle, and
            values.
          </p>
        </Paper>

        {/* Form Actions */}
        <div className='flex justify-end space-x-4'>
          <Button type='button' variant='secondary' onClick={handleCancel}>
            Cancel
          </Button>
          <Button type='submit' variant='primary' disabled={isLoading}>
            {isLoading
              ? 'Saving...'
              : isEditing
                ? 'Update Organization'
                : 'Register Organization'}
          </Button>
        </div>
      </form>
    </FormPage>
  );
};

export default OrganizationForm;
