import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { UserModel } from '../models';
import jwt from 'jsonwebtoken';
import {
  generateUsernameFromId,
  generateTemporaryRsiHandle,
} from '../utils/username';

const userModel = new UserModel();

// Initialize passport configuration - only call this after environment variables are loaded
export function initializePassport(): void {
  // Check if environment variables are set
  if (!process.env.DISCORD_CLIENT_ID) {
    throw new Error('DISCORD_CLIENT_ID environment variable is not set');
  }
  if (!process.env.DISCORD_CLIENT_SECRET) {
    throw new Error('DISCORD_CLIENT_SECRET environment variable is not set');
  }
  if (!process.env.DISCORD_CALLBACK_URL) {
    throw new Error('DISCORD_CALLBACK_URL environment variable is not set');
  }

  passport.use(
    new DiscordStrategy(
      {
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL: process.env.DISCORD_CALLBACK_URL,
        scope: ['identify'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await userModel.findByDiscordId(profile.id);

          if (!user) {
            // Create new user with temporary RSI handle
            const userId = require('uuid').v4(); // Generate UUID first so we can create deterministic temp handle
            const userData = {
              id: userId,
              discord_id: profile.id,
              avatar_url: profile.avatar
                ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
                : undefined,
              avatar_source: 'discord' as const,
              rsi_handle: generateTemporaryRsiHandle(userId), // Generate temporary RSI handle
            };

            user = await userModel.create(userData);
          } else {
            // Update existing user's Discord info only (avatar)
            const updateData = {
              avatar_url: profile.avatar
                ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
                : undefined,
              avatar_source: 'discord' as const,
            };

            await userModel.update(user.id, updateData);
          }

          // Update last login
          await userModel.updateLastLogin(user.id);

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await userModel.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export const generateJWT = (user: any): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.sign(
    {
      id: user.id,
      discord_id: user.discord_id,
      rsi_handle: user.rsi_handle,
      is_rsi_verified: user.is_rsi_verified,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
  );
};

export const verifyJWT = (token: string): any => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (error) {
    return null;
  }
};

export default passport;
