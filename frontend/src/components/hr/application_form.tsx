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
  custom_fields?: Record<string, string | undefined>;
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
    // Clear submit error when user makes changes
    if (errors.submit) {
      const { submit, ...restErrors } = errors;
      setErrors(restErrors);
    }
  };

  const addCustomField = () => {
    if (customFieldKey.trim() && customFieldValue.trim()) {
      // Check if field already exists
      if (formData.custom_fields[customFieldKey.trim()]) {
        setErrors(prev => ({
          ...prev,
          custom_fields: {
            ...prev.custom_fields,
            [customFieldKey.trim()]: 'Field already exists'
          }
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        custom_fields: {
          ...prev.custom_fields,
          [customFieldKey.trim()]: customFieldValue.trim(),
        },
      }));
      setCustomFieldKey('');
      setCustomFieldValue('');
      
      // Clear any custom field errors
      if (errors.custom_fields) {
        const { custom_fields, ...restErrors } = errors;
        setErrors(restErrors);
      }
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
    <Paper variant="glass" size="lg" className="w-full max-w-4xl mx-auto glass-mobile-reduced">
      <div className="responsive-padding-x responsive-padding-y lg:p-[var(--spacing-card-lg)]">
        {/* Header Section */}
        <div className="mb-6 lg:mb-[var(--spacing-section)]">
          <h2 className="responsive-text-lg font-bold text-primary mb-[var(--spacing-tight)]">
            Submit Application
          </h2>
          <p className="responsive-text-sm text-secondary">
            Please fill out all required fields to submit your application to this organization.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-[var(--spacing-component)]">
          {/* Cover Letter Section */}
          <div className="space-y-[var(--spacing-element)]">
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
              size="lg"
            />
          </div>

          {/* Experience Section */}
          <div className="space-y-[var(--spacing-element)]">
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
              size="lg"
            />
          </div>

          {/* Availability Section */}
          <div className="space-y-[var(--spacing-element)]">
            <Textarea
              label="Availability"
              value={formData.availability}
              onChange={(value) => handleInputChange('availability', value)}
              placeholder="When are you typically available to play? Include timezone and preferred days/times..."
              required
              rows={3}
              maxLength={500}
              error={errors.availability}
              description="Include your timezone and preferred days/times"
              size="lg"
            />
          </div>

          {/* Custom Fields Section */}
          <div className="space-y-4 lg:space-y-[var(--spacing-element)]">
            <h3 className="responsive-text-base font-semibold text-primary mb-4 lg:mb-[var(--spacing-element)]">
              Additional Information
            </h3>
            
            {/* Display existing custom fields */}
            {Object.entries(formData.custom_fields).length > 0 && (
              <div className="space-y-[var(--spacing-tight)]">
                {Object.entries(formData.custom_fields).map(([key, value]) => (
                  <Paper key={key} variant="glass-subtle" size="sm" className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-primary text-sm">{key}:</span>
                      <span className="ml-[var(--spacing-tight)] text-secondary text-sm break-words">{value}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomField(key)}
                      className="text-error hover:text-error hover:bg-error/10 ml-[var(--spacing-tight)] flex-shrink-0"
                    >
                      Remove
                    </Button>
                  </Paper>
                ))}
              </div>
            )}

            {/* Add new custom field */}
            <Paper variant="glass-subtle" size="sm" className="space-y-4 lg:space-y-[var(--spacing-element)] glass-mobile-reduced">
              <h4 className="responsive-text-sm font-semibold text-primary">Add Custom Field</h4>
              <div className="responsive-grid-1-2 gap-4 lg:gap-[var(--spacing-element)]">
                <Input
                  label="Field Name"
                  value={customFieldKey}
                  onChange={(value) => {
                    setCustomFieldKey(value);
                    // Clear custom field errors when typing
                    if (errors.custom_fields?.[value.trim()]) {
                      const updatedCustomFields = { ...errors.custom_fields };
                      delete updatedCustomFields[value.trim()];
                      setErrors(prev => ({
                        ...prev,
                        custom_fields: updatedCustomFields
                      }));
                    }
                  }}
                  placeholder="e.g., Discord Username"
                  error={errors.custom_fields?.[customFieldKey.trim()]}
                />
                <Input
                  label="Field Value"
                  value={customFieldValue}
                  onChange={setCustomFieldValue}
                  placeholder="e.g., YourUsername#1234"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={addCustomField}
                  disabled={!customFieldKey.trim() || !customFieldValue.trim()}
                >
                  Add Field
                </Button>
              </div>
            </Paper>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <Paper variant="glass-subtle" className="p-[var(--spacing-element)] bg-error/10 border-error/20">
              <p className="text-error text-sm font-medium" role="alert">
                {errors.submit}
              </p>
            </Paper>
          )}

          {/* Action Buttons */}
          <div className="responsive-flex-col-row pt-4 lg:pt-[var(--spacing-component)] border-t border-glass-border">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="w-full sm:w-auto touch-friendly"
            >
              {isLoading ? 'Submitting Application...' : 'Submit Application'}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={onCancel}
                disabled={isLoading}
                className="w-full sm:w-auto touch-friendly"
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