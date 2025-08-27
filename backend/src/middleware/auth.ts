import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../config/passport';
import { getUserFromRequest } from '../utils/user-casting';
import logger from '../config/logger';

export const requireRSIVerification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (!user.is_rsi_verified) {
    res.status(403).json({
      success: false,
      error: 'RSI account verification required',
    });
    return;
  }

  next();
};

export const requireOrganizationOwnership = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  // This will be implemented when we add organization routes
  // For now, just check if user is authenticated
  next();
};

/**
 * JWT authentication middleware
 * Sets req.user if a valid JWT is present, but doesn't fail if one isn't
 * This should be used on routes that need to know if a user is authenticated
 * but don't require authentication to function
 */
export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  // If no auth header, just continue without setting req.user
  if (!authHeader) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>

  // If no token, just continue without setting req.user
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = verifyJWT(token);

    if (decoded) {
      logger.debug('JWT token verified successfully', {
        userId: decoded.id,
        discordId: decoded.discord_id,
        url: req.url,
        method: req.method,
      });
      req.user = decoded;
    }

    // Always continue, regardless of whether token was valid
    next();
  } catch (error) {
    // Log the error but don't fail the request
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.debug('JWT verification failed, continuing without authentication', {
      error: errorMessage,
      url: req.url,
      method: req.method,
    });

    // Continue without setting req.user
    next();
  }
};

/**
 * Require login middleware
 * Returns 401 if req.user is undefined (user not authenticated)
 * This should be used on routes that require a logged-in user
 */
export const requireLogin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user can manage an event (edit, delete, send notifications)
 * Checks if user is event creator or organization owner/admin
 */
export const requireEventManagePermission = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: eventId } = req.params;
    const user = getUserFromRequest(req);
    const userId = user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!eventId) {
      res.status(400).json({
        success: false,
        error: 'Event ID is required',
      });
      return;
    }

    // Import models (avoiding circular dependencies)
    const { EventModel } = await import('../models/event_model');
    const { OrganizationModel } = await import('../models/organization_model');
    const { RoleModel } = await import('../models/role_model');

    const eventModel = new EventModel();
    const organizationModel = new OrganizationModel();
    const roleModel = new RoleModel();

    // Get the event
    const event = await eventModel.findById(eventId);
    if (!event) {
      res.status(404).json({
        success: false,
        error: 'Event not found',
      });
      return;
    }

    // Check if user is event creator
    if (event.created_by === userId) {
      next();
      return;
    }

    // For organization events, check if user has admin/owner role
    if (event.organization_id) {
      const organization = await organizationModel.findById(
        event.organization_id
      );
      if (organization && organization.owner_id === userId) {
        next();
        return;
      }

      // Check if user has admin role in the organization
      const memberRole = await roleModel.getUserRole(
        event.organization_id,
        userId
      );
      if (memberRole && ['Owner', 'Admin'].includes(memberRole)) {
        next();
        return;
      }
    }

    // User doesn't have permission
    res.status(403).json({
      success: false,
      error: 'Insufficient permissions to manage this event',
    });
  } catch (error) {
    logger.error('Error checking event manage permission:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
