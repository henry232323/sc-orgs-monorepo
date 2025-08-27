import React, { useState } from 'react';
import {
  useGetOrganizationsQuery,
  useSearchOrganizationsQuery,
} from '../../services/apiSlice';
import { Paper, Chip, Button, RadioGroup, ListPage, RegisterOrganizationButton } from '../ui';
import OrganizationCard from './OrganizationCard';
import {
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import TagManager from '@/components/tags/TagManager.tsx';

interface OrganizationListProps {
  title?: string;
  subtitle?: string;
}

const OrganizationList: React.FC<OrganizationListProps> = ({
  title = 'Star Citizen Organizations',
  subtitle = 'Discover and join organizations in the Star Citizen universe',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<
    'recent' | 'popular' | 'recent_popularity' | 'name'
  >('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentLimit] = useState(20);

  // Convert frontend sort to backend sort parameters
  const getSortParams = () => {
    switch (sortBy) {
      case 'recent':
        return { sort_by: 'created_at', sort_order: 'desc' };
      case 'popular':
        return { sort_by: 'total_upvotes', sort_order: 'desc' };
      case 'recent_popularity':
        return { sort_by: 'recent_popularity', sort_order: 'desc' };
      case 'name':
        return { sort_by: 'name', sort_order: 'asc' };
      default:
        return { sort_by: 'created_at', sort_order: 'desc' };
    }
  };

  // Use RTK Query hooks - automatically handles loading, error, and data states
  const {
    data: organizationsData,
    isLoading: isLoadingOrganizations,
    error: organizationsError,
    refetch: refetchOrganizations,
  } = useGetOrganizationsQuery({
    page: currentPage,
    limit: currentLimit,
    ...(selectedTags.length > 0 && { tags: selectedTags }),
    ...getSortParams(),
  });

  const { data: searchData, isLoading: isLoadingSearch } =
    useSearchOrganizationsQuery(
      {
        query: searchQuery,
        page: currentPage,
        limit: currentLimit,
        ...(selectedTags.length > 0 && { tags: selectedTags }),
        ...getSortParams(),
      },
      { skip: !searchQuery } // Only run search when there's a query
    );

  // Determine which data to use and loading state
  const isSearching = !!searchQuery;
  const data = isSearching ? searchData : organizationsData;
  const isLoading = isSearching ? isLoadingSearch : isLoadingOrganizations;
  const error = isSearching ? null : organizationsError; // Only show error for main query, not search
  const organizations = data?.data || [];
  const totalOrganizations = data?.total || 0;

  // Throttled search function to avoid excessive API calls
  const throttledSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSearch = (query: string) => {
    // Update the input immediately for responsive UI
    setSearchQuery(query);
    // Apply throttled search
    throttledSearch(query);
  };

  const handleSortChange = (
    sort: 'recent' | 'popular' | 'recent_popularity' | 'name'
  ) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
    setCurrentPage(1);
    // TODO: Implement tag filtering when backend supports it
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(newTags);
    setCurrentPage(1);
  };

  // Filter organizations by selected tags (when backend supports it)
  const filteredOrganizations = organizations.filter(() => {
    if (selectedTags.length === 0) return true;

    // TODO: Implement proper tag filtering when tags are added to the data model
    // For now, just return all organizations
    return true;
  });

  return (
    <ListPage
      title={title}
      subtitle={subtitle}
      headerActions={
        <RegisterOrganizationButton variant='primary' size='lg' icon='plus' />
      }
    >
      {/* Search and Filters - Always visible */}
      <Paper variant='glass-strong' size='lg'>
        <div className='space-y-[var(--spacing-card-lg)]'>
          {/* Search Bar */}
          <div className='relative'>
            <MagnifyingGlassIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted' />
            <input
              type='text'
              placeholder='Search organizations by name, description, or tags...'
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className='input-glass w-full pl-10 pr-4 py-3 text-primary placeholder:text-muted focus:ring-2 focus:ring-[var(--color-accent-blue)] focus:ring-opacity-50'
            />
          </div>

          <TagManager
            description='Select tags to filter organizations'
            selectedTags={selectedTags}
            onTagsChange={handleTagsChange}
          />

          {/* Sort Options */}
          <div className='flex items-center gap-[var(--spacing-element)]'>
            <span className='text-secondary'>Sort by:</span>
            <RadioGroup
              options={[
                { value: 'recent', label: 'Recent' },
                { value: 'popular', label: 'Most Upvoted' },
                { value: 'recent_popularity', label: 'Trending' },
                { value: 'name', label: 'Name' },
              ]}
              value={sortBy}
              onChange={value =>
                handleSortChange(
                  value as 'recent' | 'popular' | 'recent_popularity' | 'name'
                )
              }
              variant='buttons'
              size='sm'
            />
          </div>
        </div>
      </Paper>

      {/* Error Display - Inline, doesn't break the page */}
      {error && (
        <Paper
          variant='glass'
          size='lg'
          className='border-red-500/20 bg-red-500/10'
        >
          <div className='flex items-center space-x-3 text-red-400'>
            {/* ExclamationTriangleIcon is not imported, so it's removed */}
            <div className='flex-1'>
              <p className='font-semibold'>Unable to load organizations</p>
              <p className='text-sm text-red-400/80'>
                There was a problem loading the organizations. You can still
                search and create new ones.
              </p>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetchOrganizations()}
              className='border-red-500/30 text-red-400 hover:bg-red-500/10'
            >
              Retry
            </Button>
          </div>
        </Paper>
      )}

      {/* Results Count - Only show when we have data */}
      {!error && (
        <div className='flex items-center justify-between'>
          <p className='text-white/80'>
            Showing {filteredOrganizations.length} of {totalOrganizations}{' '}
            organizations
          </p>
          {selectedTags.length > 0 && (
            <div className='flex items-center space-x-2'>
              <span className='text-sm text-white/50'>Active filters:</span>
              {selectedTags.map(tag => (
                <Chip
                  key={tag}
                  variant='selected'
                  removable
                  onRemove={() => handleRemoveTag(tag)}
                  size='sm'
                >
                  {tag}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Organizations Grid */}
      {isLoading ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {[...Array(6)].map((_, i) => (
            <Paper key={i} variant='glass' size='lg' className='animate-pulse'>
              <div className='h-4 bg-white/20 rounded mb-3'></div>
              <div className='h-3 bg-white/20 rounded mb-2'></div>
              <div className='h-3 bg-white/20 rounded w-2/3'></div>
            </Paper>
          ))}
        </div>
      ) : error ? (
        // Show empty state when there's an error, but keep the page functional
        <Paper variant='glass' size='xl' className='text-center'>
          {/* ExclamationTriangleIcon is not imported, so it's removed */}
          <h3 className='text-lg font-semibold text-white mb-2'>
            Organizations temporarily unavailable
          </h3>
          <p className='text-white/80 mb-6'>
            We're having trouble loading the organizations list right now. You
            can still register a new organization or try searching.
          </p>
          <div className='flex justify-center space-x-4'>
            <Button variant='outline' onClick={() => refetchOrganizations()}>
              Try Again
            </Button>
            <RegisterOrganizationButton variant='primary' icon='plus' />
          </div>
        </Paper>
      ) : filteredOrganizations.length > 0 ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {filteredOrganizations.map((org: any) => (
            <OrganizationCard
              key={org.rsi_org_id}
              organization={org}
              showDescription={true}
              showTags={true}
              showUpvoteButton={true}
            />
          ))}
        </div>
      ) : (
        <Paper variant='glass' size='xl' className='text-center'>
          <BuildingOfficeIcon className='w-16 h-16 text-white/40 mx-auto mb-4' />
          <h3 className='text-lg font-semibold text-white mb-2'>
            No organizations found
          </h3>
          <p className='text-white/80 mb-6'>
            {searchQuery || selectedTags.length > 0
              ? 'Try adjusting your search or filters'
              : 'Be the first to register an organization!'}
          </p>
          {!searchQuery && selectedTags.length === 0 && (
            <RegisterOrganizationButton variant='primary' icon='plus' />
          )}
        </Paper>
      )}

      {/* Pagination - Only show when we have data and no errors */}
      {!error && totalOrganizations > currentLimit && (
        <div className='flex items-center justify-center space-x-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          <span className='text-sm text-white/80'>
            Page {currentPage} of {Math.ceil(totalOrganizations / currentLimit)}
          </span>
          <Button
            variant='outline'
            size='sm'
            disabled={
              currentPage >= Math.ceil(totalOrganizations / currentLimit)
            }
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </ListPage>
  );
};
export default OrganizationList;
