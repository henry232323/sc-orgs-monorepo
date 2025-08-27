# Functional Specification

## Site Purpose & Overview

### Primary Function
This application serves as a Star Citizen organization recruitment and discovery platform. Users authenticate through Discord OAuth and can discover, join, and manage Star Citizen organizations. The platform requires RSI (Roberts Space Industries) account verification for full functionality, ensuring authentic Star Citizen players can interact with verified organizations.

### Target Users
- Star Citizen players looking to join organizations
- Organization leaders and administrators
- Community organizers and recruiters
- Star Citizen community members

---

## Core Features

### 1. Authentication System
- [ ] Discord OAuth integration using passport-discord
- [ ] Star Citizen account verification via RSI bio sentinel
- [ ] User profile management with RSI handle and Spectrum ID
- [ ] Role-based access control
- [ ] Session management with JWT tokens
- [ ] Secure logout functionality
- [ ] Read-only mode for unverified users

### 2. User Management
- [ ] User registration through Discord OAuth
- [ ] Star Citizen account verification via RSI bio sentinel
- [ ] RSI handle and Spectrum ID storage and validation
- [ ] Profile customization with Star Citizen information
- [ ] Role assignment and permissions within organizations
- [ ] User search and discovery
- [ ] Account settings and preferences
- [ ] Verification status tracking

### 3. Star Citizen Organization Management
- [ ] Organization verification via RSI org page sentinel
- [ ] RSI org data scraping and synchronization
- [ ] Organization registration with banner, description, and tags
- [ ] Language, playstyle, and focus categorization
- [ ] Organization icon scraping from RSI pages
- [ ] Member invitation system with invite codes
- [ ] Granular permission system for org management
- [ ] Organization activity tracking and analytics

### 4. Recruitment & Discovery System
- [ ] Comprehensive organization search and filtering
- [ ] Tag-based organization discovery
- [ ] Activity-based sorting (recent upvotes, total upvotes)
- [ ] Language and playstyle filtering
- [ ] Organization upvoting system (once per week per org)
- [ ] Organization comments and replies
- [ ] Comment upvoting and downvoting system
- [ ] Organization rating and review system

### 5. Event Management System
- [ ] Organization event creation and management
- [ ] Event scheduling with date, time, and duration
- [ ] Event categorization with playstyle and activity tags
- [ ] Language specification for events
- [ ] Event search and filtering capabilities
- [ ] Upcoming and past event queries
- [ ] Event registration and attendance tracking
- [ ] Event promotion and discovery

### 6. Communication & Collaboration
- [ ] Real-time messaging and notifications
- [ ] Discussion forums and threads
- [ ] Event announcements and updates
- [ ] Integration with Discord webhooks
- [ ] Organization-specific communication channels

---

## Technical Architecture

### Backend Server (Express.js)
- [ ] RESTful API endpoints
- [ ] Middleware for authentication and validation
- [ ] Database abstraction layer with Knex.js
- [ ] OpenAPI specification generation
- [ ] Error handling and logging
- [ ] Rate limiting and security measures
- [ ] RSI API integration clients
- [ ] Web scraping services for verification

### Database Design (SQLite with Knex.js)
- [ ] User profiles and authentication data
- [ ] Star Citizen account verification data (RSI handle, Spectrum ID)
- [ ] Organization and membership tables
- [ ] Organization verification and registration data
- [ ] Event management and scheduling
- [ ] Communication and activity logs
- [ ] Permission and role definitions
- [ ] Audit trails and history
- [ ] Timestamped database resources
- [ ] Organization tags and categorization
- [ ] Upvoting and rating systems
- [ ] Comment and reply systems

### Frontend Application (React + Headless UI)
- [ ] Responsive web interface
- [ ] Component-based architecture
- [ ] State management with Redux Toolkit
- [ ] Real-time updates and notifications
- [ ] Mobile-friendly design
- [ ] Accessibility compliance
- [ ] Organization discovery and search interface
- [ ] Event browsing and management
- [ ] User verification flow interface
- [ ] Organization management dashboard

---

## API Endpoints Structure

### Authentication Routes
- [ ] `POST /api/auth/discord` - Initiate Discord OAuth
- [ ] `GET /api/auth/discord/callback` - OAuth callback handler
- [ ] `POST /api/auth/logout` - User logout
- [ ] `GET /api/auth/me` - Get current user profile
- [ ] `PUT /api/auth/profile` - Update user profile
- [ ] `POST /api/auth/verify-rsi` - Verify Star Citizen account via RSI bio sentinel
- [ ] `GET /api/auth/verification-status` - Get user verification status
- [ ] `POST /api/auth/refresh-rsi-data` - Refresh RSI account data

### User Management Routes
- [ ] `GET /api/users` - List users (with filtering)
- [ ] `GET /api/users/:id` - Get specific user details
- [ ] `PUT /api/users/:id` - Update user information
- [ ] `DELETE /api/users/:id` - Delete user account
- [ ] `GET /api/users/:id/organizations` - Get user's organizations

