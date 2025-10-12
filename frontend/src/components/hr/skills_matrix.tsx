import React, { useState } from 'react';
import {
  Button,
  Paper,
  Chip,
  Dialog,
  Input,
  Textarea,
  Select,
  Checkbox,
  SectionTitle,
  ComponentTitle,
  ComponentSubtitle,
  StatMedium,
  StatSmall,
  DataStateWrapper,
  EmptyState,
} from '../ui';
import {
  useGetSkillsQuery,
  useCreateSkillMutation,
  useAddUserSkillMutation,
  useVerifySkillMutation,
  useGetSkillsAnalyticsQuery,
  useGetHREventAnalyticsQuery,
} from '../../services/apiSlice';
import { useSkillsStatisticsWithRetry } from '../../hooks/useHRQuery';
import HRErrorBoundary from './HRErrorBoundary';
import type { Skill, UserSkill, CreateSkillData, CreateUserSkillData, SkillFilters } from '../../types/hr';
import {
  AcademicCapIcon,
  PlusIcon,
  CheckBadgeIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  FunnelIcon,
  StarIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface SkillsMatrixProps {
  organizationId: string;
}

const SkillsMatrix: React.FC<SkillsMatrixProps> = ({ organizationId }) => {
  // State for modals and forms
  const [showCreateSkillModal, setShowCreateSkillModal] = useState(false);
  const [showAddUserSkillModal, setShowAddUserSkillModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);

  // Filter state
  const [filters, setFilters] = useState<SkillFilters>({});

  // Form state
  const [skillFormData, setSkillFormData] = useState<CreateSkillData>({
    name: '',
    category: 'pilot',
    description: '',
    verification_required: false,
  });

  const [userSkillFormData, setUserSkillFormData] = useState<CreateUserSkillData>({
    skill_id: '',
    proficiency_level: 'beginner',
    notes: '',
  });

  // Retry tracking for skills loading
  const [skillsRetryCount, setSkillsRetryCount] = useState(0);

  // Fetch data with enhanced error handling
  const { 
    data: skillsData, 
    isLoading: skillsLoading, 
    error: skillsError,
    refetch: refetchSkills
  } = useGetSkillsQuery({
    organizationId,
    page,
    limit: 20,
    filters,
  });

  // Separate query for all skills (for dropdown usage)
  const { 
    data: allSkillsData, 
    isLoading: allSkillsLoading, 
    error: allSkillsError,
    refetch: refetchAllSkills
  } = useGetSkillsQuery({
    organizationId,
    page: 1,
    limit: 1000, // Get all skills for dropdown
    filters: {}, // No filters for dropdown
  });

  const { 
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useGetSkillsAnalyticsQuery({
    organizationId,
  });

  // Use enhanced skills statistics query with retry
  const {
    data: skillsStatistics,
    isLoading: statisticsLoading,
    error: statisticsError,
    retry: retryStatistics,
    isRetrying: statisticsRetrying,
    canRetry: canRetryStatistics
  } = useSkillsStatisticsWithRetry({
    organizationId,
  });

  // Get HR event analytics for skill development tracking
  const { 
    data: eventAnalytics,
  } = useGetHREventAnalyticsQuery({
    organizationId,
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // Last 90 days
    endDate: new Date().toISOString(),
  });

  // Mutations
  const [createSkill] = useCreateSkillMutation();
  const [addUserSkill] = useAddUserSkillMutation();
  const [verifySkill] = useVerifySkillMutation();

  // Skill categories
  const skillCategories = [
    { value: 'pilot', label: 'Pilot', description: 'Ship piloting and navigation' },
    { value: 'engineer', label: 'Engineer', description: 'Technical and engineering skills' },
    { value: 'medic', label: 'Medic', description: 'Medical and rescue operations' },
    { value: 'security', label: 'Security', description: 'Combat and security operations' },
    { value: 'logistics', label: 'Logistics', description: 'Supply chain and logistics' },
    { value: 'leadership', label: 'Leadership', description: 'Management and leadership' },
  ];

  // Proficiency levels
  const proficiencyLevels = [
    { value: 'beginner', label: 'Beginner', description: 'Basic understanding' },
    { value: 'intermediate', label: 'Intermediate', description: 'Solid working knowledge' },
    { value: 'advanced', label: 'Advanced', description: 'Expert level skills' },
    { value: 'expert', label: 'Expert', description: 'Master level expertise' },
  ];

  // Get category color using design system colors
  const getCategoryColor = (category: Skill['category']) => {
    switch (category) {
      case 'pilot':
        return 'bg-accent-blue/20 text-accent-blue border-accent-blue/30';
      case 'engineer':
        return 'bg-success/20 text-success border-success/30';
      case 'medic':
        return 'bg-error/20 text-error border-error/30';
      case 'security':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'logistics':
        return 'bg-brand-secondary/20 text-brand-secondary border-brand-secondary/30';
      case 'leadership':
        return 'bg-brand-primary/20 text-brand-primary border-brand-primary/30';
      default:
        return 'bg-muted/20 text-muted border-muted/30';
    }
  };



  // Handle create skill
  const handleCreateSkill = async () => {
    if (!skillFormData.name.trim()) return;

    try {
      await createSkill({
        organizationId,
        data: skillFormData,
      }).unwrap();
      
      // Reset form and close modal
      setSkillFormData({
        name: '',
        category: 'pilot',
        description: '',
        verification_required: false,
      });
      setShowCreateSkillModal(false);
    } catch (error) {
      console.error('Failed to create skill:', error);
      // TODO: Add user-friendly error notification
      // This could be enhanced with a toast notification system
    }
  };

  // Handle skills retry with tracking
  const handleSkillsRetry = () => {
    setSkillsRetryCount(prev => prev + 1);
    refetchAllSkills();
  };

  // Handle add user skill
  const handleAddUserSkill = async () => {
    if (!userSkillFormData.skill_id) return;

    try {
      await addUserSkill({
        organizationId,
        data: userSkillFormData,
      }).unwrap();
      
      // Reset form and close modal
      setUserSkillFormData({
        skill_id: '',
        proficiency_level: 'beginner',
        notes: '',
      });
      setShowAddUserSkillModal(false);
    } catch (error) {
      console.error('Failed to add user skill:', error);
      // TODO: Add user-friendly error notification
      // This could be enhanced with a toast notification system
    }
  };

  // Handle skill verification
  const handleVerifySkill = async (skillId: string, verified: boolean) => {
    try {
      await verifySkill({
        organizationId,
        skillId,
        data: { verified },
      }).unwrap();
    } catch (error) {
      console.error('Failed to verify skill:', error);
      // TODO: Add user-friendly error notification
      // This could be enhanced with a toast notification system
    }
  };

  // Skills grouping is now handled inside DataStateWrapper

  return (
    <HRErrorBoundary 
      componentName="Skills Matrix"
      organizationId={organizationId}
      enableRetry={true}
    >
      <div className='space-y-[var(--spacing-section)]'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <SectionTitle>Skills Matrix</SectionTitle>
        <div className='flex items-center gap-[var(--gap-button)]'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setShowFilters(!showFilters)}
          >
            <FunnelIcon className='w-4 h-4 mr-2' />
            Filters
          </Button>
          <Button
            variant='secondary'
            size='sm'
            onClick={() => setShowAddUserSkillModal(true)}
          >
            <UserGroupIcon className='w-4 h-4 mr-2' />
            Add User Skill
          </Button>
          <Button
            variant='primary'
            size='sm'
            onClick={() => setShowCreateSkillModal(true)}
          >
            <PlusIcon className='w-4 h-4 mr-2' />
            New Skill
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      <DataStateWrapper
        data={analyticsData}
        isLoading={analyticsLoading}
        error={analyticsError}
        isEmpty={(data) => !data}
        loadingProps={{
          variant: 'card',
          skeletonCount: 4,
          title: 'Loading Analytics',
        }}
        errorProps={{
          title: 'Analytics Unavailable',
          description: 'Unable to load skills analytics at the moment. This might be a temporary issue.',
          showRetry: true,
          retryText: 'Retry Analytics',
        }}
        onRetry={() => refetchAnalytics()}
      >
        {(analyticsData) => (
          <div className='grid grid-cols-1 md:grid-cols-4 gap-[var(--gap-grid-md)]'>
            <Paper variant='glass' size='md' className='text-center'>
              <AcademicCapIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
              <StatMedium className='mb-1'>
                {analyticsData?.total_skills_tracked || 0}
              </StatMedium>
              <ComponentSubtitle className='text-tertiary'>
                Total Skills
              </ComponentSubtitle>
            </Paper>

            <Paper variant='glass' size='md' className='text-center'>
              <CheckBadgeIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
              <StatMedium className='mb-1'>
                {((analyticsData?.verification_rate || 0) * 100).toFixed(0)}%
              </StatMedium>
              <ComponentSubtitle className='text-tertiary'>
                Verified Skills
            </ComponentSubtitle>
          </Paper>

          <Paper variant='glass' size='md' className='text-center'>
            <ChartBarIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
            <StatMedium className='mb-1'>
              {analyticsData?.skill_gaps?.length || 0}
            </StatMedium>
            <ComponentSubtitle className='text-tertiary'>
              Skill Gaps
            </ComponentSubtitle>
          </Paper>

          <Paper variant='glass' size='md' className='text-center'>
            <StarIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
            <StatMedium className='mb-1'>
              {analyticsData?.skill_gaps?.reduce((acc, gap) => acc + gap.current_count, 0) || 0}
            </StatMedium>
            <ComponentSubtitle className='text-tertiary'>
              Skilled Members
            </ComponentSubtitle>
          </Paper>
        </div>
        )}
      </DataStateWrapper>

      {/* Event-Based Skill Development */}
      {eventAnalytics && (
        <Paper variant='glass' size='lg'>
          <ComponentTitle className='mb-[var(--spacing-card-lg)]'>
            Event-Based Skill Development
          </ComponentTitle>
          
          <div className='grid grid-cols-1 md:grid-cols-3 gap-[var(--gap-grid-md)] mb-6'>
            <Paper variant='glass-subtle' size='md' className='text-center'>
              <AcademicCapIcon className='w-8 h-8 text-accent-blue mx-auto mb-3' />
              <StatMedium className='mb-1 text-accent-blue'>
                {eventAnalytics.skill_development.skill_verifications_earned}
              </StatMedium>
              <ComponentSubtitle className='text-tertiary'>
                Skills Verified via Events
              </ComponentSubtitle>
            </Paper>
            
            <Paper variant='glass-subtle' size='md' className='text-center'>
              <CheckBadgeIcon className='w-8 h-8 text-success mx-auto mb-3' />
              <StatMedium className='mb-1 text-success'>
                {eventAnalytics.skill_development.training_events_attended}
              </StatMedium>
              <ComponentSubtitle className='text-tertiary'>
                Training Events Attended
              </ComponentSubtitle>
            </Paper>
            
            <Paper variant='glass-subtle' size='md' className='text-center'>
              <StarIcon className='w-8 h-8 text-brand-secondary mx-auto mb-3' />
              <StatMedium className='mb-1 text-brand-secondary'>
                {eventAnalytics.skill_development.skills_demonstrated.length}
              </StatMedium>
              <ComponentSubtitle className='text-tertiary'>
                Skills Demonstrated
              </ComponentSubtitle>
            </Paper>
          </div>

          {/* Skills Demonstrated in Events */}
          {eventAnalytics.skill_development.skills_demonstrated.length > 0 && (
            <div>
              <ComponentSubtitle className='mb-4'>Skills Demonstrated in Recent Events</ComponentSubtitle>
              <div className='flex flex-wrap gap-2'>
                {eventAnalytics.skill_development.skills_demonstrated.map((skill, index) => (
                  <Chip
                    key={index}
                    variant='status'
                    size='sm'
                    className='bg-brand-secondary/20 text-brand-secondary'
                  >
                    {skill}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </Paper>
      )}

      {/* Filters */}
      {showFilters && (
        <Paper variant='glass-subtle' size='lg'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-[var(--gap-grid-md)]'>
            <div>
              <ComponentSubtitle className='text-tertiary mb-2'>
                Category
              </ComponentSubtitle>
              <Select
                value={filters.category || ''}
                onChange={(value) => {
                  const newFilters = { ...filters };
                  if (value && typeof value === 'string') {
                    newFilters.category = value as Skill['category'];
                  } else {
                    delete newFilters.category;
                  }
                  setFilters(newFilters);
                }}
                options={[
                  { value: '', label: 'All Categories' },
                  ...skillCategories,
                ]}
                placeholder='Filter by category'
                className='w-full'
              />
            </div>

            <div>
              <ComponentSubtitle className='text-tertiary mb-2'>
                Verification Status
              </ComponentSubtitle>
              <Select
                value={filters.verified?.toString() || ''}
                onChange={(value) => {
                  const newFilters = { ...filters };
                  if (value === '' || typeof value !== 'string') {
                    delete newFilters.verified;
                  } else {
                    newFilters.verified = value === 'true';
                  }
                  setFilters(newFilters);
                }}
                options={[
                  { value: '', label: 'All Skills' },
                  { value: 'true', label: 'Verified Only' },
                  { value: 'false', label: 'Unverified Only' },
                ]}
                placeholder='Filter by verification'
                className='w-full'
              />
            </div>

            <div>
              <ComponentSubtitle className='text-tertiary mb-2'>
                Actions
              </ComponentSubtitle>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setFilters({})}
                className='w-full'
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Paper>
      )}

      {/* Skills by Category */}
      <DataStateWrapper
        data={skillsData}
        isLoading={skillsLoading}
        error={skillsError}
        onRetry={() => refetchSkills()}
        isEmpty={(data) => !data?.data || data.data.length === 0}
        loadingProps={{
          title: 'Loading Skills Matrix',
          description: 'Fetching organization skills and member capabilities...',
          variant: 'card',
          skeletonCount: 6,
        }}
        errorProps={{
          title: 'Failed to Load Skills',
          description: 'Unable to fetch skills data. This could be due to a network issue or server problem. Please try again.',
          showRetry: true,
          retryText: 'Retry Loading Skills',
        }}
        emptyProps={{
          variant: 'no-skills',
          title: 'No Skills Defined',
          description: 'Start building your organization\'s skills matrix by adding the first skill.',
          action: {
            label: 'Create First Skill',
            onClick: () => setShowCreateSkillModal(true),
            variant: 'primary',
          },
        }}
      >
        {(skillsData) => {
          const skillsByCategory = skillsData?.data?.reduce((acc, skill) => {
            if (!acc[skill.category]) acc[skill.category] = [];
            acc[skill.category]!.push(skill);
            return acc;
          }, {} as Record<string, Skill[]>) || {};

          return (
            <div className='space-y-[var(--spacing-section)]'>
              {Object.keys(skillsByCategory).length > 0 ? (
                <>
                  <div className='space-y-[var(--spacing-section)]'>
                    {skillCategories.map((category) => {
                      const categorySkills = skillsByCategory[category.value] || [];
                      if (categorySkills.length === 0) return null;

                      return (
                        <div key={category.value}>
                          <div className='flex items-center gap-3 mb-[var(--spacing-card-lg)]'>
                            <SectionTitle>{category.label}</SectionTitle>
                            <Chip
                              variant='status'
                              size='sm'
                              className={getCategoryColor(category.value as Skill['category'])}
                            >
                              {categorySkills.length} skills
                            </Chip>
                          </div>

                          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--gap-grid-md)]'>
                            {categorySkills.map((skill) => (
                              <Paper
                                key={skill.id}
                                variant='glass-subtle'
                                size='lg'
                                interactive
                                className='transition-all duration-[var(--duration-normal)]'
                              >
                                <div className='flex items-start justify-between mb-3'>
                                  <div className='flex-1'>
                                    <ComponentTitle className='text-primary mb-1'>
                                      {skill.name}
                                    </ComponentTitle>
                                    <ComponentSubtitle className='text-secondary text-sm'>
                                      {skill.description}
                                    </ComponentSubtitle>
                                  </div>
                                  
                                  {skill.verification_required && (
                                    <ShieldCheckIcon className='w-5 h-5 text-warning flex-shrink-0 ml-2' />
                                  )}
                                </div>

                                <div className='flex items-center justify-between'>
                                  <div className='flex items-center gap-2'>
                                    <Chip
                                      variant='status'
                                      size='sm'
                                      className={getCategoryColor(skill.category)}
                                    >
                                      {category.label}
                                    </Chip>
                                  </div>

                                  <div className='flex items-center gap-2'>
                                    {skill.verification_required && (
                                      <>
                                        <Button
                                          variant='ghost'
                                          size='sm'
                                          onClick={() => handleVerifySkill(skill.id, true)}
                                          className='text-success hover:bg-success/10'
                                        >
                                          <CheckBadgeIcon className='w-4 h-4' />
                                        </Button>
                                        <Button
                                          variant='ghost'
                                          size='sm'
                                          onClick={() => handleVerifySkill(skill.id, false)}
                                          className='text-warning hover:bg-warning/10'
                                        >
                                          <ClockIcon className='w-4 h-4' />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Skill Statistics */}
                                <div className='mt-4 pt-3 border-t border-glass-border'>
                                  <div className='grid grid-cols-2 gap-4 text-center'>
                                    <div>
                                      <StatSmall className='text-accent-blue'>
                                        {statisticsLoading ? (
                                          <div className="animate-pulse bg-white/10 h-4 w-8 rounded mx-auto"></div>
                                        ) : statisticsError ? (
                                          '—'
                                        ) : (
                                          skillsStatistics?.[skill.id]?.total_members ?? 0
                                        )}
                                      </StatSmall>
                                      <ComponentSubtitle className='text-tertiary text-xs'>
                                        Members
                                      </ComponentSubtitle>
                                    </div>
                                    <div>
                                      <StatSmall className='text-success'>
                                        {statisticsLoading ? (
                                          <div className="animate-pulse bg-white/10 h-4 w-8 rounded mx-auto"></div>
                                        ) : statisticsError ? (
                                          '—'
                                        ) : (
                                          `${((skillsStatistics?.[skill.id]?.verification_rate ?? 0) * 100).toFixed(0)}%`
                                        )}
                                      </StatSmall>
                                      <ComponentSubtitle className='text-tertiary text-xs'>
                                        Verified
                                      </ComponentSubtitle>
                                    </div>
                                  </div>
                                  
                                  {/* Statistics error state */}
                                  {statisticsError && canRetryStatistics && (
                                    <div className="mt-2 text-center">
                                      <button
                                        onClick={retryStatistics}
                                        className="text-xs text-tertiary hover:text-secondary transition-colors"
                                        disabled={statisticsRetrying}
                                      >
                                        {statisticsRetrying ? 'Retrying...' : 'Retry Stats'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </Paper>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination - Now safely inside DataStateWrapper */}
                  {skillsData && 
                   skillsData.total && 
                   skillsData.limit && 
                   skillsData.total > skillsData.limit && (
                    <div className='flex items-center justify-between'>
                      <div className='text-sm text-tertiary'>
                        Showing {((page - 1) * skillsData.limit) + 1} to{' '}
                        {Math.min(page * skillsData.limit, skillsData.total)} of{' '}
                        {skillsData.total} skills
                      </div>
                      <div className='flex items-center gap-2'>
                        <Button
                          variant='ghost'
                          size='sm'
                          disabled={page === 1}
                          onClick={() => setPage(page - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          disabled={page * skillsData.limit >= skillsData.total}
                          onClick={() => setPage(page + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  variant="no-results"
                  title="No Skills Match Filters"
                  description="Try adjusting your search criteria or filters to find skills."
                  action={{
                    label: 'Clear Filters',
                    onClick: () => setFilters({}),
                    variant: 'secondary',
                  }}
                  secondaryAction={{
                    label: 'Create New Skill',
                    onClick: () => setShowCreateSkillModal(true),
                    variant: 'primary',
                  }}
                />
              )}
            </div>
          );
        }}
      </DataStateWrapper>

      {/* Skill Gaps Analysis */}
      {analyticsData && analyticsData.skill_gaps.length > 0 && (
        <div>
          <SectionTitle className='mb-[var(--spacing-card-lg)]'>
            Skill Gaps Analysis
          </SectionTitle>
          <Paper variant='glass-subtle' size='lg'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--gap-grid-md)]'>
              {analyticsData.skill_gaps.map((gap, index) => (
                <Paper key={index} variant='glass-subtle' size='md' className='text-center'>
                  <ComponentTitle className='text-primary mb-2'>
                    {gap.skill_name}
                  </ComponentTitle>
                  <div className='mb-3'>
                    <StatMedium className='text-warning'>
                      {gap.current_count}/{gap.required_count}
                    </StatMedium>
                    <ComponentSubtitle className='text-tertiary text-sm'>
                      Current/Required
                    </ComponentSubtitle>
                  </div>
                  <div className='text-xs text-tertiary mb-2'>
                    {gap.gap_percentage.toFixed(0)}% gap
                  </div>
                  <div className='w-full bg-glass-border rounded-full h-2'>
                    <div
                      className='bg-warning h-2 rounded-full transition-all duration-[var(--duration-normal)]'
                      style={{
                        width: `${Math.max(0, 100 - gap.gap_percentage)}%`,
                      }}
                    />
                  </div>
                </Paper>
              ))}
            </div>
          </Paper>
        </div>
      )}



      {/* Create Skill Modal */}
      <Dialog
        isOpen={showCreateSkillModal}
        onClose={() => {
          setShowCreateSkillModal(false);
          setSkillFormData({
            name: '',
            category: 'pilot',
            description: '',
            verification_required: false,
          });
        }}
        title='Create New Skill'
        size='md'
      >
        <div className='space-y-[var(--spacing-card-lg)]'>
          <div>
            <ComponentSubtitle className='text-tertiary mb-2'>
              Skill Name
            </ComponentSubtitle>
            <Input
              value={skillFormData.name}
              onChange={(value) => setSkillFormData(prev => ({ ...prev, name: value }))}
              placeholder='Enter skill name'
              className='w-full'
            />
          </div>

          <div>
            <ComponentSubtitle className='text-tertiary mb-2'>
              Category
            </ComponentSubtitle>
            <Select
              value={skillFormData.category}
              onChange={(value) => setSkillFormData(prev => ({ 
                ...prev, 
                category: typeof value === 'string' ? value as Skill['category'] : prev.category
              }))}
              options={skillCategories}
              className='w-full'
            />
          </div>

          <div>
            <ComponentSubtitle className='text-tertiary mb-2'>
              Description
            </ComponentSubtitle>
            <Textarea
              value={skillFormData.description}
              onChange={(value) => setSkillFormData(prev => ({ ...prev, description: value }))}
              placeholder='Describe this skill...'
              rows={3}
              className='w-full'
            />
          </div>

          <Checkbox
            checked={skillFormData.verification_required}
            onChange={(checked) => setSkillFormData(prev => ({ 
              ...prev, 
              verification_required: checked 
            }))}
            label='Requires verification'
            description='Skills that require verification will need approval from authorized personnel'
            size='md'
          />

          <div className='flex items-center justify-end gap-[var(--gap-button)] pt-4 border-t border-glass-border'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowCreateSkillModal(false);
                setSkillFormData({
                  name: '',
                  category: 'pilot',
                  description: '',
                  verification_required: false,
                });
              }}
            >
              Cancel
            </Button>
            <Button
              variant='primary'
              onClick={handleCreateSkill}
              disabled={!skillFormData.name.trim()}
            >
              Create Skill
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add User Skill Modal */}
      <Dialog
        isOpen={showAddUserSkillModal}
        onClose={() => {
          setShowAddUserSkillModal(false);
          setUserSkillFormData({
            skill_id: '',
            proficiency_level: 'beginner',
            notes: '',
          });
        }}
        title='Add User Skill'
        size='md'
      >
        <div className='space-y-[var(--spacing-card-lg)]'>
          <div>
            <ComponentSubtitle className='text-tertiary mb-2'>
              Skill
            </ComponentSubtitle>
            <Select
              value={userSkillFormData.skill_id}
              onChange={(value) => setUserSkillFormData(prev => ({ 
                ...prev, 
                skill_id: typeof value === 'string' ? value : prev.skill_id 
              }))}
              options={allSkillsData?.data?.map(skill => ({
                value: skill.id,
                label: skill.name,
              })) || []}
              placeholder={
                allSkillsLoading 
                  ? 'Loading skills...' 
                  : allSkillsError 
                  ? 'Error loading skills - Click to retry' 
                  : (!allSkillsData?.data || allSkillsData.data.length === 0)
                  ? 'No skills available - Create a skill first'
                  : 'Select a skill'
              }
              disabled={allSkillsLoading || (!allSkillsData?.data || allSkillsData.data.length === 0)}
              className='w-full'
              {...(allSkillsError && { error: 'Failed to load skills' })}
            />
            
            {/* Loading indicator */}
            {allSkillsLoading && (
              <div className='mt-2 flex items-center gap-2 text-sm text-secondary'>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-blue"></div>
                <span>Loading available skills...</span>
              </div>
            )}
            
            {/* Error state with retry button */}
            {allSkillsError && (
              <div className='mt-2 p-3 bg-error/10 border border-error/20 rounded-lg'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <svg className='w-4 h-4 text-error' fill='currentColor' viewBox='0 0 20 20'>
                      <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                    </svg>
                    <div>
                      <ComponentSubtitle className='text-error text-sm'>
                        Unable to load skills
                      </ComponentSubtitle>
                      <p className='text-xs text-error/80 mt-1'>
                        {skillsRetryCount >= 3 
                          ? 'Persistent connection issue. Please check your network or try again later.'
                          : 'Network error or server issue. Please try again.'
                        }
                      </p>
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={handleSkillsRetry}
                    className='text-error hover:bg-error/10'
                  >
                    Retry {skillsRetryCount > 0 && `(${skillsRetryCount})`}
                  </Button>
                </div>
              </div>
            )}
            
            {/* No skills available state */}
            {!allSkillsLoading && !allSkillsError && (!allSkillsData?.data || allSkillsData.data.length === 0) && (
              <div className='mt-2 p-3 bg-warning/10 border border-warning/20 rounded-lg'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <svg className='w-4 h-4 text-warning' fill='currentColor' viewBox='0 0 20 20'>
                      <path fillRule='evenodd' d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                    </svg>
                    <div>
                      <ComponentSubtitle className='text-warning text-sm'>
                        No skills available
                      </ComponentSubtitle>
                      <p className='text-xs text-warning/80 mt-1'>
                        Create organizational skills first before adding user skills.
                      </p>
                    </div>
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => refetchAllSkills()}
                      className='text-warning hover:bg-warning/10'
                    >
                      Refresh
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => {
                        setShowAddUserSkillModal(false);
                        setShowCreateSkillModal(true);
                      }}
                      className='text-warning hover:bg-warning/10'
                    >
                      Create Skill
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <ComponentSubtitle className='text-tertiary mb-2'>
              Proficiency Level
            </ComponentSubtitle>
            <Select
              value={userSkillFormData.proficiency_level}
              onChange={(value) => setUserSkillFormData(prev => ({ 
                ...prev, 
                proficiency_level: typeof value === 'string' ? value as UserSkill['proficiency_level'] : prev.proficiency_level
              }))}
              options={proficiencyLevels}
              className='w-full'
            />
          </div>

          <div>
            <ComponentSubtitle className='text-tertiary mb-2'>
              Notes
            </ComponentSubtitle>
            <Textarea
              value={userSkillFormData.notes || ''}
              onChange={(value) => setUserSkillFormData(prev => ({ ...prev, notes: value }))}
              placeholder='Add notes about this skill...'
              rows={3}
              className='w-full'
            />
          </div>

          <div className='flex items-center justify-end gap-[var(--gap-button)] pt-4 border-t border-glass-border'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowAddUserSkillModal(false);
                setUserSkillFormData({
                  skill_id: '',
                  proficiency_level: 'beginner',
                  notes: '',
                });
              }}
            >
              Cancel
            </Button>
            <Button
              variant='primary'
              onClick={handleAddUserSkill}
              disabled={!userSkillFormData.skill_id}
            >
              Add Skill
            </Button>
          </div>
        </div>
      </Dialog>
      </div>
    </HRErrorBoundary>
  );
};

export default SkillsMatrix;