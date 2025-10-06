import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Paper from '../ui/Paper';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { useCreateApplicationMutation } from '../../services/apiSlice';
import type { CreateApplicationData } from '../../types/hr';

interface ApplicationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  cover_letter: string;
  experience: string;
  availability: string;
  custom_fields: Record<string, string>;
}

interface FormErrors {
  cover_letter?: string;
  experience?: string;
  availability?: string;
  custom_fields?: Record<string, string>;
  submit?: string;
}

const ApplicationForm: React.FC<ApplicationFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [createApplication, { isLoading }] = useCreateApplicationMutation();

  const [formData, setFormData] = useState<FormData>({
    cover_letter: '',
    experience: '',
    availability: '',
    custom_fields: {},
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [customFieldKey, setCustomFieldKey] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.cover_letter.trim()) {
      newErrors.cover_letter = 'Cover letter is required';
    } else if (formData.cover_letter.length < 50) {
      newErrors.cover_letter = 'Cover letter must be at least 50 characters';
    }

    if (!formData.experience.trim()) {
      newErrors.experience = 'Experience description is required';
    } else if (formData.experience.length < 20) {
      newErrors.experience = 'Experience description must be at least 20 characters';
    }

    if (!formData.availability.trim()) {
      newErrors.availability = 'Availability information is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !organizationId) {
      return;
    }

    try {
      const applicationData: CreateApplicationData = {
        cover_letter: formData.cover_letter,
        experience: formData.experience,
        availability: formData.availability,
        custom_fields: formData.custom_fields,
      };

      await createApplication({
        organizationId,
        data: applicationData,
      }).unwrap();

      onSuccess?.();
    } catch (error: any) {
      setErrors({
        submit: error?.data?.message || 'Failed to submit application. Please try again.',
      });
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const addCustomField = () => {
    if (customFieldKey.trim() && customFieldValue.trim()) {
      setFormData(prev => ({
        ...prev,
        custom_fields: {
          ...prev.custom_fields,
          [customFieldKey.trim()]: customFieldValue.trim(),
        },
      }));
      setCustomFieldKey('');
      setCustomFieldValue('');
    }
  };

  const removeCustomField = (key: string) => {
    setFormData(prev => {
      const newCustomFields = { ...prev.custom_fields };
      delete newCustomFields[key];
      return { ...prev, custom_fields: newCustomFields };
    });
  };

  return (
    <Paper variant="glass" size="lg" className="w-full max-w-4xl mx-auto">
      <div className="p-[var(--spacing-card-lg)]">
        <div className="mb-[var(--spacing-section)]">
          <h2 className="text-2xl font-bold text-primary mb-2">
            Submit Application
          </h2>
          <p className="text-secondary">
            Please fill out all required fields to submit your application to this organization.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-[var(--spacing-section)]">
          {/* Cover Letter */}
          <div>
            <Textarea
              label="Cover Letter"
              value={formData.cover_letter}
              onChange={(value) => handleInputChange('cover_letter', value)}
              placeholder="Tell us why you want to join this organization and what you can contribute..."
              required
              rows={6}
              maxLength={2000}
              error={errors.cover_letter}
              description="Minimum 50 characters required"
            />
          </div>

          {/* Experience */}
          <div>
            <Textarea
              label="Star Citizen Experience"
              value={formData.experience}
              onChange={(value) => handleInputChange('experience', value)}
              placeholder="Describe your experience in Star Citizen, including ships owned, preferred activities, and any relevant skills..."
              required
              rows={4}
              maxLength={1500}
              error={errors.experience}
              description="Minimum 20 characters required"
            />
          </div>

          {/* Availability */}
          <div>
            <Textarea
              label="Availability"
              value={formData.availability}
              onChange={(value) => handleInputChange('availability', value)}
              placeholder="When are you typically available to play? Include timezone and preferred days/times..."
              required
              rows={3}
              maxLength={500}
              error={errors.availability}
            />
          </div>

          {/* Custom Fields */}
          <div>
            <h3 className="text-lg font-semibold text-primary mb-4">
              Additional Information
            </h3>
            
            {/* Display existing custom fields */}
            {Object.entries(formData.custom_fields).length > 0 && (
              <div className="mb-4 space-y-2">
                {Object.entries(formData.custom_fields).map(([key, value]) => (
                  <Paper key={key} variant="glass-subtle" className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="font-medium text-primary">{key}:</span>
                        <span className="ml-2 text-secondary">{value}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomField(key)}
                        className="text-error hover:text-error"
                      >
                        Remove
                      </Button>
                    </div>
                  </Paper>
                ))}
              </div>
            )}

            {/* Add new custom field */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Field Name"
                value={customFieldKey}
                onChange={setCustomFieldKey}
                placeholder="e.g., Discord Username"
              />
              <Input
                label="Field Value"
                value={customFieldValue}
                onChange={setCustomFieldValue}
                placeholder="e.g., YourUsername#1234"
              />
            </div>
            <div className="mt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={addCustomField}
                disabled={!customFieldKey.trim() || !customFieldValue.trim()}
              >
                Add Field
              </Button>
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-4 rounded-[var(--radius-glass-lg)] bg-error/10 border border-error/20">
              <p className="text-error text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-[var(--spacing-section)] border-t border-glass-border">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              {isLoading ? 'Submitting...' : 'Submit Application'}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
    </Paper>
  );
};

export default ApplicationForm;