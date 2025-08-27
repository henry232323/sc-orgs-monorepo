import { Request, Response } from 'express';
import passport from 'passport';
import { generateJWT } from '../config/passport';
import { UserModel } from '../models';
import { UserVerificationData, UserStats } from '../types';
import { generateUserVerificationCode } from '../utils/verification';
import logger from '../config/logger';
import { spectrumAPI } from '../clients/spectrum';
import { fetchRSIProfileCommunityHub } from '../clients/community_hub';

import { getUserFromRequest } from '../utils/user-casting';
const userModel = new UserModel();

export class AuthController {
  // Discord OAuth login (redirects to Discord)
  async discordLogin(req: Request, res: Response): Promise<void> {
    passport.authenticate('discord', { scope: ['identify', 'email'] })(
      req,
      res
    );
  }

  // Discord OAuth callback
  async discordCallback(req: Request, res: Response): Promise<void> {
    // Passport middleware has already authenticated the user and put user data in req.user
    const user = (req as any).user;

    if (!user) {
      res.status(500).json({
        success: false,
        error: 'Authentication failed - no user data',
      });
      return;
    }

    try {
      const token = generateJWT(user);

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Token generation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Token generation failed',
      });
    }
  }

  // Get current user profile
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      const user = await userModel.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      const verificationCode = user.is_rsi_verified
        ? null
        : userModel.generateVerificationCodeFromId(user.id);

      res.json({
        success: true,
        data: {
          id: user.id,
          discord_id: user.discord_id,
          rsi_handle: user.rsi_handle,
          avatar_url: user.avatar_url,
          is_rsi_verified: user.is_rsi_verified,
          verification_code: verificationCode,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
  }

  // Get user by ID (for displaying owner information)
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await userModel.findById(id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Only return public user information
      res.json({
        success: true,
        data: {
          id: user.id,
          rsi_handle: user.rsi_handle,
          avatar_url: user.avatar_url,
          is_rsi_verified: user.is_rsi_verified,
        },
      });
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user information',
      });
    }
  }

  // Generate RSI verification code
  async generateVerificationCode(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      const user = await userModel.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      const verificationCode = userModel.generateVerificationCodeFromId(
        user.id
      );

      res.json({
        success: true,
        data: {
          verification_code: verificationCode,
          instructions: `Please add the following code to your Star Citizen account bio: ${verificationCode}`,
          user: {
            id: user.id,
            discord_id: user.discord_id,
            rsi_handle: user.rsi_handle,
            avatar_url: user.avatar_url,
            is_rsi_verified: user.is_rsi_verified,
            verification_code: user.is_rsi_verified ? null : verificationCode,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate verification code',
      });
    }
  }

  // Verify RSI account
  async verifyRsiAccount(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      const { rsi_handle } = req.body as UserVerificationData;

      if (!rsi_handle) {
        res.status(400).json({
          success: false,
          error: 'RSI handle is required',
        });
        return;
      }

      const user = await userModel.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Generate the verification code for this user
      const verificationCode = userModel.generateVerificationCodeFromId(
        user.id
      );
      const sentinelCode = `[${verificationCode}]`;

      logger.info('Starting RSI account verification', {
        userId: user.id,
        rsi_handle,
        verificationCode,
        sentinelCode,
      });

      // Step 1: Get Spectrum user ID from RSI handle
      let spectrumId: string | null = null;
      let spectrumAvatarUrl: string | undefined = undefined;

      try {
        const spectrumResponse =
          await spectrumAPI.fetchMemberByHandle(rsi_handle);
        if (spectrumResponse.success && spectrumResponse.data?.member?.id) {
          spectrumId = spectrumResponse.data.member.id;
          spectrumAvatarUrl = spectrumResponse.data.member.avatar;
          logger.info('Successfully fetched Spectrum data', {
            spectrumId,
            hasAvatar: !!spectrumAvatarUrl,
            rsi_handle,
          });
        } else {
          logger.warn('Failed to fetch Spectrum data', {
            rsi_handle,
            response: spectrumResponse,
          });
        }
      } catch (error) {
        logger.error('Error fetching Spectrum data', {
          rsi_handle,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Step 2: Verify sentinel code exists in user's bio using Community Hub API
      let sentinelVerified = false;
      if (spectrumId) {
        try {
          const communityHubResponse =
            await fetchRSIProfileCommunityHub(rsi_handle);
          if (communityHubResponse?.creator?.bio) {
            const bio = communityHubResponse.creator.bio;
            sentinelVerified = bio.includes(verificationCode);
            logger.info('Community Hub verification result', {
              spectrumId,
              sentinelVerified,
              bioLength: bio.length,
              bioPreview: bio.substring(0, 200) + '...',
            });
          } else {
            logger.warn('No bio found in Community Hub response', {
              spectrumId,
              response: communityHubResponse,
            });
          }
        } catch (error) {
          logger.error('Error verifying sentinel code via Community Hub', {
            spectrumId,
            sentinelCode,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Step 3: Update user account if verification successful
      if (!sentinelVerified) {
        res.status(400).json({
          success: false,
          error: `Sentinel code ${sentinelCode} not found in your RSI profile bio. Please add it to your bio and try again.`,
        });
        return;
      }

      const updatedUser = await userModel.verifyRsiAccount(
        user.id,
        rsi_handle,
        spectrumId || `spectrum_${rsi_handle}`,
        spectrumAvatarUrl
      );

      if (!updatedUser) {
        res.status(500).json({
          success: false,
          error: 'Failed to verify RSI account',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          message: 'RSI account verified successfully',
          user: {
            id: updatedUser.id,
            rsi_handle: updatedUser.rsi_handle,
            spectrum_id: updatedUser.spectrum_id,
            avatar_url: updatedUser.avatar_url,
            avatar_source: updatedUser.avatar_source,
            is_rsi_verified: updatedUser.is_rsi_verified,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to verify RSI account',
      });
    }
  }

  // Logout
  async logout(_req: Request, res: Response): Promise<void> {
    // Since we're using JWT, we can't actually invalidate the token
    // The frontend should remove the token from storage
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  // Get user's verification code for organization creation
  async getUserVerificationCode(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const verificationCode = generateUserVerificationCode(user.id);

      logger.info('Generated verification code for user', {
        userId: user.id,
        verificationCode,
      });

      res.json({
        success: true,
        data: {
          verification_code: verificationCode,
          instructions:
            'Place this code in your RSI organization bio to verify ownership',
        },
      });
    } catch (error) {
      logger.error('Failed to generate verification code', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate verification code',
      });
    }
  }

  // Get user dashboard stats
  async getUserDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // Get user ID from req.user (set by JWT middleware)
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not found in request',
        });
        return;
      }

      const stats = await userModel.getUserStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get user dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard stats',
      });
    }
  }

  // Get user rating summary
  async getUserRatingSummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const ratingSummary = await userModel.getUserRatingSummary(userId);

      res.json({
        success: true,
        data: ratingSummary,
      });
    } catch (error) {
      logger.error('Failed to get user rating summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user rating summary',
      });
    }
  }

  // Get user's organizations
  async getUserOrganizations(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const organizations = await userModel.getUserOrganizations(userId);

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

  // Get user's events
  async getUserEvents(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserFromRequest(req)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { page = 1, limit = 20 } = req.query;
      const events = await userModel.getUserEvents(userId);

      // Apply pagination
      const parsedLimit = parseInt(limit as string);
      const parsedPage = parseInt(page as string);
      const offset = (parsedPage - 1) * parsedLimit;
      const paginatedEvents = events.slice(offset, offset + parsedLimit);

      res.json({
        success: true,
        data: paginatedEvents,
        total: events.length,
        page: parsedPage,
        limit: parsedLimit,
      });
    } catch (error) {
      logger.error('Failed to get user events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user events',
      });
    }
  }
}
