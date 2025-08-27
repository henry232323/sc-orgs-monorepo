import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import AppLayout from './components/layout/AppLayout';
import { ToastContainer } from './components/ui';
import {
  RequireAuth,
  RequireOrganizationMember,
  RequireOrganizationRole,
} from './components/guards/RouteGuards';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrganizationsPage from './pages/OrganizationsPage';
import ReputationPage from './pages/ReputationPage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import EventsPage from './pages/EventsPage';
import ProfilePage from './pages/ProfilePage';
import PublicProfilePage from './pages/PublicProfilePage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import OrganizationForm from './components/organizations/OrganizationForm';
import OrganizationDetail from './components/organizations/OrganizationDetail';
import OrganizationMembers from './components/organizations/OrganizationMembers';
import OrganizationManagementPage from './pages/OrganizationManagementPage';
import EventForm from './components/events/EventForm';
import EventDetail from './components/events/EventDetail';
import AuthCallbackPage from './pages/AuthCallbackPage';
import InviteAcceptPage from './pages/InviteAcceptPage';
import UIPreviewPage from './pages/UIPreviewPage';
import { OrganizationRole } from './types/organization';
import './app.css';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const { backgroundTheme, setBackgroundTheme } = useTheme();
  const { toasts, removeToast } = useToast();

  return (
    <AppLayout
      user={user}
      isAuthenticated={isAuthenticated}
      isLoading={isLoading}
      login={login}
      logout={logout}
      currentTheme={backgroundTheme}
      onThemeChange={setBackgroundTheme}
    >
      <Routes>
        {/* Public routes */}
        <Route path='/' element={<HomePage />} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/auth/callback' element={<AuthCallbackPage />} />

        {/* Routes requiring authentication */}
        <Route
          path='/dashboard'
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path='/profile'
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route path='/profile/:rsiHandle' element={<PublicProfilePage />} />
        <Route
          path='/settings'
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />
        <Route
          path='/notifications'
          element={
            <RequireAuth>
              <NotificationsPage />
            </RequireAuth>
          }
        />

        {/* Organization routes */}
        <Route path='/organizations' element={<OrganizationsPage />} />
        <Route
          path='/organizations/create'
          element={
            <RequireAuth>
              <OrganizationForm mode='create' />
            </RequireAuth>
          }
        />
        <Route
          path='/organizations/:spectrumId'
          element={<OrganizationDetail />}
        />
        <Route
          path='/organizations/:spectrumId/edit'
          element={
            <RequireOrganizationRole
              requiredRoles={[OrganizationRole.OWNER, OrganizationRole.ADMIN]}
            >
              <OrganizationForm mode='edit' />
            </RequireOrganizationRole>
          }
        />
        <Route
          path='/organizations/:spectrumId/members'
          element={
            <RequireOrganizationMember>
              <OrganizationMembers />
            </RequireOrganizationMember>
          }
        />
        <Route
          path='/organizations/:spectrumId/manage'
          element={
            <RequireOrganizationRole
              requiredRoles={[OrganizationRole.OWNER, OrganizationRole.ADMIN]}
            >
              <OrganizationManagementPage />
            </RequireOrganizationRole>
          }
        />
        <Route
          path='/organizations/:spectrumId/events/create'
          element={
            <RequireOrganizationMember>
              <EventForm mode='create' />
            </RequireOrganizationMember>
          }
        />

        {/* Reputation routes */}
        <Route path='/reputation' element={<ReputationPage />} />
        <Route path='/reputation/players/:spectrumId' element={<PlayerProfilePage />} />

        {/* Event routes */}
        <Route path='/events' element={<EventsPage />} />
        <Route
          path='/events/create'
          element={
            <RequireAuth>
              <EventForm mode='create' />
            </RequireAuth>
          }
        />
        <Route path='/events/:id' element={<EventDetail />} />
        <Route
          path='/events/:id/edit'
          element={
            <RequireAuth>
              <EventForm mode='edit' />
            </RequireAuth>
          }
        />

        {/* Invite routes */}
        <Route
          path='/invite/:inviteCode'
          element={
            <RequireAuth>
              <InviteAcceptPage />
            </RequireAuth>
          }
        />

        {/* Development-only routes */}
        {import.meta.env.DEV && (
          <Route path='/uipreview' element={<UIPreviewPage />} />
        )}
      </Routes>
      <ToastContainer 
        toasts={toasts.map(toast => ({ ...toast, onClose: removeToast }))} 
        onRemoveToast={removeToast} 
      />
    </AppLayout>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
