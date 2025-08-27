import React from 'react';
import { Link } from 'react-router-dom';
import { UserIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Paper, Chip } from '../ui';
import type { ScPlayer } from '../../types/reputation';

interface PlayerCardProps {
  player: ScPlayer;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player }) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Link to={`/reputation/players/${player.spectrum_id}`}>
      <Paper variant="glass" size="lg" className="group hover:bg-white/10 transition-all duration-200">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-white/60" />
            </div>
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <h3 className="text-lg font-medium text-white group-hover:text-[var(--color-accent-blue)] transition-colors mb-2">
                {player.current_handle}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <Chip
                  variant="selected"
                  size="sm"
                  className={getReputationColor(50)}
                >
                  {getReputationLabel(50)}
                </Chip>
                {player.is_active ? (
                  <Chip variant="selected" size="sm" className="text-green-400 bg-green-500/20">
                    Active
                  </Chip>
                ) : (
                  <Chip variant="selected" size="sm" className="text-white/60 bg-white/10">
                    Inactive
                  </Chip>
                )}
              </div>
            </div>

            {player.current_display_name && (
              <p className="text-sm text-white/80 mb-2">
                {player.current_display_name}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center space-x-4 text-sm text-white/60">
              <div className="flex items-center space-x-1">
                <ShieldCheckIcon className="w-4 h-4" />
                <span>Rep: 50</span>
              </div>
              <div className="flex items-center space-x-1">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span>Reports: 0</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>First confirmed: {formatDate(player.first_observed_at)}</span>
                <span>Last confirmed: {formatDate(player.last_observed_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </Paper>
    </Link>
  );
};

export default PlayerCard;
