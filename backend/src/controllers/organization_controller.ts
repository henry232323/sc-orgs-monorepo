import { Request, Response } from 'express';
import { OrganizationModel } from '../models/organization_model';
import { UserModel } from '../models/user_model';
import { InviteModel } from '../models/invite_model';
import db from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import {
  Organization,
  CreateOrganizationData,
  UpdateOrganizationData,
} from '../types/organization';
import { User } from '../types/user';
import logger from '../config/logger';
import rsiClient from '../clients/rsi_client';
import { getUserFromRequest } from '../utils/user-casting';
import {
  verifyUserVerificationCode,
  extractVerificationCode,
  extractMatchingVerificationCode,
  generateUserVerificationCode,
} from '../utils/verification';
import {
  validatePlaystyleTags,
  validateActivityTags,
  getTagValidationErrorMessage,
} from '../utils/tagValidation';

const organizationModel = new OrganizationModel();
const userModel = new UserModel();
const inviteModel = new InviteModel();

export class OrganizationController {
  // List organizations with filters
  async listOrganizations(req: Request, res: Response): Promise<void> {
    try {
      const {
        is_registered,
        is_active,
        languages,
        tags,
        page = 1,
        limit = 20,
        offset,
        sort_by = 'created_at',
        sort_order = 'desc',
      } = req.query;

      const parsedLimit = parseInt(limit as string);
      const parsedPage = parseInt(page as string);
      const calculatedOffset = offset
        ? parseInt(offset as string)
        : (parsedPage - 1) * parsedLimit;

      const filters = {
        is_registered:
          is_registered === 'true'
            ? true
            : is_registered === 'false'
              ? false
              : undefined,
        is_active:
          is_active === 'true'
            ? true
            : is_active === 'false'
              ? false
              : undefined,
        languages: Array.isArray(languages)
          ? (languages.filter(l => typeof l === 'string') as string[])
          : languages
            ? [languages as string]
            : undefined,
        tags: tags ? (tags as string).split(',') : undefined,
        limit: parsedLimit,
        offset: calculatedOffset,
        sort_by: sort_by as string,
        sort_order: sort_order as 'asc' | 'desc',
      };

      const result = await organizationModel.list(filters);

      res.json({
        success: true,
        data: result.data,
        total: result.total,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to list organizations',
      });
    }
  }

  // Search organizations
  async searchOrganizations(req: Request, res: Response): Promise<void> {
    try {
      const {
        q,
        is_registered,
        languages,
        tags,
        page = 1,
        limit = 20,
        offset,
      } = req.query;

      if (!q) {
        res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
        return;
      }

      const parsedLimit = parseInt(limit as string);
      const parsedPage = parseInt(page as string);
      const calculatedOffset = offset
        ? parseInt(offset as string)
        : (parsedPage - 1) * parsedLimit;

      const filters = {
        is_registered:
          is_registered === 'true'
            ? true
            : is_registered === 'false'
              ? false
              : undefined,
        languages: Array.isArray(languages)
          ? (languages.filter(l => typeof l === 'string') as string[])
          : languages
            ? [languages as string]
            : undefined,
        tags: tags ? (tags as string).split(',') : undefined,
        limit: parsedLimit,
        offset: calculatedOffset,
      };

      const result = await organizationModel.search(q as string, filters);

      res.json({
        success: true,
        data: result.data,
        total: result.total,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to search organizations',
      });
    }
  }

  // Get organization by ID
  async getOrganization(req: Request, res: Response): Promise<void> {
    try {
      // Organization is already resolved by middleware and available in req.org
      const organization = req.org!;

      // Get user's membership status if authenticated
      let userMembership = null;
      if ((req as any).user) {
        const isMember = await organizationModel.isUserMember(
          organization.id,
          (req as any).user.id
        );
        const userRole = await organizationModel.getUserRole(
          organization.id,
          (req as any).user.id
        );
        userMembership = {
          is_member: isMember,
          role: userRole,
        };
      }

      res.json({
        success: true,
        data: organization,
        userMembership,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get organization',
      });
    }
  }

