import React from 'react';
import { DiscordServer } from '../../types/discord';
import { Paper, Chip } from '../ui';
import {
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface DiscordServerCardProps {
  server: DiscordServer;
}

export const DiscordServerCard: React.FC<DiscordServerCardProps> = ({ server }) => {
  if (!server) {
    return null;
  }
  const getServerIcon = () => {
    if (server.guild_icon_url) {
      return (
        <img
          src={server.guild_icon_url}
          alt={`${server.guild_name} icon`}
          className="w-12 h-12 rounded-full object-cover"
        />
      );
    }
    
    // Fallback to first letter of server name
    return (
      <div className="w-12 h-12 bg-glass rounded-full flex items-center justify-center">
        <span className="text-primary font-semibold text-lg">
          {server.guild_name?.charAt(0) || '?'}
        </span>
      </div>
    );
  };

  return (
    <Paper variant="glass" size="md">
      <div className="flex items-start space-x-4">
        {/* Server Icon */}
        <div className="flex-shrink-0">
          {getServerIcon()}
        </div>
        
        {/* Server Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-primary truncate">
              {server.guild_name}
            </h3>
            <div className="flex space-x-1">
              <Chip
                variant="status"
                size="sm"
                className={
                  server.is_active
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }
                icon={server.is_active ? <CheckCircleIcon className="w-3 h-3" /> : <XCircleIcon className="w-3 h-3" />}
              >
                {server.is_active ? 'Active' : 'Inactive'}
              </Chip>
              
              {server.auto_create_events && (
                <Chip
                  variant="status"
                  size="sm"
                  className="bg-blue-500/20 text-blue-400"
                  icon={<CalendarIcon className="w-3 h-3" />}
                >
                  Auto Events
                </Chip>
              )}
            </div>
          </div>

          {/* Organization Name (if present) */}
          {server.organization_name && (
            <p className="text-sm text-secondary mb-2">
              Connected to: <span className="font-medium text-primary">{server.organization_name}</span>
            </p>
          )}

          {/* Server Details */}
          <div className="flex items-center space-x-4 text-sm text-tertiary">
            {server.guild_info?.member_count && (
              <div className="flex items-center space-x-1">
                <UserGroupIcon className="w-4 h-4" />
                <span>{server.guild_info.member_count} members</span>
              </div>
            )}
            
            <div className="flex items-center space-x-1">
              <CalendarIcon className="w-4 h-4" />
              <span>Connected {new Date(server.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Server ID */}
          <div className="mt-2 pt-2 border-t border-glass">
            <p className="text-xs text-tertiary">
              Server ID: <code className="bg-glass-subtle px-1 rounded text-xs">{server.discord_guild_id}</code>
            </p>
          </div>
        </div>
      </div>
    </Paper>
  );
};