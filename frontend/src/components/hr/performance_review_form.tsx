import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Paper from '../ui/Paper';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import RadioGroup from '../ui/RadioGroup';
import Chip from '../ui/Chip';
import { ComponentTitle, ComponentSubtitle, StatMedium } from '../ui/Typography';
import {
  useCreatePerformanceReviewMutation,
  useUpdatePerformanceReviewMutation,
  useGetPerformanceReviewsQuery,
} from '../../services/apiSlice';
import type { 
  CreatePerformanceReviewData, 
  PerformanceReview, 
  PerformanceGoal 
} from '../../types/hr';

interface PerformanceReviewFormProps {
  revieweeId: string;
  existingReview?: PerformanceReview;
  onSuccess?: (review: PerformanceReview) => void;
  onCancel?: () => void;
}

interface FormData {
  review_period_start: string;
  review_period_end: string;
  ratings: {
    [category: string]: {
      score: number;
      comments?: string;
    };
  };
  overall_rating: number;
  strengths: string[];
  areas_for_improvement: string[];
  goals: Omit<PerformanceGoal, 'id'>[];
}

interface FormErrors {
  review_period_start?: string;
  review_period_end?: string;
  ratings?: { [category: string]: string };
  overall_rating?: string;
  strengths?: string;
  areas_for_improvement?: string;
  goals?: string;
  submit?: string;
}

const RATING_CATEGORIES = [
  { key: 'leadership', label: 'Leadership & Initiative', description: 'Ability to lead and take initiative' },
  { key: 'teamwork', label: 'Teamwork & Collaboration', description: 'Works well with others' },
  { key: 'communication', label: 'Communication', description: 'Clear and effective communication' },
  { key: 'reliability', label: 'Reliability & Attendance', description: 'Consistent participation and reliability' },
  { key: 'skill_development', label: 'Skill Development', description: 'Growth and learning in Star Citizen skills' },
  { key: 'organization_contribution', label: 'Organization Contribution', description: 'Overall contribution to the organization' },
];

const RATING_OPTIONS = [
  { value: 1, label: '1 - Needs Improvement', description: 'Below expectations' },
  { value: 2, label: '2 - Developing', description: 'Approaching expectations' },
  { value: 3, label: '3 - Meets Expectations', description: 'Fully meets expectations' },
  { value: 4, label: '4 - Exceeds Expectations', description: 'Above expectations' },
  { value: 5, label: '5 - Outstanding', description: 'Exceptional performance' },
];

