import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, UserIcon, ShieldCheckIcon, ChatBubbleLeftIcon, TagIcon, PlusIcon, BuildingOfficeIcon, UsersIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useGetPlayerDetailsQuery } from '../services/apiSlice';
import { Paper, Button, Chip, Page } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import CreateEnhancedReportForm from '../components/reputation/CreateEnhancedReportForm';
import CreateCommentForm from '../components/reputation/CreateCommentForm';
import CreateTagForm from '../components/reputation/CreateTagForm';
import VotingButtons from '../components/reputation/VotingButtons';
import ReputationItemModal from '../components/reputation/ReputationItemModal';

const PlayerProfilePage: React.FC = () => {
  const { spectrumId } = useParams<{ spectrumId: string }>();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'organization-reports' | 'alt-account-reports' | 'affiliated-people-reports' | 'comments' | 'tags'>('overview');
  const [showCreateReportForm, setShowCreateReportForm] = useState(false);
  const [showCreateCommentForm, setShowCreateCommentForm] = useState(false);
  const [showCreateTagForm, setShowCreateTagForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemType, setSelectedItemType] = useState<'organization_report' | 'alt_account_report' | 'affiliated_people_report' | 'comment' | 'tag' | null>(null);

  const {
    data: playerDetails,
    isLoading,
    error,
  } = useGetPlayerDetailsQuery(spectrumId!);

  if (isLoading) {
    return (
      <Page title="Loading Player...">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
        </div>
      </Page>
    );
  }

  if (error || !playerDetails) {
    return (
      <Page title="Player Not Found">
        <Paper variant="glass" size="xl" className="text-center">
          <div className="text-red-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Player not found</h3>
          <p className="text-white/80 mb-6">The player you're looking for doesn't exist or has been removed.</p>
          <Link to="/reputation">
            <Button variant="primary">
              Back to Reputation
            </Button>
          </Link>
        </Paper>
      </Page>
    );
  }

  const { 
    player, 
    handleHistory, 
    orgHistory, 
    tags, 
    organizationReports, 
    altAccountReports, 
    affiliatedPeopleReports, 
    comments, 
    reputationScore, 
    confidenceLevel 
  } = playerDetails;

  // Separate reports by type
  const orgReports = organizationReports || [];
  const altReports = altAccountReports || [];
  const affiliatedReports = affiliatedPeopleReports || [];

  const getReputationColor = (score: number) => {
    if (score >= 70) return 'text-green-400 bg-green-500/20';
    if (score >= 40) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const getReputationLabel = (score: number) => {
    if (score >= 70) return 'Positive';
    if (score >= 40) return 'Neutral';
    return 'Negative';
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-400 bg-green-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-red-400 bg-red-500/20';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleItemClick = (item: any, itemType: 'organization_report' | 'alt_account_report' | 'affiliated_people_report' | 'comment' | 'tag') => {
    setSelectedItem(item);
    setSelectedItemType(itemType);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setSelectedItemType(null);
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: UserIcon },
    { id: 'organization-reports', name: 'Organization Reports', icon: BuildingOfficeIcon, count: orgReports.length },
    { id: 'alt-account-reports', name: 'Alt Account Reports', icon: UserIcon, count: altReports.length },
    { id: 'affiliated-people-reports', name: 'Affiliated People Reports', icon: UsersIcon, count: affiliatedReports.length },
    { id: 'comments', name: 'Comments', icon: ChatBubbleLeftIcon, count: comments.length },
    { id: 'tags', name: 'Tags', icon: TagIcon, count: tags.length },
  ];

  return (
    <Page title={`${player.current_handle} - Player Reputation`}>
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/reputation"
          className="inline-flex items-center text-sm text-white/60 hover:text-white mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Reputation
        </Link>
        
        <div className="flex items-start space-x-6">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
              <UserIcon className="w-10 h-10 text-white/60" />
            </div>
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white">{player.current_handle}</h1>
            {player.current_display_name && (
              <p className="text-lg text-white/80 mt-1">{player.current_display_name}</p>
            )}
            
            <div className="mt-4">
              <Button
                variant="glass"
                size="sm"
                onClick={() => window.open(`https://robertsspaceindustries.com/citizens/${player.current_handle}`, '_blank')}
                className="flex items-center space-x-2 text-blue-400 hover:text-blue-300"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                <span>View RSI Profile</span>
              </Button>
            </div>
            
            <div className="flex items-center space-x-4 mt-4">
              <Chip
                variant="selected"
                className={`${getReputationColor(reputationScore)} flex items-center space-x-1`}
              >
                <ShieldCheckIcon className="w-4 h-4" />
                <span>{getReputationLabel(reputationScore)} ({reputationScore})</span>
              </Chip>
              <Chip
                variant="selected"
                className={getConfidenceColor(confidenceLevel)}
              >
                Confidence: {confidenceLevel}
              </Chip>
              {player.is_active ? (
                <Chip variant="selected" className="text-green-400 bg-green-500/20">
                  Active
                </Chip>
              ) : (
                <Chip variant="selected" className="text-white/60 bg-white/10">
                  Inactive
                </Chip>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/20 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-[var(--color-accent-blue)] text-[var(--color-accent-blue)]'
                    : 'border-transparent text-white/60 hover:text-white hover:border-white/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
                {tab.count !== undefined && (
                  <span className="bg-white/20 text-white/80 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Handle History */}
            <Paper variant="glass" size="lg">
              <h3 className="text-lg font-medium text-white mb-4">Handle History</h3>
              {handleHistory.length > 0 ? (
                <div className="space-y-3">
                  {handleHistory.map((history, index) => (
                    <div key={index} className="py-3 border-b border-white/10 last:border-b-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-white">{history.handle}</p>
                          {history.display_name && (
                            <p className="text-sm text-white/80">{history.display_name}</p>
                          )}
                        </div>
                        {history.handle === player.current_handle && (
                          <Chip className="text-xs text-green-400 bg-green-500/20">
                            Current
                          </Chip>
                        )}
                      </div>
                      <div className="flex justify-between text-sm text-white/60">
                        <div>
                          <span className="text-white/40">First seen:</span> {formatDate(history.first_observed_at)}
                        </div>
                        <div>
                          <span className="text-white/40">Last seen:</span> {formatDate(history.last_observed_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/60">No handle history available</p>
              )}
            </Paper>

            {/* Organization History */}
            <Paper variant="glass" size="lg">
              <h3 className="text-lg font-medium text-white mb-4">Organization History</h3>
              {orgHistory.length > 0 ? (
                <div className="space-y-3">
                  {orgHistory.map((org, index) => (
                    <div key={index} className="py-3 border-b border-white/10 last:border-b-0">
                      <div className="mb-2">
                        <p className="font-medium text-white">{org.org_name}</p>
                        {org.role && (
                          <p className="text-sm text-white/80">{org.role}</p>
                        )}
                      </div>
                      <div className="flex justify-between text-sm text-white/60">
                        <div>
                          <span className="text-white/40">First seen:</span> {formatDate(org.first_observed_at)}
                        </div>
                        <div>
                          <span className="text-white/40">Last seen:</span> {formatDate(org.last_observed_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/60">No organization history available</p>
              )}
            </Paper>
          </div>
        )}


        {/* Organization Reports Tab */}
        {activeTab === 'organization-reports' && (
          <Paper variant="glass" size="lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Organization Reports</h3>
              {isAuthenticated && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCreateReportForm(true)}
                  className="flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Create Report</span>
                </Button>
              )}
            </div>
            
            {orgReports.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/80">Organization</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/80">Description</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-white/80">Votes</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-white/80">Date</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-white/80">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...orgReports]
                      .sort((a, b) => (b.attestation_counts.support - b.attestation_counts.dispute) - (a.attestation_counts.support - a.attestation_counts.dispute))
                      .map((report) => (
                      <tr 
                        key={report.id} 
                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => handleItemClick(report, 'organization_report')}
                      >
                        <td className="py-4 px-4">
                          <div className="font-medium text-white">{report.title}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-white/80 text-sm max-w-xs">
                            <p className="truncate">{report.description}</p>
                            {report.evidence_urls && report.evidence_urls.length > 0 && (
                              <p className="text-xs text-white/60 mt-1">
                                {report.evidence_urls.length} evidence link{report.evidence_urls.length !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2 text-sm">
                            <span className="flex items-center space-x-1 text-green-400">
                              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                              <span>{report.attestation_counts.support}</span>
                            </span>
                            <span className="flex items-center space-x-1 text-red-400">
                              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                              <span>{report.attestation_counts.dispute}</span>
                            </span>
                            <span className="flex items-center space-x-1 text-yellow-400">
                              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                              <span>{report.attestation_counts.neutral}</span>
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center text-sm text-white/60">
                          {formatDate(report.created_at)}
                        </td>
                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <VotingButtons item={report} type="organization_report" compact={true} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <BuildingOfficeIcon className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/60 text-sm mt-2 mb-4">
                  No organization reports yet
                </p>
                {isAuthenticated && (
                  <Button
                    variant="primary"
                    onClick={() => setShowCreateReportForm(true)}
                    className="flex items-center space-x-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Create First Report</span>
                  </Button>
                )}
              </div>
            )}
          </Paper>
        )}

        {/* Alt Account Reports Tab */}
        {activeTab === 'alt-account-reports' && (
          <Paper variant="glass" size="lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Alt Account Reports</h3>
              {isAuthenticated && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCreateReportForm(true)}
                  className="flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Create Report</span>
                </Button>
              )}
            </div>
            
            {altReports.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/80">Alt Account</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/80">Description</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-white/80">Votes</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-white/80">Date</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-white/80">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...altReports]
                      .sort((a, b) => (b.attestation_counts.support - b.attestation_counts.dispute) - (a.attestation_counts.support - a.attestation_counts.dispute))
                      .map((report) => (
                      <tr 
                        key={report.id} 
                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => handleItemClick(report, 'alt_account_report')}
                      >
                        <td className="py-4 px-4">
                          <div className="font-medium text-white">{report.title}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-white/80 text-sm max-w-xs">
                            <p className="truncate">{report.description}</p>
                            {report.evidence_urls && report.evidence_urls.length > 0 && (
                              <p className="text-xs text-white/60 mt-1">
                                {report.evidence_urls.length} evidence link{report.evidence_urls.length !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2 text-sm">
                            <span className="flex items-center space-x-1 text-green-400">
                              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                              <span>{report.attestation_counts.support}</span>
                            </span>
                            <span className="flex items-center space-x-1 text-red-400">
                              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                              <span>{report.attestation_counts.dispute}</span>
                            </span>
                            <span className="flex items-center space-x-1 text-yellow-400">
                              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                              <span>{report.attestation_counts.neutral}</span>
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center text-sm text-white/60">
                          {formatDate(report.created_at)}
                        </td>
                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <VotingButtons item={report} type="alt_account_report" compact={true} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <UserIcon className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/60 text-sm mt-2 mb-4">
                  No alt account reports yet
                </p>
                {isAuthenticated && (
                  <Button
                    variant="primary"
                    onClick={() => setShowCreateReportForm(true)}
                    className="flex items-center space-x-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Create First Report</span>
                  </Button>
                )}
              </div>
            )}
          </Paper>
        )}

        {/* Affiliated People Reports Tab */}
        {activeTab === 'affiliated-people-reports' && (
          <Paper variant="glass" size="lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Affiliated People Reports</h3>
              {isAuthenticated && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCreateReportForm(true)}
                  className="flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Create Report</span>
                </Button>
              )}
            </div>
            
            {affiliatedReports.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/80">Affiliated Person</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/80">Description</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-white/80">Votes</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-white/80">Date</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-white/80">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...affiliatedReports]
                      .sort((a, b) => (b.attestation_counts.support - b.attestation_counts.dispute) - (a.attestation_counts.support - a.attestation_counts.dispute))
                      .map((report) => (
                      <tr 
                        key={report.id} 
                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => handleItemClick(report, 'affiliated_people_report')}
                      >
                        <td className="py-4 px-4">
                          <div className="font-medium text-white">{report.title}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-white/80 text-sm max-w-xs">
                            <p className="truncate">{report.description}</p>
                            {report.evidence_urls && report.evidence_urls.length > 0 && (
                              <p className="text-xs text-white/60 mt-1">
                                {report.evidence_urls.length} evidence link{report.evidence_urls.length !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2 text-sm">
                            <span className="flex items-center space-x-1 text-green-400">
                              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                              <span>{report.attestation_counts.support}</span>
                            </span>
                            <span className="flex items-center space-x-1 text-red-400">
                              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                              <span>{report.attestation_counts.dispute}</span>
                            </span>
                            <span className="flex items-center space-x-1 text-yellow-400">
                              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                              <span>{report.attestation_counts.neutral}</span>
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center text-sm text-white/60">
                          {formatDate(report.created_at)}
                        </td>
                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <VotingButtons item={report} type="affiliated_people_report" compact={true} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <UsersIcon className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/60 text-sm mt-2 mb-4">
                  No affiliated people reports yet
                </p>
                {isAuthenticated && (
                  <Button
                    variant="primary"
                    onClick={() => setShowCreateReportForm(true)}
                    className="flex items-center space-x-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Create First Report</span>
                  </Button>
                )}
              </div>
            )}
          </Paper>
        )}

        {activeTab === 'comments' && (
          <Paper variant="glass" size="lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Comments</h3>
              {isAuthenticated && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCreateCommentForm(true)}
                  className="flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Comment</span>
                </Button>
              )}
            </div>
            
            {comments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/80">Author</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/80">Comment</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-white/80">Votes</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-white/80">Date</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-white/80">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...comments]
                      .sort((a, b) => (b.attestation_counts.support - b.attestation_counts.dispute) - (a.attestation_counts.support - a.attestation_counts.dispute))
                      .map((comment) => (
                      <tr 
                        key={comment.id} 
                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => handleItemClick(comment, 'comment')}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-white/80">Anonymous User</span>
                            {!comment.is_public && (
                              <span className="text-xs text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded">
                                Private
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-white text-sm max-w-xs">
                            <p className="truncate">{comment.content}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2 text-sm">
                            <span className="flex items-center space-x-1 text-green-400">
                              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                              <span>{comment.attestation_counts.support}</span>
                            </span>
                            <span className="flex items-center space-x-1 text-red-400">
                              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                              <span>{comment.attestation_counts.dispute}</span>
                            </span>
                            <span className="flex items-center space-x-1 text-yellow-400">
                              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                              <span>{comment.attestation_counts.neutral}</span>
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center text-sm text-white/60">
                          {formatDate(comment.created_at)}
                        </td>
                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <VotingButtons item={comment} type="comment" compact={true} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <ChatBubbleLeftIcon className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/80">No comments yet</p>
                <p className="text-white/60 text-sm mt-2 mb-4">
                  Be the first to share your thoughts about this player
                </p>
                {isAuthenticated && (
                  <Button
                    variant="primary"
                    onClick={() => setShowCreateCommentForm(true)}
                    className="flex items-center space-x-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Add First Comment</span>
                  </Button>
                )}
              </div>
            )}
          </Paper>
        )}

        {activeTab === 'tags' && (
          <Paper variant="glass" size="lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Tags</h3>
              {isAuthenticated && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCreateTagForm(true)}
                  className="flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Tag</span>
                </Button>
              )}
            </div>
            
            {tags.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/80">Tag</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/80">Type</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-white/80">Votes</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-white/80">Date</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-white/80">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...tags]
                      .sort((a, b) => (b.attestation_counts.support - b.attestation_counts.dispute) - (a.attestation_counts.support - a.attestation_counts.dispute))
                      .map((tag) => (
                      <tr 
                        key={tag.id} 
                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => handleItemClick(tag, 'tag')}
                      >
                        <td className="py-4 px-4">
                          <div className="font-medium text-white">{tag.tag_name}</div>
                        </td>
                        <td className="py-4 px-4">
                          <Chip
                            variant="selected"
                            className={`${
                              tag.tag_type === 'positive' ? 'text-green-400 bg-green-500/20' :
                              tag.tag_type === 'negative' ? 'text-red-400 bg-red-500/20' :
                              'text-yellow-400 bg-yellow-500/20'
                            }`}
                          >
                            {tag.tag_type}
                          </Chip>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2 text-sm">
                            <span className="flex items-center space-x-1 text-green-400">
                              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                              <span>{tag.attestation_counts.support}</span>
                            </span>
                            <span className="flex items-center space-x-1 text-red-400">
                              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                              <span>{tag.attestation_counts.dispute}</span>
                            </span>
                            <span className="flex items-center space-x-1 text-yellow-400">
                              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                              <span>{tag.attestation_counts.neutral}</span>
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center text-sm text-white/60">
                          {formatDate(tag.created_at)}
                        </td>
                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <VotingButtons item={tag} type="tag" compact={true} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <TagIcon className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/80">No tags yet</p>
                <p className="text-white/60 text-sm mt-2 mb-4">
                  Be the first to add a descriptive tag for this player
                </p>
                {isAuthenticated && (
                  <Button
                    variant="primary"
                    onClick={() => setShowCreateTagForm(true)}
                    className="flex items-center space-x-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Add First Tag</span>
                  </Button>
                )}
              </div>
            )}
          </Paper>
        )}
      </div>

      {/* Create Enhanced Report Form Modal */}
      {showCreateReportForm && (
        <CreateEnhancedReportForm
          playerId={player.id}
          playerHandle={player.current_handle}
          reportType={
            activeTab === 'organization-reports' ? 'organization' :
            activeTab === 'alt-account-reports' ? 'alt_account' :
            activeTab === 'affiliated-people-reports' ? 'affiliated_people' :
            'organization' // default fallback
          }
          onClose={() => setShowCreateReportForm(false)}
          onSuccess={() => {
            // Refresh player details to show new report
            // The query will automatically refetch due to cache invalidation
          }}
        />
      )}

      {/* Create Comment Form Modal */}
      {showCreateCommentForm && (
        <CreateCommentForm
          playerId={player.id}
          playerHandle={player.current_handle}
          onClose={() => setShowCreateCommentForm(false)}
          onSuccess={() => {
            // Refresh player details to show new comment
            // The query will automatically refetch due to cache invalidation
          }}
        />
      )}

      {/* Create Tag Form Modal */}
      {showCreateTagForm && (
        <CreateTagForm
          playerId={player.id}
          playerHandle={player.current_handle}
          onClose={() => setShowCreateTagForm(false)}
          onSuccess={() => {
            // Refresh player details to show new tag
            // The query will automatically refetch due to cache invalidation
          }}
        />
      )}

      {/* Reputation Item Details Modal */}
      {selectedItem && selectedItemType && (
        <ReputationItemModal
          item={selectedItem}
          itemType={selectedItemType}
          isOpen={!!selectedItem}
          onClose={handleCloseModal}
        />
      )}
    </Page>
  );
};

export default PlayerProfilePage;