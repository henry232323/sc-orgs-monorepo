import db from '../config/database';
import { 
  ScPlayer, 
  CreateScPlayerData, 
  UpdateScPlayerData,
  PlayerHandleHistory,
  PlayerOrgHistory,
  CreatePlayerHandleHistoryData,
  CreatePlayerOrgHistoryData
} from '../types/sc_player';
import { PlayerDetails } from '../types/reputation';
import { PlayerTagWithAttestations, PlayerReportWithAttestations, PlayerCommentWithAttestations } from '../types/reputation';
import logger from '../config/logger';

export class ScPlayerModel {
  async create(playerData: CreateScPlayerData): Promise<ScPlayer> {
    const insertData = {
      ...playerData,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [player] = await db('sc_players').insert(insertData).returning('*');
    return player;
  }

  async findById(id: string): Promise<ScPlayer | null> {
    const player = await db('sc_players').where({ id }).first();
    return player || null;
  }

  async findBySpectrumId(spectrumId: string): Promise<ScPlayer | null> {
    const player = await db('sc_players').where({ spectrum_id: spectrumId }).first();
    return player || null;
  }

  async findByHandle(handle: string): Promise<ScPlayer | null> {
    const player = await db('sc_players').where({ current_handle: handle }).first();
    return player || null;
  }

  async update(id: string, updateData: UpdateScPlayerData): Promise<ScPlayer | null> {
    const [player] = await db('sc_players')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');
    return player || null;
  }

  async searchPlayers(query: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
    orgs?: string[];
    sort?: 'recent' | 'reputation' | 'alphabetical';
  }): Promise<{ players: ScPlayer[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let queryBuilder = db('sc_players')
      .select('sc_players.*')
      .where('sc_players.is_active', true);

    // Search by handle (current and historical)
    if (query.search) {
      queryBuilder = queryBuilder
        .leftJoin('player_handle_history', 'sc_players.id', 'player_handle_history.player_id')
        .where(function() {
          this.where('sc_players.current_handle', 'ilike', `%${query.search}%`)
              .orWhere('player_handle_history.handle', 'ilike', `%${query.search}%`);
        })
        .groupBy('sc_players.id');
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      queryBuilder = queryBuilder
        .join('player_tags', 'sc_players.id', 'player_tags.player_id')
        .whereIn('player_tags.tag_name', query.tags)
        .groupBy('sc_players.id');
    }

    // Filter by organizations
    if (query.orgs && query.orgs.length > 0) {
      queryBuilder = queryBuilder
        .join('player_org_history', 'sc_players.id', 'player_org_history.player_id')
        .whereIn('player_org_history.org_spectrum_id', query.orgs)
        .where('player_org_history.is_current', true)
        .groupBy('sc_players.id');
    }

    // Sorting
    switch (query.sort) {
      case 'recent':
        queryBuilder = queryBuilder.orderBy('sc_players.last_observed_at', 'desc');
        break;
      case 'reputation':
        // TODO: Implement reputation-based sorting when scoring is ready
        queryBuilder = queryBuilder.orderBy('sc_players.last_observed_at', 'desc');
        break;
      case 'alphabetical':
      default:
        queryBuilder = queryBuilder.orderBy('sc_players.current_handle', 'asc');
        break;
    }

    // Get total count
    const countQuery = queryBuilder.clone().clearSelect().clearOrder().count('* as count');
    const countResult = await countQuery;
    const total = countResult && countResult[0] ? parseInt(countResult[0].count as string) : 0;

    // Get paginated results
    const players = await queryBuilder.limit(limit).offset(offset);

    return { players, total };
  }

  async searchPlayersByHistoricalHandle(searchTerm: string): Promise<ScPlayer[]> {
    // Search for players who historically had this handle but currently have a different handle
    const players = await db('sc_players')
      .select('sc_players.*')
      .join('player_handle_history', 'sc_players.id', 'player_handle_history.player_id')
      .where('sc_players.is_active', true)
      .where('player_handle_history.handle', 'ilike', `%${searchTerm}%`)
      .whereNot('sc_players.current_handle', 'ilike', `%${searchTerm}%`) // Exclude current matches
      .groupBy('sc_players.id')
      .orderBy('sc_players.last_observed_at', 'desc');

    return players;
  }

  async getPlayerDetails(spectrumId: string): Promise<PlayerDetails | null> {
    const player = await this.findBySpectrumId(spectrumId);
    if (!player) return null;

    // Update last observed date for the current handle in handle history
    await this.updateHandleHistoryLastObserved(player.id, player.current_handle);

    // Get handle history
    const handleHistory = await db('player_handle_history')
      .where({ player_id: player.id })
      .orderBy('first_observed_at', 'desc');

    // Get organization history
    const orgHistory = await db('player_org_history')
      .where({ player_id: player.id })
      .orderBy('first_observed_at', 'desc');

    // Get tags with attestations
    const tags = await this.getPlayerTagsWithAttestations(player.id);

    // Get reports with attestations
    const reports = await this.getPlayerReportsWithAttestations(player.id);

    // Get enhanced reports
    const organizationReports = await this.getPlayerOrganizationReports(player.id);
    const altAccountReports = await this.getPlayerAltAccountReports(player.id);
    const affiliatedPeopleReports = await this.getPlayerAffiliatedPeopleReports(player.id);

    // Get comments with attestations
    const comments = await this.getPlayerCommentsWithAttestations(player.id);

    // Calculate reputation score and confidence level
    const reputationScore = this.calculateReputationScore(tags);
    const confidenceLevel = this.calculateConfidenceLevel(tags, reports, comments);

    return {
      player,
      handleHistory,
      orgHistory,
      tags,
      reports,
      organizationReports,
      altAccountReports,
      affiliatedPeopleReports,
      comments,
      reputationScore,
      confidenceLevel,
    };
  }

  async getPlayerTagsWithAttestations(playerId: string): Promise<PlayerTagWithAttestations[]> {
    const tags = await db('player_tags')
      .where({ player_id: playerId })
      .orderBy('created_at', 'desc');

    const tagsWithAttestations = await Promise.all(
      tags.map(async (tag) => {
        const attestations = await db('player_tag_attestations')
          .where({ tag_id: tag.id });

        const attestation_counts = {
          support: attestations.filter(a => a.attestation_type === 'support').length,
          dispute: attestations.filter(a => a.attestation_type === 'dispute').length,
          neutral: attestations.filter(a => a.attestation_type === 'neutral').length,
        };

        const score = this.calculateTagScore(tag.tag_type, attestation_counts);

        return {
          ...tag,
          attestations,
          attestation_counts,
          score,
        };
      })
    );

    return tagsWithAttestations;
  }

  async getPlayerReportsWithAttestations(playerId: string): Promise<PlayerReportWithAttestations[]> {
    const reports = await db('player_reports')
      .where({ player_id: playerId })
      .orderBy('created_at', 'desc');

    const reportsWithAttestations = await Promise.all(
      reports.map(async (report) => {
        const attestations = await db('player_report_attestations')
          .where({ report_id: report.id });

        const attestation_counts = {
          support: attestations.filter(a => a.attestation_type === 'support').length,
          dispute: attestations.filter(a => a.attestation_type === 'dispute').length,
          neutral: attestations.filter(a => a.attestation_type === 'neutral').length,
        };

        return {
          ...report,
          attestations,
          attestation_counts,
        };
      })
    );

    return reportsWithAttestations;
  }

  async getPlayerOrganizationReports(playerId: string): Promise<any[]> {
    const reports = await db('organization_reports')
      .where({ player_id: playerId })
      .orderBy('created_at', 'desc');

    const reportsWithCorroborations = await Promise.all(
      reports.map(async (report) => {
        const corroborations = await db('organization_report_corroborations')
          .where({ report_id: report.id });

        const corroboration_counts = {
          agree: corroborations.filter(c => c.corroboration_type === 'agree').length,
          disagree: corroborations.filter(c => c.corroboration_type === 'disagree').length,
          neutral: corroborations.filter(c => c.corroboration_type === 'neutral').length,
        };

        return {
          ...report,
          report_type: 'organization',
          title: report.org_name || report.org_spectrum_id,
          is_public: true,
          attestations: [],
          attestation_counts: {
            support: corroboration_counts.agree,
            dispute: corroboration_counts.disagree,
            neutral: corroboration_counts.neutral,
          },
          corroborations,
          corroboration_counts,
        };
      })
    );

    return reportsWithCorroborations;
  }

  async getPlayerAltAccountReports(playerId: string): Promise<any[]> {
    const reports = await db('alt_account_reports')
      .where({ main_player_id: playerId })
      .orderBy('created_at', 'desc');

    const reportsWithCorroborations = await Promise.all(
      reports.map(async (report) => {
        const corroborations = await db('alt_account_report_corroborations')
          .where({ report_id: report.id });

        const corroboration_counts = {
          agree: corroborations.filter(c => c.corroboration_type === 'agree').length,
          disagree: corroborations.filter(c => c.corroboration_type === 'disagree').length,
          neutral: corroborations.filter(c => c.corroboration_type === 'neutral').length,
        };

        return {
          ...report,
          report_type: 'alt_account',
          title: report.alt_display_name || report.alt_handle,
          player_id: report.main_player_id,
          is_public: true,
          attestations: [],
          attestation_counts: {
            support: corroboration_counts.agree,
            dispute: corroboration_counts.disagree,
            neutral: corroboration_counts.neutral,
          },
          corroborations,
          corroboration_counts,
        };
      })
    );

    return reportsWithCorroborations;
  }

  async getPlayerAffiliatedPeopleReports(playerId: string): Promise<any[]> {
    const reports = await db('affiliated_people_reports')
      .where({ main_player_id: playerId })
      .orderBy('created_at', 'desc');

    const reportsWithCorroborations = await Promise.all(
      reports.map(async (report) => {
        const corroborations = await db('affiliated_people_report_corroborations')
          .where({ report_id: report.id });

        const corroboration_counts = {
          agree: corroborations.filter(c => c.corroboration_type === 'agree').length,
          disagree: corroborations.filter(c => c.corroboration_type === 'disagree').length,
          neutral: corroborations.filter(c => c.corroboration_type === 'neutral').length,
        };

        return {
          ...report,
          report_type: 'affiliated_people',
          title: report.affiliated_display_name || report.affiliated_handle,
          player_id: report.main_player_id,
          is_public: true,
          attestations: [],
          attestation_counts: {
            support: corroboration_counts.agree,
            dispute: corroboration_counts.disagree,
            neutral: corroboration_counts.neutral,
          },
          corroborations,
          corroboration_counts,
        };
      })
    );

    return reportsWithCorroborations;
  }

  async getPlayerCommentsWithAttestations(playerId: string): Promise<PlayerCommentWithAttestations[]> {
    const comments = await db('player_comments')
      .where({ player_id: playerId })
      .where({ is_public: true })
      .orderBy('created_at', 'desc');

    const commentsWithAttestations = await Promise.all(
      comments.map(async (comment) => {
        const attestations = await db('player_comment_attestations')
          .where({ comment_id: comment.id });

        const attestation_counts = {
          support: attestations.filter(a => a.attestation_type === 'support').length,
          dispute: attestations.filter(a => a.attestation_type === 'dispute').length,
          neutral: attestations.filter(a => a.attestation_type === 'neutral').length,
        };

        return {
          ...comment,
          attestations,
          attestation_counts,
        };
      })
    );

    return commentsWithAttestations;
  }

  async createHandleHistory(data: CreatePlayerHandleHistoryData): Promise<PlayerHandleHistory> {
    const insertData = {
      ...data,
      created_at: new Date(),
    };

    const [history] = await db('player_handle_history').insert(insertData).returning('*');
    return history;
  }

  async createOrgHistory(data: CreatePlayerOrgHistoryData): Promise<PlayerOrgHistory> {
    const insertData = {
      ...data,
      created_at: new Date(),
    };

    const [history] = await db('player_org_history').insert(insertData).returning('*');
    return history;
  }

  async updateLastObserved(playerId: string): Promise<void> {
    await db('sc_players')
      .where({ id: playerId })
      .update({
        last_observed_at: new Date(),
        updated_at: new Date(),
      });
  }

  async updateHandleHistoryLastObserved(playerId: string, handle: string): Promise<void> {
    await db('player_handle_history')
      .where({ 
        player_id: playerId,
        handle: handle
      })
      .update({
        last_observed_at: new Date(),
      });
  }

  async updateLastSpectrumSync(playerId: string): Promise<void> {
    await db('sc_players')
      .where({ id: playerId })
      .update({
        last_spectrum_sync_at: new Date(),
        updated_at: new Date(),
      });
  }

  private calculateReputationScore(tags: PlayerTagWithAttestations[]): number {
    return tags.reduce((total, tag) => total + tag.score, 0);
  }

  private calculateConfidenceLevel(
    tags: PlayerTagWithAttestations[],
    reports: PlayerReportWithAttestations[],
    comments: PlayerCommentWithAttestations[]
  ): 'low' | 'medium' | 'high' {
    const totalAttestations = 
      tags.reduce((sum, tag) => sum + Object.values(tag.attestation_counts).reduce((a, b) => a + b, 0), 0) +
      reports.reduce((sum, report) => sum + Object.values(report.attestation_counts).reduce((a, b) => a + b, 0), 0) +
      comments.reduce((sum, comment) => sum + Object.values(comment.attestation_counts).reduce((a, b) => a + b, 0), 0);

    if (totalAttestations >= 20) return 'high';
    if (totalAttestations >= 5) return 'medium';
    return 'low';
  }

  private calculateTagScore(tagType: 'positive' | 'negative' | 'neutral', counts: { support: number; dispute: number; neutral: number }): number {
    const { support, dispute } = counts;
    const netScore = support - dispute;
    
    switch (tagType) {
      case 'positive':
        return netScore;
      case 'negative':
        return -netScore;
      case 'neutral':
      default:
        return 0;
    }
  }
}
