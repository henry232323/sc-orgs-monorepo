import React, { useState } from 'react';
import { 
  useGetOrganizationDiscordServerQuery, 
  useGetUserDiscordServersQuery,
  useDisconnectDiscordServerMutation,
  useSyncOrganizationDiscordEventsMutation
} from '../../services/apiSlice';
import { DiscordServerCard } from './DiscordServerCard';
import { Paper, Button } from '../ui';
import { useToast } from '../../contexts/ToastContext';
import {
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  TrashIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';

interface DiscordServersListProps {
  organizationId?: string; // Optional - if provided, shows org-specific servers
}

export const DiscordServersList: React.FC<DiscordServersListProps> = ({ organizationId }) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { success, error: showError } = useToast();

  // Use different queries based on whether we're showing org-specific or user servers
  const {
    data: orgServer,
    isLoading: isLoadingOrg,
    error: orgError,
    refetch: refetchOrg,
  } = useGetOrganizationDiscordServerQuery(organizationId!, {
    skip: !organizationId,
  });

  const {
    data: userServers,
    isLoading: isLoadingUser,
    error: userError,
    refetch: refetchUser,
  } = useGetUserDiscordServersQuery(undefined, {
    skip: !!organizationId, // Skip if showing org-specific servers
  });

  // Discord management mutations
  const [disconnectDiscordServer] = useDisconnectDiscordServerMutation();
  const [syncOrganizationDiscordEvents] = useSyncOrganizationDiscordEventsMutation();

  const isLoading = organizationId ? isLoadingOrg : isLoadingUser;
  const queryError = organizationId ? orgError : userError;
  const refetch = organizationId ? refetchOrg : refetchUser;
  
  // Handle 404s gracefully - they mean no Discord server is connected, which is valid
  const isNotFoundError = queryError && (
    ('status' in queryError && (queryError as any).status === 404) ||
    ('data' in queryError && (queryError as any).data && 'status' in (queryError as any).data && (queryError as any).data.status === 404)
  );
  const hasRealError = queryError && !isNotFoundError;
  
  const servers = organizationId ? (orgServer ? [orgServer] : []) : (userServers || []);

  // Handler functions
  const handleDisconnect = async () => {
    if (!organizationId) return;
    
    setIsDisconnecting(true);
    try {
      await disconnectDiscordServer(organizationId).unwrap();
      success('Discord Server Disconnected', 'The Discord server has been successfully disconnected from your organization.');
    } catch (err: any) {
      console.error('Failed to disconnect Discord server:', err);
      showError('Failed to Disconnect', err?.data?.message || 'Failed to disconnect Discord server. Please try again.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSyncEvents = async () => {
    if (!organizationId) return;
    
    setIsSyncing(true);
    try {
      await syncOrganizationDiscordEvents(organizationId).unwrap();
      success('Events Synced', 'All organization events have been successfully synced to Discord.');
    } catch (err: any) {
      console.error('Failed to sync Discord events:', err);
      showError('Sync Failed', err?.data?.message || 'Failed to sync events to Discord. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-glass border-t-accent-blue"></div>
        <span className="ml-3 text-secondary">Loading Discord servers...</span>
      </div>
    );
  }

  if (hasRealError) {
    return (
      <Paper variant="glass" size="md">
        <div className="text-center py-8">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-primary mb-2">
            Error Loading Discord Servers
          </h3>
          <p className="text-secondary mb-4">
            Failed to load Discord server information. Please try again.
          </p>
          <Button
            variant="secondary"
            onClick={() => refetch()}
            className="flex items-center space-x-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Retry</span>
          </Button>
        </div>
      </Paper>
    );
  }

  if (servers.length === 0 || isNotFoundError) {
    return (
      <Paper variant="glass" size="md">
        <div className="text-center py-8">
          <ChatBubbleLeftRightIcon className="w-12 h-12 text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-primary mb-2">
            No Discord Servers Connected
          </h3>
          <p className="text-secondary mb-6">
            {organizationId
              ? 'This organization has no Discord servers connected.'
              : 'You have no Discord servers connected to your organizations.'
            }
          </p>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 text-left max-w-md mx-auto">
            <h4 className="font-medium text-blue-400 mb-3 flex items-center">
              <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
              How to Connect a Discord Server:
            </h4>
            <ol className="text-sm text-blue-300 space-y-2">
              <li className="flex items-start">
                <span className="bg-blue-500/20 text-blue-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mr-2 mt-0.5 flex-shrink-0">1</span>
                <span>Invite the SC-Orgs bot to your Discord server</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500/20 text-blue-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mr-2 mt-0.5 flex-shrink-0">2</span>
                <span>Use the slash command: <code className="bg-blue-500/20 px-1 rounded text-xs">/scorgs connect [spectrum_id]</code></span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500/20 text-blue-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mr-2 mt-0.5 flex-shrink-0">3</span>
                <span>Replace [spectrum_id] with your organization's Spectrum ID</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500/20 text-blue-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mr-2 mt-0.5 flex-shrink-0">4</span>
                <span>You must have Manage Server, Administrator, or Server Owner permissions</span>
              </li>
            </ol>
          </div>
        </div>
      </Paper>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-primary">
          Connected Discord Servers
        </h2>
        <div className="flex items-center space-x-4">
          {organizationId && servers.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSyncEvents}
                disabled={isSyncing}
                className="flex items-center space-x-2"
              >
                <CloudArrowUpIcon className="w-4 h-4" />
                <span>{isSyncing ? 'Syncing...' : 'Sync Events'}</span>
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex items-center space-x-2"
              >
                <TrashIcon className="w-4 h-4" />
                <span>{isDisconnecting ? 'Disconnecting...' : 'Disconnect'}</span>
              </Button>
            </div>
          )}
          <span className="text-sm text-tertiary">
            {servers.length} server{servers.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      <div className="space-y-4">
        {servers.map((server) => (
          <DiscordServerCard key={server.id} server={server} />
        ))}
      </div>
    </div>
  );
};