  // Get organization by Spectrum ID
  async getOrganizationBySpectrumId(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { rsi_org_id } = req.params;

      // Validate Spectrum ID format
      if (!/^[A-Z0-9]{1,20}$/.test(rsi_org_id)) {
        res.status(400).json({
          success: false,
          error:
            'Invalid Spectrum ID format. Must be alphanumeric, uppercase, and 1-20 characters.',
        });
        return;
      }

      const organization = await organizationModel.findByRsiOrgId(rsi_org_id);

      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Organization not found',
        });
        return;
      }

      // Get user's membership status if authenticated
      let userMembership = null;
      if ((req as any).user) {
        const isMember = await organizationModel.isUserMember(
          organization.id,
          (req as any).user.id
        );
        const userRole = await organizationModel.getUserRole(
          organization.id,
          (req as any).user.id
        );
        userMembership = {
          is_member: isMember,
          role: userRole,
        };
      }

      res.json({
        success: true,
        data: organization,
        userMembership,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get organization',
      });
    }
  }

  // Update organization by Spectrum ID
  async updateOrganizationBySpectrumId(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { rsi_org_id } = req.params;
      const updateData = req.body;

      // Validate Spectrum ID format
      if (!/^[A-Z0-9]{1,20}$/.test(rsi_org_id)) {
        res.status(400).json({
          success: false,
          error:
            'Invalid Spectrum ID format. Must be alphanumeric, uppercase, and 1-20 characters.',
        });
        return;
      }

      // Find organization by Spectrum ID first
      const existingOrg = await organizationModel.findByRsiOrgId(rsi_org_id);
      if (!existingOrg) {
        res.status(404).json({
          success: false,
          error: 'Organization not found',
        });
        return;
      }

      // Update using the internal ID
      const updatedOrganization = await organizationModel.update(
        existingOrg.id,
        updateData
      );

      if (!updatedOrganization) {
        res.status(500).json({
          success: false,
          error: 'Failed to update organization',
        });
        return;
      }

      res.json({
        success: true,
        data: updatedOrganization,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update organization',
      });
    }
  }

  // Create organization
  async createOrganization(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Organization creation request received', {
        body: req.body,
        headers: {
          authorization: req.headers.authorization
            ? 'Bearer [REDACTED]'
            : 'none',
          'content-type': req.headers['content-type'],
        },
      });

      const user = (req as any).user; // User from requireLogin middleware
      if (!user) {
        logger.error('User not authenticated in createOrganization', {
          hasUser: !!user,
          userType: typeof user,
          reqKeys: Object.keys(req),
        });
        res
          .status(401)
          .json({ success: false, error: 'User not authenticated' });
        return;
      }

      logger.info('User authenticated for organization creation', {
        userId: user.id,
        userDiscordId: user.discord_id,
      });

      const orgData: CreateOrganizationData = {
        ...req.body,
        owner_id: user.id,
      };

      // Validate tags
      if (orgData.playstyle_tags && orgData.playstyle_tags.length > 0) {
        const playstyleValidation = validatePlaystyleTags(orgData.playstyle_tags);
        if (!playstyleValidation.isValid) {
          res.status(400).json({
            success: false,
            error: getTagValidationErrorMessage(playstyleValidation.invalidTags, 'playstyle'),
          });
          return;
        }
      }

      if (orgData.focus_tags && orgData.focus_tags.length > 0) {
        const activityValidation = validateActivityTags(orgData.focus_tags);
        if (!activityValidation.isValid) {
          res.status(400).json({
            success: false,
            error: getTagValidationErrorMessage(activityValidation.invalidTags, 'activity'),
          });
          return;
        }
      }

      logger.info('Creating organization with data', { orgData });

      // Check if organization already exists
      const existingOrg = await organizationModel.findByRsiOrgId(
        orgData.rsi_org_id
      );
      if (existingOrg) {
        logger.warn(
          'Organization creation attempted with duplicate RSI org ID',
          {
            rsiOrgId: orgData.rsi_org_id,
            userId: user.id,
            existingOrgId: existingOrg.id,
          }
        );
        res.status(409).json({
          success: false,
          error: `An organization with RSI ID "${orgData.rsi_org_id}" already exists.`,
          rsi_url: `https://robertsspaceindustries.com/en/orgs/${orgData.rsi_org_id}`,
        });
        return;
      }

      // Verify the organization ownership by checking for user-specific verification code in RSI bio
      logger.info('Verifying organization ownership during creation', {
        rsiOrgId: orgData.rsi_org_id,
        userId: user.id,
      });

      // Scrape RSI organization page to get content for verification
      const rsiData = await rsiClient.scrapeOrganizationPage(
        orgData.rsi_org_id
      );

      if (!rsiData) {
        logger.warn('Failed to scrape RSI organization page during creation', {
          rsiOrgId: orgData.rsi_org_id,
        });
        res.status(400).json({
          success: false,
          error:
            'Failed to access RSI organization page. Please check the RSI org ID and try again.',
          rsi_url: `https://robertsspaceindustries.com/en/orgs/${orgData.rsi_org_id}`,
        });
        return;
      }

      // Extract verification code from RSI content - search in all content sources
      let contentToSearch =
        (rsiData.headline || '') + ' ' + (rsiData.description || '');

      // Also search in all content sources (where the verification codes actually are)
      if (rsiData.contentSources) {
        for (const source of rsiData.contentSources) {
          if (source.content) {
            contentToSearch += ' ' + source.content;
          }
        }
      }

      // Get the expected verification code for this user
      const expectedCode = generateUserVerificationCode(user.id);

      // Debug: Log the raw content for verification code search
      logger.debug('Raw content for verification code search', {
        rsiOrgId: orgData.rsi_org_id,
        contentLength: contentToSearch.length,
        contentPreview: contentToSearch.substring(0, 200) + '...',
        contentEnd: contentToSearch.substring(contentToSearch.length - 200),
        hasExpectedCode: contentToSearch.includes(expectedCode),
      });

      // Extract the verification code that matches the expected code
      const verificationCode = extractMatchingVerificationCode(
        contentToSearch,
        expectedCode
      );

      logger.debug('Verification code extraction details', {
        rsiOrgId: orgData.rsi_org_id,
        userId: user.id,
        expectedCode,
        contentLength: contentToSearch.length,
        contentPreview: contentToSearch.substring(0, 200) + '...',
        foundCode: verificationCode,
      });

      if (!verificationCode) {
        logger.warn('No verification code found in RSI organization content', {
          rsiOrgId: orgData.rsi_org_id,
          userId: user.id,
          expectedCode,
          contentSearched: contentToSearch,
        });
        res.status(400).json({
          success: false,
          error: `No verification code found in your RSI organization bio. Please add the verification code ${expectedCode} and try again.`,
          verification_code: expectedCode,
          rsi_url: `https://robertsspaceindustries.com/en/orgs/${orgData.rsi_org_id}`,
        });
        return;
      }

      // Verify the extracted code matches the user's expected code
      const isVerified = verifyUserVerificationCode(user.id, verificationCode);

      if (!isVerified) {
        logger.warn(
          'Organization verification failed during creation - code mismatch',
          {
            rsiOrgId: orgData.rsi_org_id,
            userId: user.id,
            extractedCode: verificationCode,
          }
        );
        res.status(400).json({
          success: false,
          error:
            'Verification failed. The verification code in your RSI organization bio does not match your user account.',
          rsi_url: `https://robertsspaceindustries.com/en/orgs/${orgData.rsi_org_id}`,
        });
        return;
      }

      logger.info('Organization verification successful during creation', {
        rsiOrgId: orgData.rsi_org_id,
        userId: user.id,
        verificationCode,
      });

      // Update orgData with scraped information
      if (rsiData.name) orgData.name = rsiData.name;
      if (rsiData.description) orgData.description = rsiData.description;
      if (rsiData.icon_url) orgData.icon_url = rsiData.icon_url;
      if (rsiData.banner_url) orgData.banner_url = rsiData.banner_url;
      if (rsiData.headline) orgData.headline = rsiData.headline;
      if (rsiData.member_count) orgData.total_members = rsiData.member_count;
      if (rsiData.language)
        orgData.languages = Array.isArray(rsiData.language)
          ? rsiData.language
          : [rsiData.language];

      logger.info('Successfully scraped RSI data for organization population', {
        rsiOrgId: orgData.rsi_org_id,
        hasName: !!rsiData.name,
        hasDescription: !!rsiData.description,
        hasIcon: !!rsiData.icon_url,
        hasBanner: !!rsiData.banner_url,
        memberCount: rsiData.member_count,
      });

      // Create the organization with populated data
      const organization = await organizationModel.create({
        ...orgData,
        verification_sentinel: verificationCode, // Store the verification code that was found
      });

      logger.info('Organization created successfully', {
        organizationId: organization.id,
        organizationName: organization.name,
        ownerId: organization.owner_id,
      });

      res.status(201).json({
        success: true,
        data: organization,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack =
        error instanceof Error ? error.stack : 'No stack trace';

      logger.error('Failed to create organization', {
        error: errorMessage,
        stack: errorStack,
        body: req.body,
        user: (req as any).user ? { id: (req as any).user.id } : 'no user',
      });

      res
        .status(500)
        .json({ success: false, error: 'Failed to create organization' });
    }
  }

  // Update organization
  async updateOrganization(req: Request, res: Response): Promise<void> {
    try {
      // Organization is already resolved by middleware and available in req.org
      const organization = req.org!;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Check if user is owner or admin
      if (organization.owner_id !== userId) {
        res.status(403).json({
          success: false,
          error: 'Only organization owner can update organization',
        });
        return;
      }

      const updateData: UpdateOrganizationData = req.body;

      // Validate tags
      if (updateData.playstyle_tags && updateData.playstyle_tags.length > 0) {
        const playstyleValidation = validatePlaystyleTags(updateData.playstyle_tags);
        if (!playstyleValidation.isValid) {
          res.status(400).json({
            success: false,
            error: getTagValidationErrorMessage(playstyleValidation.invalidTags, 'playstyle'),
          });
          return;
        }
      }

      if (updateData.focus_tags && updateData.focus_tags.length > 0) {
        const activityValidation = validateActivityTags(updateData.focus_tags);
        if (!activityValidation.isValid) {
          res.status(400).json({
            success: false,
            error: getTagValidationErrorMessage(activityValidation.invalidTags, 'activity'),
          });
          return;
        }
      }

      const updatedOrganization = await organizationModel.update(
        organization.id,
        updateData
      );

      if (!updatedOrganization) {
        res.status(500).json({
          success: false,
          error: 'Failed to update organization',
        });
        return;
      }

      res.json({
        success: true,
        data: updatedOrganization,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update organization',
      });
    }
  }

  // Delete organization
  async deleteOrganization(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Check if user is owner
      const organization = await organizationModel.findById(id);
      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Organization not found',
        });
        return;
      }

      if (organization.owner_id !== userId) {
        res.status(403).json({
          success: false,
          error: 'Only organization owner can delete organization',
        });
        return;
      }

      const deleted = await organizationModel.delete(id);
      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete organization',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Organization deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete organization',
      });
    }
  }

  // Generate verification sentinel for organization
  async generateVerificationSentinel(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (!user) {
        res
          .status(401)
          .json({ success: false, error: 'User not authenticated' });
        return;
      }

      logger.info('Generating verification sentinel for organization', {
        organizationId: id,
        userId: user.id,
      });

      // Check if user owns the organization
      const organization = await organizationModel.findById(id);
      if (!organization) {
        res
          .status(404)
          .json({ success: false, error: 'Organization not found' });
        return;
      }

      if (organization.owner_id !== user.id) {
        res.status(403).json({
          success: false,
          error: 'Only organization owner can generate verification sentinel',
        });
        return;
      }

      // Generate the sentinel code
      const sentinelCode =
        await organizationModel.generateVerificationSentinel(id);

      logger.info('Verification sentinel generated successfully', {
        organizationId: id,
        sentinelCode,
      });

      res.json({
        success: true,
        data: {
          sentinel_code: sentinelCode,
          instructions: `Place this code in your RSI organization headline: ${sentinelCode}`,
          rsi_url: `https://robertsspaceindustries.com/en/orgs/${organization.rsi_org_id}`,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack =
        error instanceof Error ? error.stack : 'No stack trace';

      logger.error('Failed to generate verification sentinel', {
        error: errorMessage,
        stack: errorStack,
        organizationId: req.params.id,
        user: (req as any).user ? { id: (req as any).user.id } : 'no user',
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate verification sentinel',
      });
    }
  }

  // Verify organization ownership via RSI sentinel
  async verifyOrganization(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (!user) {
        res
          .status(401)
          .json({ success: false, error: 'User not authenticated' });
        return;
      }

      logger.info('Verifying organization ownership', {
        organizationId: id,
        userId: user.id,
      });

      // Check if user owns the organization
      const organization = await organizationModel.findById(id);
      if (!organization) {
        res
          .status(404)
          .json({ success: false, error: 'Organization not found' });
        return;
      }

      if (organization.owner_id !== user.id) {
        res.status(403).json({
          success: false,
          error: 'Only organization owner can verify organization',
        });
        return;
      }

      if (!organization.verification_sentinel) {
        res.status(400).json({
          success: false,
          error: 'No verification sentinel found. Please generate one first.',
        });
        return;
      }

      // Verify the sentinel code on RSI
      const isVerified = await rsiClient.verifySentinelCode(
        organization.rsi_org_id,
        organization.verification_sentinel
      );

      logger.info('Verification result from RSI client', {
        organizationId: id,
        rsiOrgId: organization.rsi_org_id,
        sentinelCode: organization.verification_sentinel,
        isVerified,
        isVerifiedType: typeof isVerified,
        isVerifiedTruthy: !!isVerified,
      });

      if (!isVerified) {
        res.status(400).json({
          success: false,
          error:
            'Sentinel code not found in RSI organization headline. Please ensure the code is placed correctly and try again.',
          sentinel_code: organization.verification_sentinel,
          rsi_url: `https://robertsspaceindustries.com/en/orgs/${organization.rsi_org_id}`,
        });
        return;
      }

      // Scrape RSI organization data to populate organization details
      logger.info('Scraping RSI organization data for population', {
        organizationId: id,
        rsiOrgId: organization.rsi_org_id,
      });

      const rsiData = await rsiClient.scrapeOrganizationPage(
        organization.rsi_org_id
      );

      if (rsiData) {
        logger.info(
          'Successfully scraped RSI data for organization population',
          {
            organizationId: id,
            rsiOrgId: organization.rsi_org_id,
            hasName: !!rsiData.name,
            hasDescription: !!rsiData.description,
            hasIcon: !!rsiData.icon_url,
            hasBanner: !!rsiData.banner_url,
            memberCount: rsiData.member_count,
          }
        );
      } else {
        logger.warn('Failed to scrape RSI data for organization population', {
          organizationId: id,
          rsiOrgId: organization.rsi_org_id,
        });
      }

      // Mark organization as verified and populate with RSI data
      const processedRsiData = rsiData
        ? {
            ...rsiData,
            languages: rsiData.language
              ? Array.isArray(rsiData.language)
                ? rsiData.language
                : [rsiData.language]
              : undefined,
          }
        : undefined;

      const verifiedOrg = await organizationModel.verifyOrganization(
        id,
        processedRsiData
      );

      if (!verifiedOrg) {
        res
          .status(500)
          .json({ success: false, error: 'Failed to verify organization' });
        return;
      }

      logger.info('Organization verified successfully', {
        organizationId: id,
        sentinelCode: organization.verification_sentinel,
      });

      res.json({
        success: true,
        data: {
          message: 'Organization verified successfully',
          organization: verifiedOrg,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack =
        error instanceof Error ? error.stack : 'No stack trace';

      logger.error('Failed to verify organization', {
        error: errorMessage,
        stack: errorStack,
        organizationId: req.params.id,
        user: (req as any).user ? { id: (req as any).user.id } : 'no user',
      });

      res
        .status(500)
        .json({ success: false, error: 'Failed to verify organization' });
    }
  }

  // Complete organization registration after verification
  async completeRegistration(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (!user) {
        res
          .status(401)
          .json({ success: false, error: 'User not authenticated' });
        return;
      }

      logger.info('Completing organization registration', {
        organizationId: id,
        userId: user.id,
        body: req.body,
      });

      // Check if user owns the organization
      const organization = await organizationModel.findById(id);
      if (!organization) {
        res
          .status(404)
          .json({ success: false, error: 'Organization not found' });
        return;
      }

      if (organization.owner_id !== user.id) {
        res.status(403).json({
          success: false,
          error: 'Only organization owner can complete registration',
        });
        return;
      }

      // Get additional data from RSI if available
      const rsiData = await rsiClient.getOrganizationData(
        organization.rsi_org_id
      );

      const registrationData = {
        ...req.body,
        // Use RSI data if not provided in request
        banner_url: req.body.banner_url || rsiData?.banner_url,
        icon_url: req.body.icon_url || rsiData?.icon_url,
        languages:
          req.body.languages ||
          (rsiData?.language ? [rsiData.language] : ['en']),
      };

      // Complete the registration
      const registeredOrg = await organizationModel.completeRegistration(
        id,
        registrationData
      );

      if (!registeredOrg) {
        res
          .status(500)
          .json({ success: false, error: 'Failed to complete registration' });
        return;
      }

      logger.info('Organization registration completed successfully', {
        organizationId: id,
        registrationData,
      });

      res.json({
        success: true,
        data: {
          message: 'Organization registration completed successfully',
          organization: registeredOrg,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack =
        error instanceof Error ? error.stack : 'No stack trace';

      logger.error('Failed to complete organization registration', {
        error: errorMessage,
        stack: errorStack,
        organizationId: req.params.id,
        user: (req as any).user ? { id: (req as any).user.id } : 'no user',
      });

      res
        .status(500)
        .json({ success: false, error: 'Failed to complete registration' });
    }
  }

  // Upvote organization
  async upvoteOrganization(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const result = await organizationModel.addUpvote(id, userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.message,
        });
        return;
      }

      // Get updated upvote status
      const upvoteStatus = await organizationModel.getUserUpvoteStatus(
        id,
        userId
      );

      res.json({
        success: true,
        message: result.message,
        data: {
          hasUpvoted: upvoteStatus.hasUpvoted,
          canUpvote: upvoteStatus.canUpvote,
          nextUpvoteDate: upvoteStatus.nextUpvoteDate,
        },
      });
    } catch (error) {
      logger.error('Failed to upvote organization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upvote organization',
      });
    }
  }

  // Remove upvote
  async removeUpvote(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const result = await organizationModel.removeUpvote(id, userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.message,
        });
        return;
      }

      // Get updated upvote status
      const upvoteStatus = await organizationModel.getUserUpvoteStatus(
        id,
        userId
      );

      res.json({
        success: true,
        message: result.message,
        data: {
          hasUpvoted: upvoteStatus.hasUpvoted,
          canUpvote: upvoteStatus.canUpvote,
          nextUpvoteDate: upvoteStatus.nextUpvoteDate,
        },
      });
    } catch (error) {
      logger.error('Failed to remove upvote:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove upvote',
      });
    }
  }

  // Get upvote status for current user
  async getUpvoteStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const upvoteStatus = await organizationModel.getUserUpvoteStatus(
        id,
        userId
      );

      res.json({
        success: true,
        data: upvoteStatus,
      });
    } catch (error) {
      logger.error('Failed to get upvote status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get upvote status',
      });
    }
  }

  // Upvote organization by spectrum ID
  async upvoteOrganizationBySpectrumId(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { rsi_org_id } = req.params;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      // Find organization by spectrum ID
      const organization = await organizationModel.findByRsiOrgId(rsi_org_id);
      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Organization not found',
        });
        return;
      }

      const result = await organizationModel.addUpvote(organization.id, userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.message,
        });
        return;
      }

      // Get updated upvote status
      const upvoteStatus = await organizationModel.getUserUpvoteStatus(
        organization.id,
        userId
      );

      res.json({
        success: true,
        message: result.message,
        data: {
          hasUpvoted: upvoteStatus.hasUpvoted,
          canUpvote: upvoteStatus.canUpvote,
          nextUpvoteDate: upvoteStatus.nextUpvoteDate,
        },
      });
    } catch (error) {
      logger.error('Failed to upvote organization by spectrum ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upvote organization',
      });
    }
  }

  // Remove upvote by spectrum ID
  async removeUpvoteBySpectrumId(req: Request, res: Response): Promise<void> {
    try {
      const { rsi_org_id } = req.params;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      // Find organization by spectrum ID
      const organization = await organizationModel.findByRsiOrgId(rsi_org_id);
      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Organization not found',
        });
        return;
      }

      const result = await organizationModel.removeUpvote(
        organization.id,
        userId
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.message,
        });
        return;
      }

      // Get updated upvote status
      const upvoteStatus = await organizationModel.getUserUpvoteStatus(
        organization.id,
        userId
      );

      res.json({
        success: true,
        message: result.message,
        data: {
          hasUpvoted: upvoteStatus.hasUpvoted,
          canUpvote: upvoteStatus.canUpvote,
          nextUpvoteDate: upvoteStatus.nextUpvoteDate,
        },
      });
    } catch (error) {
      logger.error('Failed to remove upvote by spectrum ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove upvote',
      });
    }
  }

  // Get upvote status by spectrum ID
  async getUpvoteStatusBySpectrumId(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { rsi_org_id } = req.params;
      const userId = getUserFromRequest(req)?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      // Find organization by spectrum ID
      const organization = await organizationModel.findByRsiOrgId(rsi_org_id);
      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Organization not found',
        });
        return;
      }

      const upvoteStatus = await organizationModel.getUserUpvoteStatus(
        organization.id,
        userId
      );

      res.json({
        success: true,
        data: upvoteStatus,
      });
    } catch (error) {
      logger.error('Failed to get upvote status by spectrum ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get upvote status',
      });
    }
  }

  // Get organization members
  async getOrganizationMembers(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const userId = getUserFromRequest(req)?.id; // May be undefined for unauthenticated users

      const members = await organizationModel.getMembers(id, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        viewerUserId: userId, // Pass the viewer's ID to determine visibility
      });

      res.json({
        success: true,
        data: members,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: members.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get organization members',
      });
    }
  }

  // Get featured organizations for home page
  async getFeaturedOrganizations(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 3 } = req.query;

      // Get active organizations with high member counts
      const featuredOrgs = await organizationModel.getFeatured({
        limit: parseInt(limit as string),
        minMembers: 5,
        isActive: true,
      });

      res.json({
        success: true,
        data: featuredOrgs,
      });
    } catch (error) {
      logger.error('Failed to get featured organizations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get featured organizations',
      });
    }
  }

  // Get home page statistics
  async getHomePageStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await organizationModel.getHomePageStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get home page stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get home page statistics',
      });
    }
  }

  // Add member to organization
  async addMember(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // TODO: Implement add member logic
      // For now, we'll just return success
      res.json({
        success: true,
        message: 'Member added successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to add member',
      });
    }
  }

  // Update member role
  async updateMemberRole(req: Request, res: Response): Promise<void> {
    try {
      const { id, userId } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // TODO: Implement update member role logic
      // For now, we'll just return success
      res.json({
        success: true,
        message: 'Member role updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update member role',
      });
    }
  }

  // Remove member from organization
  async removeMember(req: Request, res: Response): Promise<void> {
    try {
      const { id, userId } = req.params;
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          error: 'No authorization header',
        });
        return;
      }

      // TODO: Implement remove member logic
      // For now, we'll just return success
      res.json({
        success: true,
        message: 'Member removed successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to remove member',
      });
    }
  }

  // Get invite codes
  async getInviteCodes(req: Request, res: Response): Promise<void> {
    try {
      const { rsi_org_id } = req.params;
      
      // Convert spectrum ID to internal ID
      const organization = await organizationModel.findByRsiOrgId(rsi_org_id);
      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Organization not found',
        });
        return;
      }
      const id = organization.id;
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

      // Check if user has permission to view invite codes
      const userRole = await organizationModel.getUserRole(id, userId);
      if (!userRole || !['owner', 'admin'].includes(userRole.toLowerCase())) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view invite codes',
        });
        return;
      }

      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const inviteCodes = await inviteModel.getByOrganizationId(id, {
        limit: parseInt(limit as string),
        offset,
      });

      res.json({
        success: true,
        data: inviteCodes,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: inviteCodes.length,
        },
      });
    } catch (error) {
      logger.error('Failed to get invite codes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get invite codes',
      });
    }
  }

  // Generate invite code
  async generateInviteCode(req: Request, res: Response): Promise<void> {
    try {
      const { rsi_org_id } = req.params;
      
      // Convert spectrum ID to internal ID
      const organization = await organizationModel.findByRsiOrgId(rsi_org_id);
      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Organization not found',
        });
        return;
      }
      const id = organization.id;
      const { role_id, maxUses, expiresAt } = req.body;
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

      // Check if user has permission to generate invite codes
      const userRole = await organizationModel.getUserRole(id, userId);
      if (!userRole || !['owner', 'admin'].includes(userRole.toLowerCase())) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to generate invite codes',
        });
        return;
      }

      // Organization already verified above

      // Validate that the role_id exists in this organization
      if (!role_id) {
        res.status(400).json({
          success: false,
          error: 'role_id is required',
        });
        return;
      }

      const { RoleModel } = await import('../models/role_model');
      const roleModel = new RoleModel();
      const targetRole = await roleModel.findById(role_id);

      if (!targetRole || targetRole.organization_id !== id) {
        res.status(400).json({
          success: false,
          error: 'Invalid role_id for this organization',
        });
        return;
      }

      // Prevent creating invites for non-editable roles (like Owner)
      if (!targetRole.is_editable) {
        res.status(400).json({
          success: false,
          error: `Cannot create invites for ${targetRole.name} role - this role cannot be assigned via invite`,
        });
        return;
      }

      // Create invite code
      const inviteCode = await inviteModel.create({
        organization_id: id,
        created_by: userId,
        role_id: targetRole.id,
        max_uses: maxUses ? parseInt(maxUses) : undefined,
        expires_at: expiresAt ? new Date(expiresAt) : undefined,
      });

      res.json({
        success: true,
        data: inviteCode,
        message: 'Invite code generated successfully',
      });
    } catch (error) {
      logger.error('Failed to generate invite code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate invite code',
      });
    }
  }

  // Delete invite code
  async deleteInviteCode(req: Request, res: Response): Promise<void> {
    try {
      const { rsi_org_id, inviteId } = req.params;
      
      // Convert spectrum ID to internal ID
      const organization = await organizationModel.findByRsiOrgId(rsi_org_id);
      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Organization not found',
        });
        return;
      }
      const id = organization.id;
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

      // Check if user has permission to delete invite codes
      const userRole = await organizationModel.getUserRole(id, userId);
      if (!userRole || !['owner', 'admin'].includes(userRole.toLowerCase())) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to delete invite codes',
        });
        return;
      }

      // Verify invite code exists and belongs to organization
      const inviteCode = await inviteModel.findById(inviteId);
      if (!inviteCode || inviteCode.organization_id !== id) {
        res.status(404).json({
          success: false,
          error: 'Invite code not found',
        });
        return;
      }

      // Delete the invite code
      const deleted = await inviteModel.delete(inviteId);
      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete invite code',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Invite code deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete invite code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete invite code',
      });
    }
  }

  // Join organization with invite code
  async joinWithInvite(req: Request, res: Response): Promise<void> {
    try {
      const { inviteCode } = req.params;
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

      // Check if user can use the invite code
      const canUse = await inviteModel.canUseInviteCode(inviteCode, userId);
      if (!canUse.canUse) {
        res.status(400).json({
          success: false,
          error: canUse.reason || 'Cannot use this invite code',
        });
        return;
      }

      // Get the invite code details
      const invite = await inviteModel.findByCode(inviteCode);
      if (!invite) {
        res.status(404).json({
          success: false,
          error: 'Invite code not found',
        });
        return;
      }

      // Check if user is already a member
      const isAlreadyMember = await organizationModel.isUserMember(
        invite.organization_id,
        userId
      );
      if (isAlreadyMember) {
        res.status(400).json({
          success: false,
          error: 'You are already a member of this organization',
        });
        return;
      }

      // Use role_id from invite code
      if (!invite.role_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid invite code - no role specified',
        });
        return;
      }

      // Add user to organization
      const memberId = uuidv4();
      await db('organization_members').insert({
        id: memberId,
        organization_id: invite.organization_id,
        user_id: userId,
        role_id: invite.role_id,
        is_active: true,
        joined_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Use the invite code (increment used count)
      await inviteModel.useInviteCode(inviteCode);

      // Update organization member count
      await db('organizations')
        .where({ id: invite.organization_id })
        .increment('total_members', 1);

      res.json({
        success: true,
        message: 'Successfully joined organization',
        data: {
          organization_id: invite.organization_id,
          role: invite.role_name,
        },
      });
    } catch (error) {
      logger.error('Failed to join organization with invite:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to join organization',
      });
    }
  }

  // Get events for an organization
  async getOrganizationEvents(req: Request, res: Response): Promise<void> {
    try {
      const { rsi_org_id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      if (!rsi_org_id) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required',
        });
        return;
      }

      // Find organization by spectrum ID
      const organization = await organizationModel.findByRsiOrgId(rsi_org_id);
      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Organization not found',
        });
        return;
      }

      // Get events for this organization
      const events = await organizationModel.getEventsByOrganization(
        organization.id,
        getUserFromRequest(req)?.id // Pass user ID for private event filtering
      );

      // Apply pagination
      const parsedLimit = parseInt(limit as string);
      const parsedPage = parseInt(page as string);
      const offset = (parsedPage - 1) * parsedLimit;
      const paginatedEvents = events.slice(offset, offset + parsedLimit);

      res.json({
        success: true,
        data: {
          data: paginatedEvents,
          total: events.length,
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total: events.length,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to get organization events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get organization events',
      });
    }
  }
}
