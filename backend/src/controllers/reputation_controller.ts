import { Request, Response } from 'express';
import { ScPlayerModel } from '../models/sc_player_model';
import { ReputationModel } from '../models/reputation_model';
import { SpectrumAPIClient } from '../clients/spectrum';
import { getUserFromRequest } from '../utils/user-casting';
import logger from '../config/logger';
import {
  PlayerSearchQuery,
  PlayerLookupRequest,
  CreatePlayerReportData,
  CreatePlayerCommentData,
  CreatePlayerTagData,
  AttestReportRequest,
  AttestCommentRequest,
  AttestTagRequest,
  // Enhanced Reporting System Types
  CreateOrganizationReportData,
  CreateOrganizationReportCorroborationData,
  CreateAltAccountReportData,
  CreateAltAccountReportCorroborationData,
  CreateAffiliatedPeopleReportData,
  CreateAffiliatedPeopleReportCorroborationData,
} from '../types/reputation';

export class ReputationController {
  private scPlayerModel: ScPlayerModel;
  private reputationModel: ReputationModel;
  private spectrumClient: SpectrumAPIClient;

  constructor() {
    this.scPlayerModel = new ScPlayerModel();
    this.reputationModel = new ReputationModel();
    this.spectrumClient = new SpectrumAPIClient();
  }

  // Player Management Endpoints

  /**
   * Search for Star Citizen players (legacy endpoint for pagination)
   * GET /api/reputation/players
   */
  async searchPlayers(req: Request, res: Response): Promise<void> {
    try {
      const query: PlayerSearchQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        search: req.query.search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        orgs: req.query.orgs ? (req.query.orgs as string).split(',') : undefined,
        sort: (req.query.sort as 'recent' | 'reputation' | 'alphabetical') || 'alphabetical',
      };

      const { players, total } = await this.scPlayerModel.searchPlayers(query);

      const totalPages = Math.ceil(total / (query.limit || 20));
      const hasNext = (query.page || 1) < totalPages;
      const hasPrev = (query.page || 1) > 1;

      res.json({
        success: true,
        data: {
          players,
          pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages,
            hasNext,
            hasPrev,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to search players:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search players',
      });
    }
  }

