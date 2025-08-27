import { Request, Response, NextFunction } from 'express';
import { OrganizationModel } from '../models/organization_model';
import { Organization } from '../types/organization';

// Extend the Request interface to include the organization
declare global {
  namespace Express {
    interface Request {
      org?: Organization;
    }
  }
}

const organizationModel = new OrganizationModel();

/**
 * Middleware to resolve RSI org ID to organization object
 * Looks for :rsi_org_id parameter and attaches the organization to req.org
 */
export async function resolveOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { rsi_org_id } = req.params;
    
    if (!rsi_org_id) {
      // No rsi_org_id parameter, continue without resolving
      return next();
    }

    // Validate Spectrum ID format
    if (!/^[A-Z0-9]{1,20}$/.test(rsi_org_id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid Spectrum ID format. Must be alphanumeric, uppercase, and 1-20 characters.',
      });
      return;
    }

    // Find organization by RSI org ID
    const organization = await organizationModel.findByRsiOrgId(rsi_org_id);
    
    if (!organization) {
      res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
      return;
    }

    // Attach organization to request object
    req.org = organization;
    next();
  } catch (error) {
    console.error('Error resolving organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve organization',
    });
  }
}

/**
 * Middleware to resolve RSI org ID to organization object (optional)
 * Same as resolveOrganization but doesn't fail if organization is not found
 */
export async function resolveOrganizationOptional(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { rsi_org_id } = req.params;
    
    if (!rsi_org_id) {
      return next();
    }

    // Validate Spectrum ID format
    if (!/^[A-Z0-9]{1,20}$/.test(rsi_org_id)) {
      return next(); // Continue without organization for invalid format
    }

    // Find organization by RSI org ID
    const organization = await organizationModel.findByRsiOrgId(rsi_org_id);
    
    if (organization) {
      req.org = organization;
    }

    next();
  } catch (error) {
    console.error('Error resolving organization (optional):', error);
    // Continue without organization on error
    next();
  }
}
