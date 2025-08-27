import React, { useState, useEffect } from 'react';
import { Button, Input, Textarea, Paper } from '../ui';
import { MapPinIcon } from '@heroicons/react/24/outline';

interface ProfileFormProps {
  initialData?: any;
  mode?: 'create' | 'edit';
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  initialData,
  mode = 'edit',
}) => {
  const [formData, setFormData] = useState({
    rsi_handle: '',
    location: '',
    bio: '',
    website_url: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        rsi_handle: initialData.rsi_handle || '',
        location: initialData.location || '',
        bio: initialData.bio || '',
        website_url: initialData.website_url || '',
      });
    }
  }, [initialData]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement actual API call
      console.log('Submitting profile data:', formData);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setIsEditing(false);
      // TODO: Show success message
    } catch (error) {
      console.error('Error updating profile:', error);
      // TODO: Show error message
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to initial data
    if (initialData) {
      setFormData({
        rsi_handle: initialData.rsi_handle || '',
        location: initialData.location || '',
        bio: initialData.bio || '',
        website_url: initialData.website_url || '',
      });
    }
  };

  return (
    <div className='max-w-4xl mx-auto space-y-[var(--spacing-card-lg)]'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-primary'>
            {mode === 'create' ? 'Create Profile' : 'Edit Profile'}
          </h1>
          <p className='text-tertiary mt-[var(--spacing-tight)]'>
            {mode === 'create'
              ? 'Set up your Star Citizen organization profile'
              : 'Update your profile information'}
          </p>
        </div>
        {mode === 'edit' && !isEditing && (
          <Button variant='primary' onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className='space-y-[var(--spacing-card-lg)]'
      >
        {/* Basic Information */}
        <Paper variant='glass-strong' size='lg'>
          <h2 className='text-lg font-semibold text-primary mb-[var(--spacing-element)]'>
            Basic Information
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-[var(--gap-grid-sm)]'>
            <Input
              label='RSI Handle'
              value={formData.rsi_handle}
              onChange={value => handleInputChange('rsi_handle', value)}
              placeholder='Your RSI handle (set through verification)'
              disabled
            />

            <Input
              label='Location'
              value={formData.location}
              onChange={value => handleInputChange('location', value)}
              placeholder='Enter your location'
              icon={<MapPinIcon className='w-4 h-4' />}
            />
          </div>
        </Paper>

        {/* Bio */}
        <Paper variant='glass-strong' size='lg'>
          <h2 className='text-lg font-semibold text-primary mb-[var(--spacing-element)]'>
            Bio
          </h2>
          <Textarea
            label='About Me'
            value={formData.bio}
            onChange={value => handleInputChange('bio', value)}
            placeholder='Tell us about yourself...'
            rows={4}
            maxLength={500}
          />
        </Paper>

        {/* Star Citizen Information */}
        <Paper variant='glass-strong' size='lg'>
          <h2 className='text-lg font-semibold text-primary mb-[var(--spacing-element)]'>
            Star Citizen Information
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-[var(--gap-grid-sm)]'>
            <Input
              label='RSI Handle'
              value={formData.rsi_handle}
              onChange={value => handleInputChange('rsi_handle', value)}
              placeholder='Enter your RSI handle'
            />
          </div>
        </Paper>

        {/* Additional Information */}
        <Paper variant='glass-strong' size='lg'>
          <h2 className='text-lg font-semibold text-primary mb-[var(--spacing-element)]'>
            Additional Information
          </h2>
          <div className='space-y-[var(--spacing-element)]'>
            <Input
              label='Website'
              value={formData.website_url}
              onChange={value => handleInputChange('website_url', value)}
              placeholder='Enter your website URL'
              type='url'
            />
          </div>
        </Paper>

        {/* Action Buttons */}
        {isEditing && (
          <div className='flex items-center justify-end gap-[var(--spacing-tight)]'>
            <Button
              type='button'
              variant='glass'
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type='submit' variant='primary' disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};

export default ProfileForm;
