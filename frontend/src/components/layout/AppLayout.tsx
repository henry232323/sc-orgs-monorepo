import React, { useState } from 'react';
import { User } from '../../types/user';
import { BackgroundTheme } from '../../contexts/ThemeContext';
import MobileSidebar from './MobileSidebar';
import DesktopSidebar from './DesktopSidebar';
import AppHeader from './AppHeader';
import FloatingActionButton, {
  BackgroundTheme as FloatingActionBackgroundTheme,
} from '../ui/FloatingActionButton';

interface AppLayoutProps {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  children: React.ReactNode;
  currentTheme?: BackgroundTheme;
  onThemeChange?: (theme: BackgroundTheme) => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  user,
  isAuthenticated,
  isLoading,
  login,
  logout,
  children,
  currentTheme,
  onThemeChange,
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className='min-h-screen'>
      <MobileSidebar
        user={user}
        isAuthenticated={isAuthenticated}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      <AppHeader
        user={user}
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
        login={login}
        logout={logout}
        onMobileSidebarToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className='flex'>
        <DesktopSidebar user={user} />

        <div className='flex-1 min-w-0 lg:ml-72'>
          <main className='pt-8 px-6 pb-16'>{children}</main>
        </div>
      </div>

      <FloatingActionButton
        currentTheme={currentTheme as FloatingActionBackgroundTheme}
        onThemeChange={
          onThemeChange as (theme: FloatingActionBackgroundTheme) => void
        }
      />
    </div>
  );
};

export default AppLayout;
