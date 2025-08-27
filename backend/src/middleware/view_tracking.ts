import { Request, Response, NextFunction } from 'express';
import { ViewTrackingService } from '../services/view_tracking_service';
import logger from '../config/logger';
import db from '../config/database';

import { getUserFromRequest } from '../utils/user-casting';
/**
 * Middleware factory to record page views for entities
 */
export const recordPageView = (entityType: 'organization' | 'event') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Don't block the request - record view asynchronously
    setImmediate(async () => {
      try {
        const viewTracker = new ViewTrackingService();
        
        // Determine entity ID based on route parameters
        let entityId = entityType === 'organization' 
          ? req.params.rsi_org_id || req.params.spectrumId || req.params.organizationId
          : req.params.id || req.params.eventId;

        // For organizations, convert rsi_org_id to internal UUID
        if (entityType === 'organization' && entityId) {
          const org = await db('organizations')
            .select('id', 'rsi_org_id')
            .where('rsi_org_id', entityId)
            .first();
          
          if (!org) {
            logger.debug(`Organization not found for rsi_org_id: ${entityId}`);
            return;
          }
          
          // Use the internal UUID for view tracking
          entityId = org.id;
        }

        if (!entityId) {
          logger.debug(`No entity ID found for ${entityType} view tracking`);
          return;
        }

        // Extract client information
        const clientIp = req.ip || 
          req.connection.remoteAddress || 
          req.socket.remoteAddress ||
          (req.connection as any)?.socket?.remoteAddress;

        await viewTracker.recordView({
          entity_type: entityType,
          entity_id: entityId,
          user_id: getUserFromRequest(req)?.id,
          ip_address: clientIp,
          user_agent: req.get('User-Agent'),
        });

        logger.debug(`Recorded ${entityType} view:`, {
          entity_id: entityId,
          user_id: getUserFromRequest(req)?.id,
          ip_address: clientIp,
        });
      } catch (error) {
        // Log error but don't affect the main request
        logger.error('Failed to record view:', error);
      }
    });

    // Continue with the main request immediately
    next();
  };
};

/**
 * Specific middleware instances for common use cases
 */
export const recordOrganizationView = recordPageView('organization');
export const recordEventView = recordPageView('event');
