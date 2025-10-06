import React, { useState } from 'react';
import {
  Button,
  Paper,
  Chip,
  Dialog,
  Input,
  Textarea,
  Dropdown,
  SectionTitle,
  ComponentTitle,
  ComponentSubtitle,
  StatMedium,
  StatSmall,
} from '../ui';
import {
  useGetSkillsQuery,
  useCreateSkillMutation,
  useAddUserSkillMutation,
  useVerifySkillMutation,
  useGetSkillsAnalyticsQuery,
} from '../../services/apiSlice';
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

  // Fetch data
  const { data: skillsData, isLoading } = useGetSkillsQuery({
    organizationId,
    page,
    limit: 20,
    filters,
  });

  const { data: analyticsData } = useGetSkillsAnalyticsQuery({
    organizationId,
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

  // Get category color
  const getCategoryColor = (category: Skill['category']) => {
    switch (category) {
      case 'pilot':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'engineer':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'medic':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'security':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'logistics':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'leadership':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
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
    }
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
    }
  };

  // Group skills by category
  const skillsByCategory: Record<string, Skill[]> = skillsData?.data ? skillsData.data.reduce((acc: Record<string, Skill[]>, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category]!.push(skill);
    return acc;
  }, {}) : {};

  return (
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
      {analyticsData && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-[var(--gap-grid-md)]'>
          <Paper variant='glass' size='md' className='text-center'>
            <AcademicCapIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
            <StatMedium className='mb-1'>
              {analyticsData.total_skills_tracked}
            </StatMedium>
            <ComponentSubtitle className='text-tertiary'>
              Total Skills
            </ComponentSubtitle>
          </Paper>

          <Paper variant='glass' size='md' className='text-center'>
            <CheckBadgeIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
            <StatMedium className='mb-1'>
              {(analyticsData.verification_rate * 100).toFixed(0)}%
            </StatMedium>
            <ComponentSubtitle className='text-tertiary'>
              Verified Skills
            </ComponentSubtitle>
          </Paper>

          <Paper variant='glass' size='md' className='text-center'>
            <ChartBarIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
            <StatMedium className='mb-1'>
              {analyticsData.skill_gaps.length}
            </StatMedium>
            <ComponentSubtitle className='text-tertiary'>
              Skill Gaps
            </ComponentSubtitle>
          </Paper>

          <Paper variant='glass' size='md' className='text-center'>
            <StarIcon className='w-8 h-8 text-tertiary mx-auto mb-3' />
            <StatMedium className='mb-1'>
              {analyticsData.skill_gaps.reduce((acc, gap) => acc + gap.current_count, 0)}
            </StatMedium>
            <ComponentSubtitle className='text-tertiary'>
              Skilled Members
            </ComponentSubtitle>
          </Paper>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Paper variant='glass-subtle' size='lg'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-[var(--gap-grid-md)]'>
            <div>
              <ComponentSubtitle className='text-tertiary mb-2'>
                Category
              </ComponentSubtitle>
              <Dropdown
                value={filters.category || ''}
                onChange={(value) => {
                  const newFilters = { ...filters };
                  if (value) {
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
              <Dropdown
                value={filters.verified?.toString() || ''}
                onChange={(value) => {
                  const newFilters = { ...filters };
                  if (value === '') {
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
      {isLoading ? (
        <div className='flex items-center justify-center py-12'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
        </div>
      ) : Object.keys(skillsByCategory).length > 0 ? (
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
                              0
                            </StatSmall>
                            <ComponentSubtitle className='text-tertiary text-xs'>
                              Members
                            </ComponentSubtitle>
                          </div>
                          <div>
                            <StatSmall className='text-success'>
                              0%
                            </StatSmall>
                            <ComponentSubtitle className='text-tertiary text-xs'>
                              Verified
                            </ComponentSubtitle>
                          </div>
                        </div>
                      </div>
                    </Paper>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Paper variant='glass' size='lg'>
          <div className='text-center py-12'>
            <AcademicCapIcon className='w-16 h-16 text-tertiary mx-auto mb-4' />
            <ComponentTitle className='text-primary mb-2'>
              No Skills Found
            </ComponentTitle>
            <ComponentSubtitle className='text-secondary'>
              {Object.keys(filters).length > 0
                ? 'No skills match your current filters.'
                : 'Start by creating your first skill.'}
            </ComponentSubtitle>
          </div>
        </Paper>
      )}

      {/* Skill Gaps Analysis */}
      {analyticsData && analyticsData.skill_gaps.length > 0 && (
        <div>
          <SectionTitle className='mb-[var(--spacing-card-lg)]'>
            Skill Gaps Analysis
          </SectionTitle>
          <Paper variant='glass-subtle' size='lg'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--gap-grid-md)]'>
              {analyticsData.skill_gaps.map((gap, index) => (
                <div key={index} className='text-center p-4 bg-white/5 rounded-lg'>
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
                  <div className='w-full bg-white/10 rounded-full h-2'>
                    <div
                      className='bg-warning h-2 rounded-full'
                      style={{
                        width: `${Math.max(0, 100 - gap.gap_percentage)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Paper>
        </div>
      )}

      {/* Pagination */}
      {skillsData && skillsData.total > skillsData.limit && (
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
            <Dropdown
              value={skillFormData.category}
              onChange={(value) => setSkillFormData(prev => ({ 
                ...prev, 
                category: value as Skill['category'] 
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

          <div className='flex items-center gap-3'>
            <input
              type='checkbox'
              id='verification-required'
              checked={skillFormData.verification_required}
              onChange={(e) => setSkillFormData(prev => ({ 
                ...prev, 
                verification_required: e.target.checked 
              }))}
              className='w-4 h-4 text-accent-blue bg-transparent border-glass-border rounded focus:ring-accent-blue focus:ring-2'
            />
            <label htmlFor='verification-required' className='text-sm text-secondary'>
              Requires verification
            </label>
          </div>

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
            <Dropdown
              value={userSkillFormData.skill_id}
              onChange={(value) => setUserSkillFormData(prev => ({ ...prev, skill_id: value }))}
              options={skillsData?.data.map(skill => ({
                value: skill.id,
                label: skill.name,
                description: skill.description,
              })) || []}
              placeholder='Select a skill'
              className='w-full'
            />
          </div>

          <div>
            <ComponentSubtitle className='text-tertiary mb-2'>
              Proficiency Level
            </ComponentSubtitle>
            <Dropdown
              value={userSkillFormData.proficiency_level}
              onChange={(value) => setUserSkillFormData(prev => ({ 
                ...prev, 
                proficiency_level: value as UserSkill['proficiency_level'] 
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
  );
};

export default SkillsMatrix;