  /**
   * Search for players by handle (current and historical)
   * POST /api/reputation/search
   */
  async searchPlayersByHandle(req: Request, res: Response): Promise<void> {
    try {
      const { handle }: { handle: string } = req.body;

      if (!handle || handle.trim().length < 2) {
        res.status(400).json({
          success: false,
          error: 'Handle must be at least 2 characters long',
        });
        return;
      }

      const searchTerm = handle.trim();

      // 1. Search for current users with this handle
      const currentUsers = await this.scPlayerModel.searchPlayers({
        page: 1,
        limit: 100,
        search: searchTerm,
        sort: 'alphabetical',
      });

      // 2. Search for historical users with this handle
      const historicalUsers = await this.scPlayerModel.searchPlayersByHistoricalHandle(searchTerm);

      // 3. Try to fetch current user from Spectrum (if they exist but aren't in our DB)
      let spectrumUser = null;
      try {
        const spectrumResponse = await this.spectrumClient.fetchMemberByHandle(searchTerm);
        if (spectrumResponse.success && spectrumResponse.data?.member) {
          const spectrumMember = spectrumResponse.data.member;
          
          // Check if we already have this user
          const existingUser = await this.scPlayerModel.findBySpectrumId(spectrumMember.id);
          
          if (!existingUser) {
            // Create new user from Spectrum data
            const newPlayer = await this.scPlayerModel.create({
              spectrum_id: spectrumMember.id,
              current_handle: spectrumMember.nickname,
              current_display_name: spectrumMember.displayname,
              last_spectrum_sync_at: new Date(),
            });

            // Create initial handle history
            await this.scPlayerModel.createHandleHistory({
              player_id: newPlayer.id,
              handle: spectrumMember.nickname,
              display_name: spectrumMember.displayname,
            });

            spectrumUser = newPlayer;
            logger.info(`Created new player from Spectrum: ${spectrumMember.nickname} (${spectrumMember.id})`);
          }
        }
      } catch (spectrumError) {
        // Spectrum lookup failed, continue without it
        logger.debug(`Spectrum lookup failed for ${searchTerm}:`, spectrumError);
      }

      // Combine results, removing duplicates by Spectrum ID
      const allUsers = new Map();
      
      // Add current users
      currentUsers.players.forEach(player => {
        allUsers.set(player.spectrum_id, { ...player, matchType: 'current' });
      });
      
      // Add historical users (only if not already in current users)
      historicalUsers.forEach(player => {
        if (!allUsers.has(player.spectrum_id)) {
          allUsers.set(player.spectrum_id, { ...player, matchType: 'historical' });
        }
      });
      
      // Add Spectrum user if found and not already in our database
      if (spectrumUser && !allUsers.has(spectrumUser.spectrum_id)) {
        allUsers.set(spectrumUser.spectrum_id, { ...spectrumUser, matchType: 'spectrum' });
      }

      const uniqueUsers = Array.from(allUsers.values());

      res.json({
        success: true,
        data: {
          users: uniqueUsers,
          total: uniqueUsers.length,
          searchTerm,
          currentCount: currentUsers.players.length,
          historicalCount: historicalUsers.length,
          spectrumCount: spectrumUser ? 1 : 0,
        },
      });
    } catch (error) {
      logger.error('Failed to search players by handle:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search players',
      });
    }
  }

  /**
   * Get detailed player information
   * GET /api/reputation/players/:spectrumId
   */
  async getPlayerDetails(req: Request, res: Response): Promise<void> {
    try {
      const { spectrumId } = req.params;

      if (!spectrumId) {
        res.status(400).json({
          success: false,
          error: 'Spectrum ID is required',
        });
        return;
      }

      const playerDetails = await this.scPlayerModel.getPlayerDetails(spectrumId);

      if (!playerDetails) {
        res.status(404).json({
          success: false,
          error: 'Player not found',
        });
        return;
      }

      res.json({
        success: true,
        data: playerDetails,
      });
    } catch (error) {
      logger.error('Failed to get player details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get player details',
      });
    }
  }

  /**
   * Lookup player by handle and create if not exists
   * POST /api/reputation/players/lookup
   */
  async lookupPlayer(req: Request, res: Response): Promise<void> {
    try {
      const { handle }: PlayerLookupRequest = req.body;

      if (!handle) {
        res.status(400).json({
          success: false,
          error: 'Handle is required',
        });
        return;
      }

      // First check if player already exists by current handle
      let player = await this.scPlayerModel.findByHandle(handle);

      if (!player) {
        // Look up player in Spectrum to get current data
        const spectrumResponse = await this.spectrumClient.fetchMemberByHandle(handle);

        if (!spectrumResponse.success || !spectrumResponse.data?.member) {
          res.status(404).json({
            success: false,
            error: 'Player not found in Spectrum',
          });
          return;
        }

        const spectrumMember = spectrumResponse.data.member;

        // Check if we already have this player by Spectrum ID (handle change scenario)
        const existingPlayer = await this.scPlayerModel.findBySpectrumId(spectrumMember.id);

        if (existingPlayer) {
          // Player exists but with different handle - update their info
          const updatedPlayer = await this.scPlayerModel.update(existingPlayer.id, {
            current_handle: spectrumMember.nickname,
            current_display_name: spectrumMember.displayname,
            last_spectrum_sync_at: new Date(),
          });

          if (!updatedPlayer) {
            res.status(500).json({
              success: false,
              error: 'Failed to update player',
            });
            return;
          }

          player = updatedPlayer;

          // Create handle history entry for the new handle
          await this.scPlayerModel.createHandleHistory({
            player_id: player.id,
            handle: spectrumMember.nickname,
            display_name: spectrumMember.displayname,
          });

          logger.info(`Updated existing player ${existingPlayer.current_handle} -> ${spectrumMember.nickname} (${spectrumMember.id})`);
        } else {
          // Truly new player - create new record
          player = await this.scPlayerModel.create({
            spectrum_id: spectrumMember.id,
            current_handle: spectrumMember.nickname,
            current_display_name: spectrumMember.displayname,
            last_spectrum_sync_at: new Date(),
          });

          // Create initial handle history
          await this.scPlayerModel.createHandleHistory({
            player_id: player.id,
            handle: spectrumMember.nickname,
            display_name: spectrumMember.displayname,
          });

          logger.info(`Created new player record for ${handle} (${spectrumMember.id})`);
        }
      } else {
        // Player found by current handle - update last observed time
        await this.scPlayerModel.updateLastObserved(player.id);
      }

      res.json({
        success: true,
        data: player,
      });
    } catch (error) {
      logger.error('Failed to lookup player:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to lookup player',
      });
    }
  }

  /**
   * Sync player data with Spectrum
   * PUT /api/reputation/players/:spectrumId/sync
   */
  async syncPlayerData(req: Request, res: Response): Promise<void> {
    try {
      const { spectrumId } = req.params;

      if (!spectrumId) {
        res.status(400).json({
          success: false,
          error: 'Spectrum ID is required',
        });
        return;
      }

      const player = await this.scPlayerModel.findBySpectrumId(spectrumId);

      if (!player) {
        res.status(404).json({
          success: false,
          error: 'Player not found',
        });
        return;
      }

      // Fetch latest data from Spectrum
      const spectrumResponse = await this.spectrumClient.fetchMemberById(spectrumId);

      if (!spectrumResponse.success || !spectrumResponse.data?.member) {
        res.status(404).json({
          success: false,
          error: 'Player not found in Spectrum',
        });
        return;
      }

      const spectrumMember = spectrumResponse.data.member;

      // Update player data
      const updatedPlayer = await this.scPlayerModel.update(player.id, {
        current_handle: spectrumMember.nickname,
        current_display_name: spectrumMember.displayname,
        last_spectrum_sync_at: new Date(),
      });

      // Update handle history if handle changed
      if (player.current_handle !== spectrumMember.nickname) {
        await this.scPlayerModel.createHandleHistory({
          player_id: player.id,
          handle: spectrumMember.nickname,
          display_name: spectrumMember.displayname,
        });
      }

      res.json({
        success: true,
        data: updatedPlayer,
        message: 'Player data synced successfully',
      });
    } catch (error) {
      logger.error('Failed to sync player data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync player data',
      });
    }
  }

  // Reporting System Endpoints

  /**
   * Create a new report
   * POST /api/reputation/reports
   */
  async createReport(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const reportData: CreatePlayerReportData = {
        ...req.body,
        reporter_id: user.id,
      };

      const report = await this.reputationModel.createReport(reportData);

      res.status(201).json({
        success: true,
        data: {
          ...report,
          player_id: report.player_id, // Include player_id for cache invalidation
        },
        message: 'Report created successfully',
      });
    } catch (error) {
      logger.error('Failed to create report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create report',
      });
    }
  }

  /**
   * Get report details with attestations
   * GET /api/reputation/reports/:id
   */
  async getReportDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const report = await this.reputationModel.getReportWithAttestations(id);

      if (!report) {
        res.status(404).json({
          success: false,
          error: 'Report not found',
        });
        return;
      }

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Failed to get report details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get report details',
      });
    }
  }

  /**
   * Attest to a report
   * POST /api/reputation/reports/:id/attest
   */
  async attestToReport(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      const attestationData: AttestReportRequest = req.body;

      // Check if user already attested
      const existingAttestation = await this.reputationModel.getUserReportAttestation(id, user.id);

      if (existingAttestation) {
        res.status(400).json({
          success: false,
          error: 'You have already attested to this report',
        });
        return;
      }

      const attestation = await this.reputationModel.createReportAttestation({
        report_id: id,
        attester_id: user.id,
        attestation_type: attestationData.attestation_type,
        comment: attestationData.comment,
      });

      // Get the report to include player_id in response
      const report = await this.reputationModel.getReportById(id);
      const responseData = {
        ...attestation,
        player_id: report?.player_id,
      };

      res.status(201).json({
        success: true,
        data: responseData,
        message: 'Attestation created successfully',
      });
    } catch (error) {
      logger.error('Failed to attest to report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to attest to report',
      });
    }
  }

  // Comments System Endpoints

  /**
   * Add a comment to a player
   * POST /api/reputation/players/:playerId/comments
   */
  async addComment(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { playerId } = req.params;
      const commentData: CreatePlayerCommentData = {
        ...req.body,
        player_id: playerId,
        commenter_id: user.id,
      };

      const comment = await this.reputationModel.createComment(commentData);

      res.status(201).json({
        success: true,
        data: {
          ...comment,
          player_id: comment.player_id, // Include player_id for cache invalidation
        },
        message: 'Comment added successfully',
      });
    } catch (error) {
      logger.error('Failed to add comment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add comment',
      });
    }
  }

  /**
   * Attest to a comment
   * POST /api/reputation/comments/:id/attest
   */
  async attestToComment(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      const attestationData: AttestCommentRequest = req.body;

      // Check if user already attested
      const existingAttestation = await this.reputationModel.getUserCommentAttestation(id, user.id);

      let attestation;
      if (existingAttestation) {
        // Update existing attestation
        attestation = await this.reputationModel.updateCommentAttestation(id, user.id, {
          attestation_type: attestationData.attestation_type,
        });
      } else {
        // Create new attestation
        attestation = await this.reputationModel.createCommentAttestation({
          comment_id: id,
          attester_id: user.id,
          attestation_type: attestationData.attestation_type,
        });
      }

      // Get the comment to include player_id in response
      const comment = await this.reputationModel.getCommentById(id);
      const responseData = {
        ...attestation,
        player_id: comment?.player_id,
      };

      res.status(201).json({
        success: true,
        data: responseData,
        message: 'Attestation created successfully',
      });
    } catch (error) {
      logger.error('Failed to attest to comment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to attest to comment',
      });
    }
  }

  // Tagging System Endpoints

  /**
   * Add a tag to a player
   * POST /api/reputation/players/:playerId/tags
   */
  async addTag(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { playerId } = req.params;
      const tagData: CreatePlayerTagData = {
        ...req.body,
        player_id: playerId,
        tagger_id: user.id,
      };

      // Check if user already tagged this player with this tag
      const existingTag = await this.reputationModel.getUserTag(playerId, user.id, tagData.tag_name);

      if (existingTag) {
        res.status(400).json({
          success: false,
          error: 'You have already tagged this player with this tag',
        });
        return;
      }

      const tag = await this.reputationModel.createTag(tagData);

      res.status(201).json({
        success: true,
        data: {
          ...tag,
          player_id: tag.player_id, // Include player_id for cache invalidation
        },
        message: 'Tag added successfully',
      });
    } catch (error) {
      logger.error('Failed to add tag:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add tag',
      });
    }
  }

  /**
   * Attest to a tag
   * POST /api/reputation/tags/:id/attest
   */
  async attestToTag(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      const attestationData: AttestTagRequest = req.body;

      // Check if user already attested
      const existingAttestation = await this.reputationModel.getUserTagAttestation(id, user.id);

      let attestation;
      if (existingAttestation) {
        // Update existing attestation
        attestation = await this.reputationModel.updateTagAttestation(id, user.id, {
          attestation_type: attestationData.attestation_type,
        });
      } else {
        // Create new attestation
        attestation = await this.reputationModel.createTagAttestation({
          tag_id: id,
          attester_id: user.id,
          attestation_type: attestationData.attestation_type,
        });
      }

      // Get the tag to include player_id in response
      const tag = await this.reputationModel.getTagById(id);
      const responseData = {
        ...attestation,
        player_id: tag?.player_id,
      };

      res.status(201).json({
        success: true,
        data: responseData,
        message: 'Attestation created successfully',
      });
    } catch (error) {
      logger.error('Failed to attest to tag:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to attest to tag',
      });
    }
  }

  // Enhanced Reporting System Endpoints

  /**
   * Create organization report
   * POST /api/reputation/organization-reports
   */
  async createOrganizationReport(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const reportData: CreateOrganizationReportData = {
        ...req.body,
        reporter_id: user.id,
      };

      const report = await this.reputationModel.createOrganizationReport(reportData);
      
      // Get the player to include spectrum_id in response
      const player = await this.scPlayerModel.findById(report.player_id);

      res.status(201).json({
        success: true,
        data: {
          ...report,
          player_id: player?.spectrum_id, // Return spectrum_id for cache invalidation
        },
        message: 'Organization report created successfully',
      });
    } catch (error) {
      logger.error('Failed to create organization report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create organization report',
      });
    }
  }

  /**
   * Get organization reports for a player
   * GET /api/reputation/players/:playerId/organization-reports
   */
  async getOrganizationReportsByPlayer(req: Request, res: Response): Promise<void> {
    try {
      const { playerId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.reputationModel.getOrganizationReportsByPlayer(playerId, page, limit);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get organization reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get organization reports',
      });
    }
  }

  /**
   * Corroborate organization report
   * POST /api/reputation/organization-reports/:id/corroborate
   */
  async corroborateOrganizationReport(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { reportId } = req.params;
      const corroborationData: CreateOrganizationReportCorroborationData = {
        report_id: reportId,
        corroborator_id: user.id,
        ...req.body,
      };

      // Check if user already corroborated
      const existingCorroboration = await this.reputationModel.getUserOrganizationReportCorroboration(reportId, user.id);

      let corroboration;
      if (existingCorroboration) {
        // Update existing vote
        corroboration = await this.reputationModel.updateOrganizationReportCorroboration(reportId, user.id, {
          corroboration_type: corroborationData.corroboration_type,
          comment: corroborationData.comment,
        });
      } else {
        // Create new vote
        corroboration = await this.reputationModel.createOrganizationReportCorroboration(corroborationData);
      }

      // Get the report to include spectrum_id in response
      const report = await this.reputationModel.getOrganizationReportById(reportId);
      const player = report ? await this.scPlayerModel.findById(report.player_id) : null;

      res.status(201).json({
        success: true,
        data: {
          ...corroboration,
          player_id: player?.spectrum_id, // Return spectrum_id for cache invalidation
        },
        message: 'Vote recorded successfully',
      });
    } catch (error) {
      logger.error('Failed to vote on organization report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to vote on organization report',
      });
    }
  }

  /**
   * Create alt account report
   * POST /api/reputation/alt-account-reports
   */
  async createAltAccountReport(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const reportData: CreateAltAccountReportData = {
        ...req.body,
        reporter_id: user.id,
      };

      // Try to fetch alt account data from Spectrum
      let altSpectrumId: string | undefined;
      let altDisplayName: string | undefined;
      
      try {
        const spectrumResponse = await this.spectrumClient.fetchMemberByHandle(reportData.alt_handle);
        const spectrumMember = spectrumResponse.data.member;
        
        altSpectrumId = spectrumMember.id;
        altDisplayName = spectrumMember.displayname;
      } catch (spectrumError) {
        logger.warn(`Failed to fetch Spectrum data for alt handle ${reportData.alt_handle}:`, spectrumError);
        // Continue without Spectrum data - user can still create the report
      }

      const report = await this.reputationModel.createAltAccountReport(reportData);
      
      // Update the report with Spectrum data if available
      if (altSpectrumId || altDisplayName) {
        await this.reputationModel.updateAltAccountReportSpectrumData(report.id, altSpectrumId, altDisplayName);
      }
      
      // Get the player to include spectrum_id in response
      const player = await this.scPlayerModel.findById(report.main_player_id);

      res.status(201).json({
        success: true,
        data: {
          ...report,
          player_id: player?.spectrum_id, // Return spectrum_id for cache invalidation
        },
        message: 'Alt account report created successfully',
      });
    } catch (error) {
      logger.error('Failed to create alt account report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create alt account report',
      });
    }
  }

  /**
   * Get alt account reports for a player
   * GET /api/reputation/players/:playerId/alt-account-reports
   */
  async getAltAccountReportsByPlayer(req: Request, res: Response): Promise<void> {
    try {
      const { playerId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.reputationModel.getAltAccountReportsByPlayer(playerId, page, limit);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get alt account reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get alt account reports',
      });
    }
  }

  /**
   * Corroborate alt account report
   * POST /api/reputation/alt-account-reports/:id/corroborate
   */
  async corroborateAltAccountReport(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { reportId } = req.params;
      const corroborationData: CreateAltAccountReportCorroborationData = {
        report_id: reportId,
        corroborator_id: user.id,
        ...req.body,
      };

      // Check if user already corroborated
      const existingCorroboration = await this.reputationModel.getUserAltAccountReportCorroboration(reportId, user.id);

      let corroboration;
      if (existingCorroboration) {
        // Update existing vote
        corroboration = await this.reputationModel.updateAltAccountReportCorroboration(reportId, user.id, {
          corroboration_type: corroborationData.corroboration_type,
          comment: corroborationData.comment,
        });
      } else {
        // Create new vote
        corroboration = await this.reputationModel.createAltAccountReportCorroboration(corroborationData);
      }

      // Get the report to include spectrum_id in response
      const report = await this.reputationModel.getAltAccountReportById(reportId);
      const player = report ? await this.scPlayerModel.findById(report.main_player_id) : null;

      res.status(201).json({
        success: true,
        data: {
          ...corroboration,
          player_id: player?.spectrum_id, // Return spectrum_id for cache invalidation
        },
        message: 'Vote recorded successfully',
      });
    } catch (error) {
      logger.error('Failed to vote on alt account report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to vote on alt account report',
      });
    }
  }

  /**
   * Create affiliated people report
   * POST /api/reputation/affiliated-people-reports
   */
  async createAffiliatedPeopleReport(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const reportData: CreateAffiliatedPeopleReportData = {
        ...req.body,
        reporter_id: user.id,
      };

      // Try to fetch affiliated person data from Spectrum
      let affiliatedSpectrumId: string | undefined;
      let affiliatedDisplayName: string | undefined;
      
      try {
        const spectrumResponse = await this.spectrumClient.fetchMemberByHandle(reportData.affiliated_handle);
        const spectrumMember = spectrumResponse.data.member;
        
        affiliatedSpectrumId = spectrumMember.id;
        affiliatedDisplayName = spectrumMember.displayname;
      } catch (spectrumError) {
        logger.warn(`Failed to fetch Spectrum data for affiliated handle ${reportData.affiliated_handle}:`, spectrumError);
        // Continue without Spectrum data - user can still create the report
      }

      const report = await this.reputationModel.createAffiliatedPeopleReport(reportData);
      
      // Update the report with Spectrum data if available
      if (affiliatedSpectrumId || affiliatedDisplayName) {
        await this.reputationModel.updateAffiliatedPeopleReportSpectrumData(report.id, affiliatedSpectrumId, affiliatedDisplayName);
      }
      
      // Get the player to include spectrum_id in response
      const player = await this.scPlayerModel.findById(report.main_player_id);

      res.status(201).json({
        success: true,
        data: {
          ...report,
          player_id: player?.spectrum_id, // Return spectrum_id for cache invalidation
        },
        message: 'Affiliated people report created successfully',
      });
    } catch (error) {
      logger.error('Failed to create affiliated people report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create affiliated people report',
      });
    }
  }

  /**
   * Get affiliated people reports for a player
   * GET /api/reputation/players/:playerId/affiliated-people-reports
   */
  async getAffiliatedPeopleReportsByPlayer(req: Request, res: Response): Promise<void> {
    try {
      const { playerId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.reputationModel.getAffiliatedPeopleReportsByPlayer(playerId, page, limit);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get affiliated people reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get affiliated people reports',
      });
    }
  }

  /**
   * Corroborate affiliated people report
   * POST /api/reputation/affiliated-people-reports/:id/corroborate
   */
  async corroborateAffiliatedPeopleReport(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { reportId } = req.params;
      const corroborationData: CreateAffiliatedPeopleReportCorroborationData = {
        report_id: reportId,
        corroborator_id: user.id,
        ...req.body,
      };

      // Check if user already corroborated
      const existingCorroboration = await this.reputationModel.getUserAffiliatedPeopleReportCorroboration(reportId, user.id);

      let corroboration;
      if (existingCorroboration) {
        // Update existing vote
        corroboration = await this.reputationModel.updateAffiliatedPeopleReportCorroboration(reportId, user.id, {
          corroboration_type: corroborationData.corroboration_type,
          comment: corroborationData.comment,
        });
      } else {
        // Create new vote
        corroboration = await this.reputationModel.createAffiliatedPeopleReportCorroboration(corroborationData);
      }

      // Get the report to include spectrum_id in response
      const report = await this.reputationModel.getAffiliatedPeopleReportById(reportId);
      const player = report ? await this.scPlayerModel.findById(report.main_player_id) : null;

      res.status(201).json({
        success: true,
        data: {
          ...corroboration,
          player_id: player?.spectrum_id, // Return spectrum_id for cache invalidation
        },
        message: 'Vote recorded successfully',
      });
    } catch (error) {
      logger.error('Failed to vote on affiliated people report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to vote on affiliated people report',
      });
    }
  }

  /**
   * Remove comment attestation
   * DELETE /api/reputation/comments/:id/attest
   */
  async removeCommentAttestation(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { id: commentId } = req.params;
      await this.reputationModel.deleteCommentAttestation(commentId, user.id);

      res.status(200).json({
        success: true,
        message: 'Attestation removed successfully',
      });
    } catch (error) {
      logger.error('Failed to remove comment attestation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove attestation',
      });
    }
  }

  /**
   * Remove tag attestation
   * DELETE /api/reputation/tags/:id/attest
   */
  async removeTagAttestation(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { id: tagId } = req.params;
      await this.reputationModel.deleteTagAttestation(tagId, user.id);

      res.status(200).json({
        success: true,
        message: 'Attestation removed successfully',
      });
    } catch (error) {
      logger.error('Failed to remove tag attestation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove attestation',
      });
    }
  }

  /**
   * Remove organization report corroboration
   * DELETE /api/reputation/organization-reports/:reportId/corroborate
   */
  async removeOrganizationReportCorroboration(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { reportId } = req.params;
      await this.reputationModel.deleteOrganizationReportCorroboration(reportId, user.id);

      // Get the report to include spectrum_id in response
      const report = await this.reputationModel.getOrganizationReportById(reportId);
      const player = report ? await this.scPlayerModel.findById(report.player_id) : null;

      res.status(200).json({
        success: true,
        data: {
          player_id: player?.spectrum_id, // Return spectrum_id for cache invalidation
        },
        message: 'Vote removed successfully',
      });
    } catch (error) {
      logger.error('Failed to remove organization report corroboration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove vote',
      });
    }
  }

  /**
   * Remove alt account report corroboration
   * DELETE /api/reputation/alt-account-reports/:reportId/corroborate
   */
  async removeAltAccountReportCorroboration(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { reportId } = req.params;
      await this.reputationModel.deleteAltAccountReportCorroboration(reportId, user.id);

      // Get the report to include spectrum_id in response
      const report = await this.reputationModel.getAltAccountReportById(reportId);
      const player = report ? await this.scPlayerModel.findById(report.main_player_id) : null;

      res.status(200).json({
        success: true,
        data: {
          player_id: player?.spectrum_id, // Return spectrum_id for cache invalidation
        },
        message: 'Vote removed successfully',
      });
    } catch (error) {
      logger.error('Failed to remove alt account report corroboration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove vote',
      });
    }
  }

  /**
   * Remove affiliated people report corroboration
   * DELETE /api/reputation/affiliated-people-reports/:reportId/corroborate
   */
  async removeAffiliatedPeopleReportCorroboration(req: Request, res: Response): Promise<void> {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { reportId } = req.params;
      await this.reputationModel.deleteAffiliatedPeopleReportCorroboration(reportId, user.id);

      // Get the report to include spectrum_id in response
      const report = await this.reputationModel.getAffiliatedPeopleReportById(reportId);
      const player = report ? await this.scPlayerModel.findById(report.main_player_id) : null;

      res.status(200).json({
        success: true,
        data: {
          player_id: player?.spectrum_id, // Return spectrum_id for cache invalidation
        },
        message: 'Vote removed successfully',
      });
    } catch (error) {
      logger.error('Failed to remove affiliated people report corroboration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove vote',
      });
    }
  }
}