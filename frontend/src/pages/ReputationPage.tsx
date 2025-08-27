import React, { useState } from 'react';
import { MagnifyingGlassIcon, ShieldCheckIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useSearchPlayersByHandleMutation } from '../services/apiSlice';
import { Paper, Button, ListPage } from '../components/ui';
import { Link } from 'react-router-dom';

const ReputationPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [searchPlayersByHandle, { isLoading }] = useSearchPlayersByHandleMutation();

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) return;
    
    setIsSearching(true);
    try {
      const result = await searchPlayersByHandle({ handle: searchTerm.trim() }).unwrap();
      setSearchResults(result);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults({ users: [], total: 0, searchTerm: searchTerm.trim(), currentCount: 0, historicalCount: 0, spectrumCount: 0 });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const getMatchTypeIcon = (matchType: string) => {
    switch (matchType) {
      case 'current':
        return <UserIcon className="w-4 h-4 text-green-400" />;
      case 'historical':
        return <ClockIcon className="w-4 h-4 text-yellow-400" />;
      case 'spectrum':
        return <ShieldCheckIcon className="w-4 h-4 text-blue-400" />;
      default:
        return <UserIcon className="w-4 h-4 text-white/60" />;
    }
  };

  const getMatchTypeLabel = (matchType: string) => {
    switch (matchType) {
      case 'current':
        return 'Current Handle';
      case 'historical':
        return 'Historical Handle';
      case 'spectrum':
        return 'From Spectrum';
      default:
        return 'Unknown';
    }
  };

  return (
    <ListPage 
      title="Player Reputation" 
      subtitle="Search for Star Citizen players to view their reputation, reports, and community feedback"
    >
      {/* Search Input */}
      <Paper variant="glass-strong" size="lg">
        <div className="space-y-[var(--spacing-card-lg)]">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              placeholder="Enter player handle to search..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyPress={handleKeyPress}
              className="input-glass w-full pl-10 pr-4 py-3 text-primary placeholder:text-muted focus:ring-2 focus:ring-[var(--color-accent-blue)] focus:ring-opacity-50"
            />
          </div>
          
          <div className="flex justify-center">
            <Button 
              variant="primary" 
              size="lg" 
              onClick={handleSearch}
              disabled={!searchTerm.trim() || searchTerm.trim().length < 2 || isLoading || isSearching}
              className="px-8"
            >
              {isLoading || isSearching ? 'Searching...' : 'Search Players'}
            </Button>
          </div>
        </div>
      </Paper>

      {/* Search Results */}
      {searchResults && (
        <Paper variant="glass" size="lg">
          <div className="space-y-[var(--spacing-card-lg)]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Search Results for "{searchResults.searchTerm}"
              </h3>
              <span className="text-sm text-white/60">
                {searchResults.total} player{searchResults.total !== 1 ? 's' : ''} found
              </span>
            </div>

            {/* Search Summary */}
            <div className="flex items-center space-x-6 text-sm text-white/80">
              <div className="flex items-center space-x-2">
                <UserIcon className="w-4 h-4 text-green-400" />
                <span>{searchResults.currentCount} current</span>
              </div>
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-4 h-4 text-yellow-400" />
                <span>{searchResults.historicalCount} historical</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheckIcon className="w-4 h-4 text-blue-400" />
                <span>{searchResults.spectrumCount} from Spectrum</span>
              </div>
            </div>

            {searchResults.users.length === 0 ? (
              <div className="text-center py-8">
                <UserIcon className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/80">No players found matching "{searchResults.searchTerm}"</p>
                <p className="text-white/60 text-sm mt-2">
                  Try searching for a different handle or check if the player exists in Spectrum
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.users.map((player: any) => (
                  <Link to={`/reputation/players/${player.spectrum_id}`} key={player.id} className="block">
                    <Paper variant="glass" size="lg" className="group hover:bg-white/10 transition-all duration-200 cursor-pointer">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                            {getMatchTypeIcon(player.matchType)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-2">
                            <h3 className="text-lg font-medium text-white group-hover:text-[var(--color-accent-blue)] transition-colors mb-2">
                              {player.current_handle}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">
                                {getMatchTypeLabel(player.matchType)}
                              </span>
                              {player.is_active ? (
                                <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
                                  Active
                                </span>
                              ) : (
                                <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                          {player.current_display_name && (
                            <p className="text-sm text-white/80 mb-2">{player.current_display_name}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-white/60">
                            <div className="flex items-center space-x-1">
                              <ShieldCheckIcon className="w-4 h-4" />
                              <span>Rep: 50</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>Reports: 0</span>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="flex items-center justify-between text-xs text-white/50">
                              <span>First seen: {new Date(player.first_observed_at).toLocaleDateString()}</span>
                              <span>Last seen: {new Date(player.last_observed_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Paper>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Paper>
      )}

      {/* Instructions */}
      {!searchResults && (
        <Paper variant="glass" size="lg" className="text-center">
          <ShieldCheckIcon className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Search for Star Citizen Players</h3>
          <p className="text-white/80 mb-4">
            Enter a player's handle to search for current users, historical users, and fetch from Spectrum.
          </p>
          <div className="text-sm text-white/60 space-y-1">
            <p>• Search finds players with current handles matching your query</p>
            <p>• Also finds players who historically had that handle</p>
            <p>• Automatically fetches new players from Spectrum if found</p>
            <p>• Click on any player to view their detailed profile</p>
          </div>
        </Paper>
      )}
    </ListPage>
  );
};

export default ReputationPage;