### Star Citizen Organization Routes
- [ ] `POST /api/organizations` - Create new organization
- [ ] `GET /api/organizations` - List organizations with filtering and search
- [ ] `GET /api/organizations/:id` - Get organization details
- [ ] `PUT /api/organizations/:id` - Update organization
- [ ] `DELETE /api/organizations/:id` - Delete organization
- [ ] `POST /api/organizations/:id/verify` - Verify organization ownership via RSI page sentinel
- [ ] `POST /api/organizations/:id/register` - Complete organization registration
- [ ] `GET /api/organizations/:id/verification-status` - Get organization verification status
- [ ] `POST /api/organizations/:id/members` - Add member
- [ ] `DELETE /api/organizations/:id/members/:userId` - Remove member
- [ ] `POST /api/organizations/:id/invite-codes` - Generate invite codes
- [ ] `POST /api/organizations/:id/join` - Join organization via invite code
- [ ] `GET /api/organizations/:id/permissions` - Get user permissions for organization
- [ ] `PUT /api/organizations/:id/permissions/:userId` - Update user permissions

### Event Management Routes
- [ ] `POST /api/organizations/:id/events` - Create event
- [ ] `GET /api/organizations/:id/events` - List organization events
- [ ] `GET /api/events` - List all events with filtering
- [ ] `GET /api/events/:id` - Get event details
- [ ] `PUT /api/events/:id` - Update event
- [ ] `DELETE /api/events/:id` - Delete event
- [ ] `POST /api/events/:id/register` - Register for event
- [ ] `DELETE /api/events/:id/register` - Unregister from event
- [ ] `GET /api/events/search` - Search events by tags and criteria
- [ ] `GET /api/events/upcoming` - Get upcoming events
- [ ] `GET /api/events/past` - Get past events

### Communication & Interaction Routes
- [ ] `GET /api/organizations/:id/messages` - Get messages
- [ ] `POST /api/organizations/:id/messages` - Send message
- [ ] `POST /api/organizations/:id/comments` - Add comment to organization
- [ ] `GET /api/organizations/:id/comments` - Get organization comments
- [ ] `POST /api/comments/:id/replies` - Reply to comment
- [ ] `GET /api/comments/:id/replies` - Get comment replies
- [ ] `POST /api/organizations/:id/upvote` - Upvote organization (once per week)
- [ ] `DELETE /api/organizations/:id/upvote` - Remove organization upvote
- [ ] `POST /api/comments/:id/upvote` - Upvote comment
- [ ] `POST /api/comments/:id/downvote` - Downvote comment
- [ ] `DELETE /api/comments/:id/vote` - Remove comment vote

### Search & Discovery Routes
- [ ] `GET /api/search/organizations` - Search organizations by tags, criteria, and filters
- [ ] `GET /api/search/events` - Search events by tags, date range, and criteria
- [ ] `GET /api/search/users` - Search users by RSI handle or other criteria
- [ ] `GET /api/tags` - Get available organization and event tags
- [ ] `GET /api/organizations/popular` - Get popular organizations by upvotes
- [ ] `GET /api/organizations/recent` - Get recently active organizations
- [ ] `GET /api/events/featured` - Get featured or upcoming events

---

## Database Schema Overview

### Core Tables
- [ ] `users` - User profiles and authentication data
- [ ] `user_verifications` - Star Citizen account verification data
- [ ] `organizations` - Organization information and metadata
- [ ] `organization_verifications` - Organization verification data
- [ ] `organization_members` - User-organization relationships
- [ ] `organization_permissions` - User permissions within organizations
- [ ] `organization_tags` - Organization categorization tags
- [ ] `organization_upvotes` - Organization upvoting system
- [ ] `events` - Scheduled events and activities
- [ ] `event_registrations` - User event registration
- [ ] `event_tags` - Event categorization tags
- [ ] `comments` - Organization comments and replies
- [ ] `comment_votes` - Comment upvoting and downvoting
- [ ] `invite_codes` - Organization invitation codes
- [ ] `roles` - Permission definitions
- [ ] `user_roles` - User-role assignments

### Key Relationships
- [ ] Users can belong to multiple organizations with different permission levels
- [ ] Organizations can have multiple events and activities
- [ ] Users can upvote organizations (limited to once per week per org)
- [ ] Users can have different roles per organization
- [ ] Events are tied to organizations and can have multiple registrations
- [ ] Comments and replies form threaded discussions on organizations
- [ ] Organization tags enable categorization and discovery
- [ ] Invite codes allow controlled organization membership

---

## Security & Permissions

### Authentication Security
- [ ] Discord OAuth 2.0 flow
- [ ] JWT token validation
- [ ] Secure session management
- [ ] CSRF protection
- [ ] Rate limiting on sensitive endpoints

