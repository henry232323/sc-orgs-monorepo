# Project Structure Overview

## Directory Layout

```
sc-orgs/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components and routing
│   │   ├── store/          # Redux Toolkit store and slices
│   │   ├── utils/          # Frontend utility functions
│   │   ├── types/          # Frontend-specific types
│   │   ├── assets/         # Static assets (images, icons)
│   │   └── hooks/          # Custom React hooks
│   ├── package.json        # Frontend dependencies
│   └── tsconfig.json       # Frontend TypeScript config
│
├── backend/                 # Express.js backend server
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Database models and queries
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Business logic services
│   │   ├── utils/          # Backend utility functions
│   │   ├── clients/        # External API clients (RSI, Discord)
│   │   └── types/          # Backend-specific types
│   ├── package.json        # Backend dependencies
│   └── tsconfig.json       # Backend TypeScript config
│
├── shared/                  # Shared types and utilities
│   ├── src/
│   │   ├── types/          # Common TypeScript interfaces
│   │   └── utils/          # Shared utility functions
│   ├── package.json        # Shared package configuration
│   └── tsconfig.json       # Shared TypeScript config
│
├── database/                # Database configuration and migrations
│   ├── migrations/         # Knex.js database migrations
│   ├── seeds/              # Database seed data
│   └── knexfile.ts         # Knex.js configuration
│
├── docs/                    # Project documentation
│   ├── PROJECT_STRUCTURE.md # This file
│   ├── API_DOCUMENTATION.md # API endpoint documentation
│   └── DEPLOYMENT.md        # Deployment instructions
│
├── data/                    # SQLite database files
├── logs/                    # Application log files
├── package.json             # Root workspace configuration
├── tsconfig.json            # Root TypeScript configuration
├── .eslintrc.js            # ESLint configuration
├── .prettierrc             # Prettier configuration
├── .gitignore              # Git ignore patterns
├── env.example             # Environment variables template
├── README.md               # Project overview and setup
├── PROJECT_PLAN.md         # Development roadmap
└── FUNCTIONAL_SPECIFICATION.md # Feature requirements
```

## Workspace Configuration

This project uses Yarn workspaces to manage multiple packages within a single repository:

### Root Workspace (`package.json`)
- **Purpose**: Orchestrates all workspaces and provides common scripts
- **Scripts**: Development, building, testing, and database management
- **Dependencies**: Common development tools (concurrently, typescript)

### Shared Workspace (`@sc-orgs/shared`)
- **Purpose**: Common types, interfaces, and utilities used by both frontend and backend
- **Exports**: User types, organization types, validation utilities, constants
- **Usage**: Imported by both frontend and backend packages

### Backend Workspace (`@sc-orgs/backend`)
- **Purpose**: Express.js API server with TypeScript
- **Features**: Authentication, database management, external API integration
- **Dependencies**: Express, Knex.js, Passport.js, JWT, etc.

### Frontend Workspace (`@sc-orgs/frontend`)
- **Purpose**: React application with Headless UI and Redux Toolkit
- **Features**: User interface, state management, API integration
- **Dependencies**: React, Headless UI, Redux Toolkit, Vite, etc.

## Key Configuration Files

### TypeScript Configuration
- **Root**: Base configuration extended by all workspaces
- **Shared**: Common types and utilities compilation
- **Backend**: Node.js server compilation
- **Frontend**: React application compilation

### ESLint Configuration
- **Root**: Common linting rules for all workspaces
- **Rules**: TypeScript, React, accessibility, and Prettier integration

### Prettier Configuration
- **Formatting**: Consistent code style across all workspaces
- **Rules**: 2-space indentation, single quotes, 80-character line length

### Database Configuration
- **Knex.js**: Database abstraction layer
- **Environments**: Development (SQLite), test (SQLite), production (PostgreSQL)
- **Migrations**: Schema versioning and database evolution

## Development Workflow

### 1. Setup
```bash
yarn install              # Install all workspace dependencies
yarn workspace @sc-orgs/shared build  # Build shared package
```

### 2. Development
```bash
yarn dev                  # Start both frontend and backend
yarn dev:backend          # Start only backend
yarn dev:frontend         # Start only frontend
```

### 3. Testing
```bash
yarn test                 # Run all tests
yarn test:coverage        # Run tests with coverage
```

### 4. Building
```bash
yarn build                # Build all workspaces
yarn workspace @sc-orgs/shared build  # Build shared package
```

### 5. Database Management
```bash
yarn db:migrate           # Run database migrations
yarn db:seed              # Seed database with test data
yarn db:reset             # Reset and reseed database
```

## File Naming Conventions

- **Files**: snake_case (e.g., `user_controller.ts`, `auth_middleware.ts`)
- **Directories**: snake_case (e.g., `user_management/`, `api_routes/`)
- **Classes**: PascalCase (e.g., `UserController`, `AuthService`)
- **Functions**: camelCase (e.g., `getUserById`, `createOrganization`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_NAME_LENGTH`, `DEFAULT_PAGE_SIZE`)

## Import Patterns

### Shared Package Imports
```typescript
// From shared package
import { User, Organization, generateVerificationCode } from '@sc-orgs/shared';

// Within same workspace
import { UserController } from './controllers/user_controller';
import { UserService } from '../services/user_service';
```

### Type Definitions
- **Shared Types**: Common interfaces used across workspaces
- **Workspace Types**: Specific types for frontend or backend
- **API Types**: Request/response interfaces for API endpoints

## Testing Structure

### Test Organization
- **Unit Tests**: Individual function and class testing
- **Integration Tests**: API endpoint and database testing
- **Component Tests**: React component testing (frontend)
- **E2E Tests**: Full user flow testing

### Test Coverage Requirements
- **Minimum**: 80% coverage for new code
- **Target**: 90%+ coverage for critical paths
- **Focus**: Business logic, API endpoints, user interactions

## Security Considerations

### Environment Variables
- **Sensitive Data**: Never committed to version control
- **Configuration**: Environment-specific settings
- **Secrets**: JWT keys, API credentials, database passwords

### Authentication
- **Discord OAuth**: User authentication and authorization
- **JWT Tokens**: Session management and API access
- **Rate Limiting**: API abuse prevention

### Data Validation
- **Input Sanitization**: Prevent injection attacks
- **Schema Validation**: Request/response validation
- **Type Safety**: TypeScript compilation checks
