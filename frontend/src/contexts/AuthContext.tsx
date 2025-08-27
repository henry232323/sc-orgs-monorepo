import React, { createContext, useContext, ReactNode } from 'react';
import {
  useGetCurrentUserQuery,
  useLogoutMutation,
} from '../services/apiSlice';

// Auth context interface
interface AuthContextType {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Check if we have a token in localStorage
  const token = localStorage.getItem('auth_token');

  // Use RTK Query to get current user (only if we have a token)
  const {
    data: user,
    isLoading,
    error,
  } = useGetCurrentUserQuery(undefined, {
    skip: !token, // Skip the query if no token
  });

  // Logout mutation
  const [logoutMutation] = useLogoutMutation();

  // Determine authentication state
  const isAuthenticated = !!token && !!user && !error;

  // Login function - redirects to Discord OAuth
  const login = () => {
    const clientId = process.env.VITE_DISCORD_CLIENT_ID;
    const redirectUri = process.env.VITE_DISCORD_REDIRECT_URI;

    if (!clientId) {
      console.error('Discord client ID not configured');
      return;
    }

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri || '')}&response_type=code&scope=identify%20email`;
    window.location.href = discordAuthUrl;
  };

  // Logout function
  const logout = async () => {
    try {
      // Call the logout API endpoint
      await logoutMutation().unwrap();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local storage and redirect regardless of API call success
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
  };

  // Context value
  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