### Role-Based Access Control
- [ ] Organization Owner - Full control
- [ ] Organization Admin - Administrative access
- [ ] Organization Member - Standard access
- [ ] Project Manager - Project-level control
- [ ] Project Member - Project participation

### Data Protection
- [ ] Input validation and sanitization
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] Secure headers configuration
- [ ] Environment variable management

---

## Integration Points

### Discord Integration
- [ ] OAuth authentication
- [ ] User profile synchronization
- [ ] Webhook notifications
- [ ] Role mapping between Discord and application

### Star Citizen Integration
- [ ] RSI account verification via bio sentinel scraping
- [ ] Spectrum API integration for user data
- [ ] Organization page scraping for verification
- [ ] RSI handle and Spectrum ID synchronization
- [ ] Community Hub API integration for profile data

### External Services
- [ ] Email notifications (future)
- [ ] File storage (future)
- [ ] Analytics and monitoring (future)
- [ ] Backup and recovery systems

---

## Star Citizen Verification System

### User Account Verification
- [ ] RSI bio sentinel verification: `[SCORGS:<unique_code>]`
- [ ] Unique verification code generation per user
- [ ] RSI bio scraping and sentinel detection
- [ ] Spectrum ID extraction and storage
- [ ] RSI handle validation and storage
- [ ] Verification status tracking and updates

### Organization Verification
- [ ] RSI org page sentinel verification
- [ ] Organization page scraping and sentinel detection
- [ ] Organization icon and metadata extraction
- [ ] Ownership verification through sentinel presence
- [ ] Organization registration completion requirements
- [ ] Verification status management

### Technical Implementation
- [ ] RSI API client using Spectrum endpoints
- [ ] Community Hub GraphQL client integration
- [ ] Web scraping service for org page verification
- [ ] Rate limiting and error handling for external APIs
- [ ] Verification code generation and management
- [ ] Data synchronization between RSI and local database

## Development Guidelines

### Code Standards
- [ ] TypeScript for type safety
- [ ] ESLint for code quality
- [ ] Prettier for formatting
- [ ] Snake_case for file naming
- [ ] Minimal commenting (self-documenting code)
- [ ] **Test coverage requirements for all new code**
- [ ] **Test-driven development approach**

### API Development
- [ ] OpenAPI specification for each endpoint
- [ ] Request/response validation
- [ ] Consistent error handling
- [ ] Comprehensive testing
- [ ] API versioning strategy
- [ ] RSI API client integration
- [ ] Web scraping service implementation
- [ ] Rate limiting for external API calls

### Database Design
- [ ] Knex.js for database abstraction
- [ ] Migration-based schema management
- [ ] Seed data for development
- [ ] Database-agnostic design
- [ ] Performance optimization
- [ ] Timestamped database resources
- [ ] Efficient indexing for search queries
- [ ] Data validation and constraints

### Testing Strategy
- [ ] **Test-Driven Development (TDD) approach for all new features**
- [ ] **Continuous testing throughout development process**
- [ ] **Unit tests for all business logic and utility functions**
- [ ] **Integration tests for API endpoints and database operations**
- [ ] **Component tests for React components using React Testing Library**
- [ ] **End-to-end tests for critical user flows**
- [ ] **Test coverage requirements: minimum 80% for new code**
- [ ] **Automated testing in CI/CD pipeline**
- [ ] **Mock external services (RSI APIs, Discord) for reliable testing**
- [ ] **Database testing with test databases and fixtures**
- [ ] **Performance testing for search and filtering operations**
- [ ] **Security testing for authentication and authorization flows**

---

## Future Enhancements

### Phase 2 Features
- [ ] Advanced project management tools
- [ ] Real-time collaboration features
- [ ] Mobile application
- [ ] Advanced analytics and reporting
- [ ] Integration with external tools

### Phase 3 Features
- [ ] Multi-tenant architecture
- [ ] Advanced permission systems
- [ ] API rate limiting and quotas
- [ ] Advanced search and filtering
- [ ] Export and import functionality

---

## Success Metrics

### User Engagement
- [ ] User registration and retention rates
- [ ] Organization creation and growth
- [ ] Project completion rates
- [ ] User activity and participation

### Technical Performance
- [ ] API response times
- [ ] Database query performance
- [ ] Frontend load times
- [ ] System uptime and reliability

### Business Goals
- [ ] Platform adoption and growth
- [ ] User satisfaction and feedback
- [ ] Feature utilization rates
- [ ] Community building and engagement

---

## Development Notes & Requirements

### Testing Requirements
- **Testing is mandatory for all new features**
- **Maintain minimum 80% test coverage**
- **Write tests before implementing features (TDD approach)**
- **Run test suite before every commit**
- **Test external integrations thoroughly**

### Code Quality Standards
- Project uses Yarn instead of npm
- Classes should be callable for instantiation (no new keyword)
- Prefer snake_case for file names
- Run 'yarn prettier' after making changes
- Commit frequently as you code
- **No feature is complete without tests**
