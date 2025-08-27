import { Request, Response, NextFunction } from 'express';
import nacl from 'tweetnacl';
import logger from '../config/logger';

export interface DiscordSignatureRequest extends Request {
  rawBody?: Buffer;
}

/**
 * Middleware to validate Discord webhook signatures
 * Returns 401 for invalid signatures
 * Skips validation in development mode
 */
export function validateDiscordSignature(req: DiscordSignatureRequest, res: Response, next: NextFunction): void {
  try {
    // Skip signature validation in development mode
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Discord signature validation skipped in development mode');
      next();
      return;
    }

    const signature = req.headers['x-signature-ed25519'] as string;
    const timestamp = req.headers['x-signature-timestamp'] as string;
    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    // Check if required headers are present
    if (!signature || !timestamp) {
      logger.warn('Discord webhook missing required signature headers');
      res.status(401).json({
        success: false,
        message: 'Missing Discord signature headers',
      });
      return;
    }

    // Check if public key is configured
    if (!publicKey) {
      logger.error('DISCORD_PUBLIC_KEY environment variable is not set');
      res.status(500).json({
        success: false,
        message: 'Discord signature validation not configured',
      });
      return;
    }

    // Get raw body for signature verification
    const body = req.body;
    if (!body) {
      logger.warn('Discord webhook has no body');
      res.status(400).json({
        success: false,
        message: 'No request body',
      });
      return;
    }

    // Convert body to string for signature verification
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    
    // Create signature payload
    const signaturePayload = timestamp + bodyString;

    // Convert hex strings to Uint8Array
    const signatureBytes = hexToUint8Array(signature);
    const publicKeyBytes = hexToUint8Array(publicKey);
    const messageBytes = new TextEncoder().encode(signaturePayload);

    // Verify signature
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    if (!isValid) {
      logger.warn('Discord webhook signature validation failed', {
        signature: signature.substring(0, 8) + '...',
        timestamp,
        bodyLength: bodyString.length,
      });
      res.status(401).json({
        success: false,
        message: 'Invalid Discord signature',
      });
      return;
    }

    logger.debug('Discord webhook signature validated successfully');
    next();

  } catch (error) {
    logger.error('Discord signature validation error:', error);
    res.status(401).json({
      success: false,
      message: 'Discord signature validation failed',
    });
  }
}

/**
 * Convert hex string to Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}