const PerformanceReviewForm: React.FC<PerformanceReviewFormProps> = ({
  revieweeId,
  existingReview,
  onSuccess,
  onCancel,
}) => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [createReview, { isLoading: isCreating }] = useCreatePerformanceReviewMutation();
  const [updateReview, { isLoading: isUpdating }] = useUpdatePerformanceReviewMutation();
  
  // Get historical reviews for comparison
  const { data: historicalReviews } = useGetPerformanceReviewsQuery(
    { 
      organizationId: organizationId!, 
      filters: { reviewee_id: revieweeId } 
    },
    { skip: !organizationId || !revieweeId }
  );

  const [formData, setFormData] = useState<FormData>({
    review_period_start: '',
    review_period_end: '',
    ratings: {},
    overall_rating: 3,
    strengths: [],
    areas_for_improvement: [],
    goals: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [newStrength, setNewStrength] = useState('');
  const [newImprovement, setNewImprovement] = useState('');
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target_date: '',
  });

  // Initialize form with existing review data
  useEffect(() => {
    if (existingReview) {
      setFormData({
        review_period_start: existingReview.review_period_start?.split('T')[0] || '',
        review_period_end: existingReview.review_period_end?.split('T')[0] || '',
        ratings: existingReview.ratings || {},
        overall_rating: existingReview.overall_rating,
        strengths: existingReview.strengths,
        areas_for_improvement: existingReview.areas_for_improvement,
        goals: existingReview.goals.map(goal => ({
          title: goal.title,
          description: goal.description,
          target_date: goal.target_date,
          status: goal.status,
          progress_percentage: goal.progress_percentage,
        })),
      });
    } else {
      // Initialize with default period (last 3 months)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      
      setFormData({
        review_period_start: startDate.toISOString().split('T')[0] || '',
        review_period_end: endDate.toISOString().split('T')[0] || '',
        ratings: RATING_CATEGORIES.reduce((acc, category) => ({
          ...acc,
          [category.key]: { score: 3, comments: '' }
        }), {} as { [key: string]: { score: number; comments?: string } }),
        overall_rating: 3,
        strengths: [],
        areas_for_improvement: [],
        goals: [],
      });
    }
  }, [existingReview]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.review_period_start) {
      newErrors.review_period_start = 'Review period start date is required';
    }

    if (!formData.review_period_end) {
      newErrors.review_period_end = 'Review period end date is required';
    }

    if (formData.review_period_start && formData.review_period_end) {
      if (new Date(formData.review_period_start) >= new Date(formData.review_period_end)) {
        newErrors.review_period_end = 'End date must be after start date';
      }
    }

    // Validate ratings
    const ratingErrors: { [key: string]: string } = {};
    RATING_CATEGORIES.forEach(category => {
      const rating = formData.ratings[category.key];
      if (!rating || rating.score < 1 || rating.score > 5) {
        ratingErrors[category.key] = 'Rating is required';
      }
    });

    if (Object.keys(ratingErrors).length > 0) {
      newErrors.ratings = ratingErrors;
    }

    if (formData.strengths.length === 0) {
      newErrors.strengths = 'At least one strength is required';
    }

    if (formData.areas_for_improvement.length === 0) {
      newErrors.areas_for_improvement = 'At least one area for improvement is required';
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
      const reviewData: CreatePerformanceReviewData = {
        reviewee_id: revieweeId,
        review_period_start: formData.review_period_start,
        review_period_end: formData.review_period_end,
        ratings: Object.fromEntries(
          Object.entries(formData.ratings).map(([key, value]) => [
            key,
            { score: value.score, comments: value.comments || '' }
          ])
        ),
        overall_rating: formData.overall_rating,
        strengths: formData.strengths,
        areas_for_improvement: formData.areas_for_improvement,
        goals: formData.goals,
      };

      let result;
      if (existingReview) {
        result = await updateReview({
          organizationId,
          reviewId: existingReview.id,
          data: reviewData,
        }).unwrap();
      } else {
        result = await createReview({
          organizationId,
          data: reviewData,
        }).unwrap();
      }

      onSuccess?.(result);
    } catch (error: any) {
      setErrors({
        submit: error?.data?.message || 'Failed to save performance review. Please try again.',
      });
    }
  };

  const handleRatingChange = (category: string, score: number) => {
    setFormData(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [category]: {
          ...prev.ratings[category],
          score,
        },
      },
    }));

    // Update overall rating as average
    const newRatings = { ...formData.ratings, [category]: { ...formData.ratings[category], score } };
    const scores = Object.values(newRatings).map(r => r.score).filter(s => s > 0);
    const average = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 3;
    
    setFormData(prev => ({ ...prev, overall_rating: average }));
  };

  const handleRatingCommentChange = (category: string, comments: string) => {
    setFormData(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [category]: {
          score: prev.ratings[category]?.score || 3,
          comments,
        },
      },
    }));
  };

  const addStrength = () => {
    if (newStrength.trim()) {
      setFormData(prev => ({
        ...prev,
        strengths: [...prev.strengths, newStrength.trim()],
      }));
      setNewStrength('');
    }
  };

  const removeStrength = (index: number) => {
    setFormData(prev => ({
      ...prev,
      strengths: prev.strengths.filter((_, i) => i !== index),
    }));
  };

  const addImprovement = () => {
    if (newImprovement.trim()) {
      setFormData(prev => ({
        ...prev,
        areas_for_improvement: [...prev.areas_for_improvement, newImprovement.trim()],
      }));
      setNewImprovement('');
    }
  };

  const removeImprovement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      areas_for_improvement: prev.areas_for_improvement.filter((_, i) => i !== index),
    }));
  };

  const addGoal = () => {
    if (newGoal.title.trim() && newGoal.description.trim() && newGoal.target_date) {
      setFormData(prev => ({
        ...prev,
        goals: [...prev.goals, {
          ...newGoal,
          status: 'not_started' as const,
          progress_percentage: 0,
        }],
      }));
      setNewGoal({ title: '', description: '', target_date: '' });
    }
  };

  const removeGoal = (index: number) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index),
    }));
  };

  const getHistoricalComparison = () => {
    if (!historicalReviews?.data || historicalReviews.data.length < 2) return null;

    const previousReview = historicalReviews.data
      .filter(r => r.id !== existingReview?.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!previousReview) return null;

    const currentOverall = formData.overall_rating;
    const previousOverall = previousReview.overall_rating;
    const difference = currentOverall - previousOverall;

    return (
      <Paper variant="glass-elevated" className="p-4">
        <ComponentTitle className="mb-3">Historical Comparison</ComponentTitle>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <StatMedium className="text-muted">{previousOverall}</StatMedium>
            <p className="text-xs text-tertiary">Previous</p>
          </div>
          <div>
            <StatMedium className={difference > 0 ? 'text-success' : difference < 0 ? 'text-error' : 'text-primary'}>
              {difference > 0 ? '+' : ''}{difference.toFixed(1)}
            </StatMedium>
            <p className="text-xs text-tertiary">Change</p>
          </div>
          <div>
            <StatMedium className="text-primary">{currentOverall}</StatMedium>
            <p className="text-xs text-tertiary">Current</p>
          </div>
        </div>
      </Paper>
    );
  };

  const isLoading = isCreating || isUpdating;

  return (
    <div className="space-y-[var(--spacing-section)]">
      {/* Header */}
      <Paper variant="glass" className="p-[var(--spacing-card-lg)]">
        <div className="flex justify-between items-start">
          <div>
            <ComponentTitle className="mb-2">
              {existingReview ? 'Edit Performance Review' : 'Create Performance Review'}
            </ComponentTitle>
            <ComponentSubtitle>
              Evaluate performance and set goals for continued growth
            </ComponentSubtitle>
          </div>
          {getHistoricalComparison()}
        </div>
      </Paper>

      <form onSubmit={handleSubmit} className="space-y-[var(--spacing-section)]">
        {/* Review Period */}
        <Paper variant="glass" className="p-[var(--spacing-card-lg)]">
          <ComponentTitle className="mb-4">Review Period</ComponentTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={formData.review_period_start}
              onChange={(value) => setFormData(prev => ({ ...prev, review_period_start: value }))}
              error={errors.review_period_start}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={formData.review_period_end}
              onChange={(value) => setFormData(prev => ({ ...prev, review_period_end: value }))}
              error={errors.review_period_end}
              required
            />
          </div>
        </Paper>

        {/* Ratings */}
        <Paper variant="glass" className="p-[var(--spacing-card-lg)]">
          <ComponentTitle className="mb-4">Performance Ratings</ComponentTitle>
          <div className="space-y-6">
            {RATING_CATEGORIES.map((category) => (
              <div key={category.key} className="space-y-4">
                <div>
                  <h4 className="font-semibold text-primary">{category.label}</h4>
                  <p className="text-sm text-secondary">{category.description}</p>
                </div>
                
                <RadioGroup
                  options={RATING_OPTIONS}
                  value={formData.ratings[category.key]?.score || 3}
                  onChange={(score) => handleRatingChange(category.key, score)}
                  variant="buttons"
                  size="sm"
                />
                
                <Textarea
                  placeholder={`Comments on ${category.label.toLowerCase()}...`}
                  value={formData.ratings[category.key]?.comments || ''}
                  onChange={(value) => handleRatingCommentChange(category.key, value)}
                  rows={2}
                  maxLength={500}
                />
                
                {errors.ratings?.[category.key] && (
                  <p className="text-error text-sm">{errors.ratings[category.key]}</p>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t border-glass-border">
            <div className="flex items-center justify-between">
              <ComponentSubtitle>Overall Rating</ComponentSubtitle>
              <div className="flex items-center gap-2">
                <StatMedium className="text-primary">{formData.overall_rating}</StatMedium>
                <Chip variant="status" size="sm">
                  {RATING_OPTIONS.find(opt => opt.value === formData.overall_rating)?.label.split(' - ')[1] || 'Average'}
                </Chip>
              </div>
            </div>
          </div>
        </Paper>

        {/* Strengths */}
        <Paper variant="glass" className="p-[var(--spacing-card-lg)]">
          <ComponentTitle className="mb-4">Strengths</ComponentTitle>
          
          {formData.strengths.length > 0 && (
            <div className="mb-4 space-y-2">
              {formData.strengths.map((strength, index) => (
                <Paper key={index} variant="glass-subtle" className="p-3">
                  <div className="flex justify-between items-start">
                    <span className="text-primary flex-1">{strength}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStrength(index)}
                      className="text-error hover:text-error ml-2"
                    >
                      Remove
                    </Button>
                  </div>
                </Paper>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              placeholder="Add a strength..."
              value={newStrength}
              onChange={setNewStrength}
              className="flex-1"
            />
            <Button
              variant="secondary"
              onClick={addStrength}
              disabled={!newStrength.trim()}
            >
              Add
            </Button>
          </div>
          
          {errors.strengths && (
            <p className="text-error text-sm mt-2">{errors.strengths}</p>
          )}
        </Paper>

        {/* Areas for Improvement */}
        <Paper variant="glass" className="p-[var(--spacing-card-lg)]">
          <ComponentTitle className="mb-4">Areas for Improvement</ComponentTitle>
          
          {formData.areas_for_improvement.length > 0 && (
            <div className="mb-4 space-y-2">
              {formData.areas_for_improvement.map((improvement, index) => (
                <Paper key={index} variant="glass-subtle" className="p-3">
                  <div className="flex justify-between items-start">
                    <span className="text-primary flex-1">{improvement}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImprovement(index)}
                      className="text-error hover:text-error ml-2"
                    >
                      Remove
                    </Button>
                  </div>
                </Paper>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              placeholder="Add an area for improvement..."
              value={newImprovement}
              onChange={setNewImprovement}
              className="flex-1"
            />
            <Button
              variant="secondary"
              onClick={addImprovement}
              disabled={!newImprovement.trim()}
            >
              Add
            </Button>
          </div>
          
          {errors.areas_for_improvement && (
            <p className="text-error text-sm mt-2">{errors.areas_for_improvement}</p>
          )}
        </Paper>

        {/* Goals */}
        <Paper variant="glass-elevated" className="p-[var(--spacing-card-lg)]">
          <ComponentTitle className="mb-4">Performance Goals</ComponentTitle>
          
          {formData.goals.length > 0 && (
            <div className="mb-6 space-y-4">
              {formData.goals.map((goal, index) => (
                <Paper key={index} variant="glass" className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-primary">{goal.title}</h4>
                      <p className="text-sm text-secondary mt-1">{goal.description}</p>
                      <p className="text-xs text-tertiary mt-2">
                        Target: {new Date(goal.target_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGoal(index)}
                      className="text-error hover:text-error ml-4"
                    >
                      Remove
                    </Button>
                  </div>
                </Paper>
              ))}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Goal Title"
                placeholder="e.g., Improve leadership skills"
                value={newGoal.title}
                onChange={(value) => setNewGoal(prev => ({ ...prev, title: value }))}
              />
              <Input
                label="Target Date"
                type="date"
                value={newGoal.target_date}
                onChange={(value) => setNewGoal(prev => ({ ...prev, target_date: value }))}
              />
            </div>
            <Textarea
              label="Goal Description"
              placeholder="Describe the goal and how it will be achieved..."
              value={newGoal.description}
              onChange={(value) => setNewGoal(prev => ({ ...prev, description: value }))}
              rows={3}
            />
            <Button
              variant="secondary"
              onClick={addGoal}
              disabled={!newGoal.title.trim() || !newGoal.description.trim() || !newGoal.target_date}
            >
              Add Goal
            </Button>
          </div>
        </Paper>

        {/* Submit Error */}
        {errors.submit && (
          <Paper variant="glass-subtle" className="p-4 border-error/20">
            <p className="text-error text-sm">{errors.submit}</p>
          </Paper>
        )}

        {/* Action Buttons */}
        <Paper variant="glass" className="p-[var(--spacing-card-lg)]">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              {isLoading ? 'Saving...' : existingReview ? 'Update Review' : 'Create Review'}
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
        </Paper>
      </form>
    </div>
  );
};

export default PerformanceReviewForm;