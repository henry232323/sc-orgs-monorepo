import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Paper from '../ui/Paper';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import Select, { SelectOption } from '../ui/Select';
import RadioGroup from '../ui/RadioGroup';
import Chip from '../ui/Chip';
import { ComponentTitle, ComponentSubtitle, StatMedium } from '../ui/Typography';
import {
  useCreatePerformanceReviewMutation,
  useUpdatePerformanceReviewMutation,
  useGetSkillsQuery,
  useGetPerformanceReviewsQuery,
  useGetOrganizationMembersQuery,
} from '../../services/apiSlice';
import type { 
  CreatePerformanceReviewData, 
  PerformanceReview, 
  PerformanceGoal,
  Skill,
} from '../../types/hr';

interface PerformanceReviewFormProps {
  existingReview?: PerformanceReview;
  onSuccess?: (review: PerformanceReview) => void;
  onCancel?: () => void;
}

interface Member {
  id: string;
  rsi_handle: string;
}

interface FormData {
  reviewee_id: string;
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
  reviewee_id?: string;
  review_period_start?: string;
  review_period_end?: string;
  ratings?: { [category: string]: string };
  overall_rating?: string;
  strengths?: string;
  areas_for_improvement?: string;
  goals?: string;
  submit?: string;
}

const RATING_OPTIONS = [
  { value: 1, label: '1 - Needs Improvement', description: 'Below expectations' },
  { value: 2, label: '2 - Developing', description: 'Approaching expectations' },
  { value: 3, label: '3 - Meets Expectations', description: 'Fully meets expectations' },
  { value: 4, label: '4 - Exceeds Expectations', description: 'Above expectations' },
  { value: 5, label: '5 - Outstanding', description: 'Exceptional performance' },
];

