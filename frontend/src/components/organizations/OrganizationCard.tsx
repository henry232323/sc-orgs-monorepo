import React from 'react';
import { Link } from 'react-router-dom';
import { Organization } from '../../types/organization';
import { Paper, Chip, UpvoteButton, LimitedMarkdown } from '../ui';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface OrganizationCardProps {
  organization: Organization;
  showDescription?: boolean;
  showTags?: boolean;
  showUpvoteButton?: boolean;
  className?: string;
}

const OrganizationCard: React.FC<OrganizationCardProps> = ({
  organization: org,
  showDescription = true,
  showTags = true,
  showUpvoteButton = true,
  className = '',
}) => {
  return (
    <Link
      to={`/organizations/${org.rsi_org_id}`}
      className={`group block ${className}`}
    >
      <Paper
        variant='glass'
        size='lg'
        className='transition-all duration-200 group-hover:scale-[1.01] group-hover:shadow-lg cursor-pointer'
      >
        <div className='flex items-start justify-between mb-4'>
          <div className='flex items-center space-x-3'>
            {org.icon_url ? (
              <img
                src={org.icon_url}
                alt={`${org.name} icon`}
                className='w-12 h-12 rounded-lg object-cover'
              />
            ) : (
              <div className='w-12 h-12 bg-gradient-to-r from-white/20 to-white/10 rounded-lg flex items-center justify-center'>
                <BuildingOfficeIcon className='w-6 h-6 text-white' />
              </div>
            )}
            <div>
              <div className='flex items-center gap-2 mb-1'>
                <h3 className='text-lg font-semibold text-white group-hover:text-brand-secondary transition-colors'>
                  {org.name}
                </h3>
                {org.role_name && (
                  <Chip
                    variant='status'
                    size='sm'
                    className={`${
                      org.is_owner
                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}
                  >
                    {org.role_name}
                  </Chip>
                )}
              </div>
              <div className='flex items-center space-x-2 text-sm text-white/60'>
                <span>{org.total_members || 0} members</span>
                <span>•</span>
                <span>{org.total_upvotes || 0} upvotes</span>
                {org.joined_at && (
                  <>
                    <span>•</span>
                    <span>Joined {new Date(org.joined_at).toLocaleDateString()}</span>
                  </>
                )}
              </div>

              {showTags && (
                <div className='mt-2 overflow-x-auto scrollbar-hide'>
                  <div className='flex space-x-1 pb-1 min-w-max'>
                    {org.playstyle_tags &&
                      org.playstyle_tags
                        .slice(0, 4)
                        .map((tag: string, index: number) => (
                          <Chip
                            key={`playstyle-${index}`}
                            variant='status'
                            size='sm'
                            className='bg-brand-secondary/20 text-brand-secondary whitespace-nowrap flex-shrink-0'
                          >
                            {tag}
                          </Chip>
                        ))}
                    {org.focus_tags &&
                      org.focus_tags
                        .slice(0, 4)
                        .map((tag: string, index: number) => (
                          <Chip
                            key={`focus-${index}`}
                            variant='status'
                            size='sm'
                            className='bg-brand-primary/20 text-brand-primary whitespace-nowrap flex-shrink-0'
                          >
                            {tag}
                          </Chip>
                        ))}
                    {(org.playstyle_tags?.length || 0) +
                      (org.focus_tags?.length || 0) >
                      8 && (
                      <span className='text-xs text-white/40 flex-shrink-0 self-center ml-1'>
                        +
                        {(org.playstyle_tags?.length || 0) +
                          (org.focus_tags?.length || 0) -
                          8}{' '}
                        more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {showUpvoteButton && (
            <div onClick={e => e.preventDefault()}>
              <UpvoteButton
                spectrumId={org.rsi_org_id}
                currentUpvotes={org.total_upvotes || 0}
                variant='compact'
                size='sm'
                showCount={false}
              />
            </div>
          )}
        </div>

        {showDescription && org.description && (
          <LimitedMarkdown
            content={org.description}
            className='text-sm line-clamp-3 mb-4'
          />
        )}

        <div className='flex items-center justify-between text-xs text-white/50'>
          <span>Created {new Date(org.created_at).toLocaleDateString()}</span>
          <span className='text-white/60 font-medium'>View Details →</span>
        </div>
      </Paper>
    </Link>
  );
};

export default OrganizationCard;
