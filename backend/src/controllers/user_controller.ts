import { Request, Response } from 'express';
import { UserModel } from '../models/user_model';
import logger from '../config/logger';

import { getUserFromRequest, requireUserFromRequest } from '../utils/user-casting';
const userModel = new UserModel();

export class UserController {
  // Get public user profile by RSI handle
  async getPublicUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const { rsiHandle } = req.params;

      if (!rsiHandle) {
        res.status(400).json({
          success: false,
          error: 'RSI handle is required',
        });
        return;
      }

      const user = await userModel.findByRsiHandle(rsiHandle);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Get user's public organizations (non-hidden ones)
      const organizations = await userModel.getUserPublicOrganizations(user.id);

      // Get user's events (both created and registered)
      const events = await userModel.getUserPublicEvents(user.id);

      // Get user stats
      const stats = await userModel.getUserStats(user.id);

      // Return public profile data
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            rsi_handle: user.rsi_handle,
            avatar_url: user.avatar_url,
            avatar_source: user.avatar_source,
            is_rsi_verified: user.is_rsi_verified,
            created_at: user.created_at,
          },
          organizations,
          events,
          stats,
        },
      });
    } catch (error) {
      logger.error('Failed to get public user profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get public user profile',
      });
    }
  }

  // Get user's organizations with management info
  async getUserOrganizations(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const user = requireUserFromRequest(req);
      const organizations = await userModel.getUserOrganizations(user.id);

      res.json({
        success: true,
        data: organizations,
      });
    } catch (error) {
      logger.error('Failed to get user organizations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user organizations',
      });
    }
  }

  // Leave an organization
  async leaveOrganization(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { spectrumId } = req.params;

      if (!spectrumId) {
        res.status(400).json({
          success: false,
          error: 'Organization spectrum ID is required',
        });
        return;
      }

      const user = requireUserFromRequest(req);
      const result = await userModel.leaveOrganization(user.id, spectrumId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.message,
        });
        return;
      }

      logger.info('User left organization', {
        userId: user.id,
        organizationSpectrumId: spectrumId,
      });

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error('Failed to leave organization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to leave organization',
      });
    }
  }

  // Hide/unhide an organization from user's profile
  async toggleOrganizationVisibility(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { spectrumId } = req.params;

      if (!spectrumId) {
        res.status(400).json({
          success: false,
          error: 'Organization spectrum ID is required',
        });
        return;
      }

      const user = requireUserFromRequest(req);
      const result = await userModel.hideOrganization(user.id, spectrumId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.message,
        });
        return;
      }

      logger.info('User toggled organization visibility', {
        userId: user.id,
        organizationSpectrumId: spectrumId,
      });

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error('Failed to toggle organization visibility:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle organization visibility',
      });
    }
  }
}