const PerformanceReviewForm: React.FC<PerformanceReviewFormProps> = ({
  existingReview,
  onSuccess,
  onCancel,
}) => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [createReview, { isLoading: isCreating }] = useCreatePerformanceReviewMutation();
  const [updateReview, { isLoading: isUpdating }] = useUpdatePerformanceReviewMutation();
  
  // Member selection state
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // API queries
  const { 
    data: skillsResponse, 
    isLoading: skillsLoading, 
    error: skillsError,
    refetch: refetchSkills
  } = useGetSkillsQuery(
    { 
      organizationId: organizationId!,
      page: 1,
      limit: 1000, // Get all skills for performance review
      filters: {}
    },
    { skip: !organizationId }
  );
  const skills = skillsResponse?.data || [];

  const { data: membersResponse } = useGetOrganizationMembersQuery(
    organizationId!,
    { skip: !organizationId }
  );
  const allMembers = membersResponse || [];
  

  
  // Get historical reviews for comparison
  const { data: historicalReviews } = useGetPerformanceReviewsQuery(
    { 
      organizationId: organizationId!, 
      ...(selectedMember?.id && { filters: { reviewee_id: selectedMember.id } })
    },
    { skip: !organizationId || !selectedMember?.id }
  );

  const [formData, setFormData] = useState<FormData>({
    reviewee_id: '',
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
  // Initialize ratings when skills are loaded
  useEffect(() => {
    if (skills.length > 0 && Object.keys(formData.ratings).length === 0) {
      setFormData(prev => ({
        ...prev,
        ratings: skills.reduce((acc: { [key: string]: { score: number; comments?: string } }, skill: Skill) => ({
          ...acc,
          [skill.id]: { score: 3, comments: '' }
        }), {})
      }));
    }
  }, [skills, formData.ratings]);

  // Initialize form with default values or existing review
  useEffect(() => {
    if (existingReview) {
      setSelectedMember({ id: existingReview.reviewee_id, rsi_handle: 'Loading...' });
      setFormData({
        reviewee_id: existingReview.reviewee_id,
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
        reviewee_id: '',
        review_period_start: startDate.toISOString().split('T')[0] || '',
        review_period_end: endDate.toISOString().split('T')[0] || '',
        ratings: {},
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

    // Validate member selection
    if (!selectedMember) {
      newErrors.reviewee_id = 'Please select a member to review';
    }

    // Validate ratings for each skill
    const ratingErrors: { [key: string]: string } = {};
    skills.forEach(skill => {
      const rating = formData.ratings[skill.id];
      if (!rating || rating.score < 1 || rating.score > 5) {
        ratingErrors[skill.id] = 'Rating is required';
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
        reviewee_id: selectedMember!.id,
        review_period_start: formData.review_period_start,
        review_period_end: formData.review_period_end,
        ratings: Object.fromEntries(
          Object.entries(formData.ratings).map(([key, value]: [string, { score: number; comments?: string }]) => [
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
    const scores = Object.values(newRatings).map((r: { score: number }) => r.score).filter((s: number) => s > 0);
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
    <div className="space-y-4 lg:space-y-[var(--spacing-section)] responsive-container">
      {/* Header */}
      <Paper variant="glass" className="responsive-padding-x responsive-padding-y lg:p-[var(--spacing-card-lg)] glass-mobile-reduced">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="flex-1">
            <ComponentTitle className="mb-2 responsive-text-lg">
              {existingReview ? 'Edit Performance Review' : 'Create Performance Review'}
            </ComponentTitle>
            <ComponentSubtitle className="responsive-text-sm">
              Evaluate performance and set goals for continued growth
            </ComponentSubtitle>
          </div>
          <div className="w-full lg:w-auto">
            {getHistoricalComparison()}
          </div>
        </div>
      </Paper>

      <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-[var(--spacing-section)]">
        {/* Member Selection */}
        <Paper variant="glass" className="responsive-padding-x responsive-padding-y lg:p-[var(--spacing-card-lg)] glass-mobile-reduced">
          <ComponentTitle className="mb-[var(--spacing-element)] responsive-text-lg">Select Member</ComponentTitle>
          <Select
            label="Member to Review"
            value={selectedMember?.id || ''}
            onChange={(value) => {
              const member = allMembers.find((m: Member) => m.id === value);
              setSelectedMember(member || null);
              setFormData(prev => ({ ...prev, reviewee_id: value as string }));
            }}
            options={allMembers.map((member: Member): SelectOption => ({
              value: member.id,
              label: member.rsi_handle,
            }))}
            placeholder="Select a member to review..."
            required
            {...(errors.reviewee_id && { error: errors.reviewee_id })}
            description="Choose the organization member you want to review"
          />
        </Paper>

        {/* Review Period */}
        <Paper variant="glass" className="responsive-padding-x responsive-padding-y lg:p-[var(--spacing-card-lg)] glass-mobile-reduced">
          <ComponentTitle className="mb-[var(--spacing-element)] responsive-text-lg">Review Period</ComponentTitle>
          <div className="responsive-grid-1-2 gap-4 lg:gap-[var(--spacing-element)]">
            <Input
              label="Start Date"
              type="date"
              value={formData.review_period_start}
              onChange={(value) => setFormData(prev => ({ ...prev, review_period_start: value }))}
              {...(errors.review_period_start && { error: errors.review_period_start })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={formData.review_period_end}
              onChange={(value) => setFormData(prev => ({ ...prev, review_period_end: value }))}
              {...(errors.review_period_end && { error: errors.review_period_end })}
              required
            />
          </div>
        </Paper>

        {/* Ratings */}
        <Paper variant="glass" className="responsive-padding-x responsive-padding-y lg:p-[var(--spacing-card-lg)] glass-mobile-reduced">
          <ComponentTitle className="mb-[var(--spacing-element)] responsive-text-lg">Performance Ratings</ComponentTitle>
          
          {/* Skills loading state */}
          {skillsLoading && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-glass-subtle rounded-lg">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-blue"></div>
                <ComponentSubtitle className="text-secondary">Loading skills for evaluation...</ComponentSubtitle>
              </div>
              {/* Loading skeleton */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <Paper variant="glass-subtle" className="p-4">
                    <div className="h-4 bg-white/10 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-white/5 rounded w-2/3 mb-3"></div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <div key={j} className="h-8 w-12 bg-white/5 rounded"></div>
                      ))}
                    </div>
                  </Paper>
                </div>
              ))}
            </div>
          )}
          
          {/* Skills error state */}
          {skillsError && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-error" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <ComponentSubtitle className="text-error">Failed to load skills</ComponentSubtitle>
                    <p className="text-sm text-error/80">Unable to load organization skills for performance evaluation.</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchSkills()}
                  className="text-error hover:bg-error/10"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
          
          {/* No skills available */}
          {!skillsLoading && !skillsError && skills.length === 0 && (
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <ComponentSubtitle className="text-warning">No skills defined</ComponentSubtitle>
                  <p className="text-sm text-warning/80">This organization has no skills defined yet. Skills are required to create performance reviews.</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Skills list */}
          {!skillsLoading && !skillsError && skills.length > 0 && (
            <div className="space-y-4 lg:space-y-[var(--spacing-component)]">
              {skills.map((skill: Skill) => (
              <Paper key={skill.id} variant="glass-subtle" className="responsive-padding-x responsive-padding-y lg:p-[var(--spacing-card)] glass-mobile-reduced">
                <div className="space-y-[var(--spacing-element)]">
                  <div>
                    <h4 className="font-semibold text-primary mb-[var(--spacing-tight)]">{skill.name}</h4>
                    <p className="text-sm text-secondary mb-[var(--spacing-tight)]">{skill.description || `${skill.category} skill`}</p>
                    <Chip variant="default" size="sm" className="text-tertiary">
                      {skill.category}
                    </Chip>
                  </div>
                  
                  <RadioGroup
                    options={RATING_OPTIONS}
                    value={formData.ratings[skill.id]?.score || 3}
                    onChange={(score) => handleRatingChange(skill.id, score)}
                    variant="buttons"
                    size="sm"
                  />
                  
                  <Textarea
                    placeholder={`Comments on ${skill.name.toLowerCase()}...`}
                    value={formData.ratings[skill.id]?.comments || ''}
                    onChange={(value) => handleRatingCommentChange(skill.id, value)}
                    rows={2}
                    maxLength={500}
                    {...(errors.ratings?.[skill.id] && { error: errors.ratings[skill.id] })}
                  />
                </div>
              </Paper>
              ))}
            </div>
          )}
          
          {/* Overall Rating - only show if skills are loaded */}
          {!skillsLoading && !skillsError && skills.length > 0 && (
            <div className="mt-[var(--spacing-component)] pt-[var(--spacing-component)] border-t border-glass-border">
              <div className="flex items-center justify-between">
                <ComponentSubtitle>Overall Rating</ComponentSubtitle>
                <div className="flex items-center gap-[var(--spacing-tight)]">
                  <StatMedium className="text-primary">{formData.overall_rating}</StatMedium>
                  <Chip variant="status" size="sm">
                    {RATING_OPTIONS.find(opt => opt.value === formData.overall_rating)?.label.split(' - ')[1] || 'Average'}
                  </Chip>
                </div>
              </div>
            </div>
          )}
        </Paper>

        {/* Strengths */}
        <Paper variant="glass" className="p-[var(--spacing-card-lg)]">
          <ComponentTitle className="mb-[var(--spacing-element)]">Strengths</ComponentTitle>
          
          {formData.strengths.length > 0 && (
            <div className="mb-[var(--spacing-element)] space-y-[var(--spacing-tight)]">
              {formData.strengths.map((strength, index) => (
                <Paper key={index} variant="glass-subtle" className="p-[var(--spacing-card)]">
                  <div className="flex justify-between items-start gap-[var(--spacing-tight)]">
                    <span className="text-primary flex-1">{strength}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStrength(index)}
                      className="text-error hover:text-error"
                    >
                      Remove
                    </Button>
                  </div>
                </Paper>
              ))}
            </div>
          )}
          
          <div className="flex gap-[var(--spacing-tight)]">
            <Input
              placeholder="Add a strength..."
              value={newStrength}
              onChange={setNewStrength}
              className="flex-1"
              {...(errors.strengths && { error: errors.strengths })}
            />
            <Button
              variant="secondary"
              onClick={addStrength}
              disabled={!newStrength.trim()}
            >
              Add
            </Button>
          </div>
        </Paper>

        {/* Areas for Improvement */}
        <Paper variant="glass" className="p-[var(--spacing-card-lg)]">
          <ComponentTitle className="mb-[var(--spacing-element)]">Areas for Improvement</ComponentTitle>
          
          {formData.areas_for_improvement.length > 0 && (
            <div className="mb-[var(--spacing-element)] space-y-[var(--spacing-tight)]">
              {formData.areas_for_improvement.map((improvement, index) => (
                <Paper key={index} variant="glass-subtle" className="p-[var(--spacing-card)]">
                  <div className="flex justify-between items-start gap-[var(--spacing-tight)]">
                    <span className="text-primary flex-1">{improvement}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImprovement(index)}
                      className="text-error hover:text-error"
                    >
                      Remove
                    </Button>
                  </div>
                </Paper>
              ))}
            </div>
          )}
          
          <div className="flex gap-[var(--spacing-tight)]">
            <Input
              placeholder="Add an area for improvement..."
              value={newImprovement}
              onChange={setNewImprovement}
              className="flex-1"
              {...(errors.areas_for_improvement && { error: errors.areas_for_improvement })}
            />
            <Button
              variant="secondary"
              onClick={addImprovement}
              disabled={!newImprovement.trim()}
            >
              Add
            </Button>
          </div>
        </Paper>

        {/* Goals */}
        <Paper variant="glass-elevated" className="p-[var(--spacing-card-lg)]">
          <ComponentTitle className="mb-[var(--spacing-element)]">Performance Goals</ComponentTitle>
          
          {formData.goals.length > 0 && (
            <div className="mb-[var(--spacing-component)] space-y-[var(--spacing-element)]">
              {formData.goals.map((goal, index) => (
                <Paper key={index} variant="glass" className="p-[var(--spacing-card)]">
                  <div className="flex justify-between items-start gap-[var(--spacing-element)]">
                    <div className="flex-1">
                      <h4 className="font-semibold text-primary mb-[var(--spacing-tight)]">{goal.title}</h4>
                      <p className="text-sm text-secondary mb-[var(--spacing-tight)]">{goal.description}</p>
                      <Chip variant="default" size="sm" className="text-tertiary">
                        Target: {new Date(goal.target_date).toLocaleDateString()}
                      </Chip>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGoal(index)}
                      className="text-error hover:text-error"
                    >
                      Remove
                    </Button>
                  </div>
                </Paper>
              ))}
            </div>
          )}
          
          <div className="space-y-[var(--spacing-element)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-element)]">
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
          <Paper variant="glass-subtle" className="p-[var(--spacing-card)] border border-error/20 bg-error/10">
            <div className="flex items-start gap-[var(--spacing-tight)]">
              <svg className="h-5 w-5 text-error flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-error text-sm">{errors.submit}</p>
            </div>
          </Paper>
        )}

        {/* Action Buttons */}
        <Paper variant="glass" className="responsive-padding-x responsive-padding-y lg:p-[var(--spacing-card-lg)] glass-mobile-reduced">
          <div className="responsive-flex-col-row">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="w-full sm:w-auto touch-friendly"
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
                className="w-full sm:w-auto touch-friendly"
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