# SC-Orgs: Star Citizen Organization Platform

A comprehensive platform for Star Citizen players to discover, join, and manage organizations. Built with modern web technologies and integrated with Discord OAuth and RSI (Roberts Space Industries) verification systems.

## 🚀 Project Overview

This platform serves as a recruitment and discovery hub for Star Citizen organizations, allowing players to:
- **Discover** organizations based on playstyle, language, and focus areas
- **Verify** their Star Citizen accounts through RSI integration
- **Join** organizations through controlled invitation systems
- **Manage** organization information, events, and member permissions
- **Interact** through comments, upvotes, and event registration

## 📁 Project Documentation

This repository contains three key documents that guide the development process:

### 1. [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) - Development Roadmap
**Purpose**: Technical implementation roadmap and task tracking
**Contains**:
- 5-phase development plan from setup to deployment
- Detailed checklists for each development phase
- Technical architecture decisions and dependencies
- Development workflow and code standards
- Testing and quality assurance requirements

**Use this when**: Planning development sprints, tracking progress, or understanding the technical implementation timeline.

### 2. [`FUNCTIONAL_SPECIFICATION.md`](./FUNCTIONAL_SPECIFICATION.md) - Feature Requirements
**Purpose**: Comprehensive feature specification and business requirements
**Contains**:
- Detailed feature descriptions and user stories
- Complete API endpoint specifications
- Database schema and relationship designs
- Star Citizen integration requirements
- Security and permission specifications
- Testing strategy and quality requirements

**Use this when**: Understanding what features to build, designing APIs, or clarifying business requirements.

### 3. **Project Directory** - Implementation Workspace
**Purpose**: Active development workspace for the application
**Contains**:
- Source code for frontend, backend, and shared components
- Configuration files and dependencies
- Database migrations and seeds
- Testing suites and CI/CD configuration
- Documentation and deployment scripts

**Use this when**: Actually implementing features, running the application, or contributing to the codebase.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│                 │    │                 │    │                 │
│ • React + TS    │◄──►│ • Express + TS  │◄──►│ • SQLite + Knex │
│ • Headless UI   │    │ • Passport.js   │    │ • Migrations    │
│ • Redux Toolkit │    │ • Discord OAuth │    │ • Seed Data     │
│ • TypeScript    │    │ • RSI Integration│   │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔑 Key Features

### Authentication & Verification
- **Discord OAuth** for user authentication
- **RSI Account Verification** via bio sentinel system
- **Organization Ownership Verification** via RSI page scraping
- **JWT-based session management**

### Organization Management
- **Complete organization lifecycle** from creation to management
- **Granular permission system** for different user roles
- **Invitation system** with controlled access codes
- **Tag-based categorization** (language, playstyle, focus)

### Discovery & Interaction
- **Advanced search and filtering** for organizations
- **Upvoting system** (once per week per organization)
- **Comment and reply system** with voting
- **Event management** with registration and discovery

### Star Citizen Integration
- **RSI API clients** for Spectrum and Community Hub
- **Web scraping services** for verification
- **Real-time data synchronization** with RSI systems

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Headless UI** for accessible, unstyled components
- **Redux Toolkit** for state management
- **Tailwind CSS** for utility-first styling

### Backend
- **Node.js** with Express and TypeScript
- **Knex.js** for database abstraction
- **Passport.js** with Discord OAuth strategy
- **@wesleytodd/openapi** for API documentation

### Database
- **SQLite** for development (database-agnostic design)
- **Knex.js** migrations and seed system
- **Comprehensive indexing** for search performance

### External Integrations
- **Discord OAuth 2.0** for authentication
- **RSI Spectrum API** for user verification
- **RSI Community Hub GraphQL** for profile data
- **Web scraping** for organization verification

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and Yarn
- Git for version control
- Discord Developer Application (for OAuth)
- RSI API access (for Star Citizen integration)

### Development Setup
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sc-orgs
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Configure Discord OAuth and RSI API credentials
   ```

4. **Start development servers**
   ```bash
   yarn dev          # Start both frontend and backend
   yarn dev:backend  # Start only backend
   yarn dev:frontend # Start only frontend
   ```

### Testing
- **Run all tests**: `yarn test`
- **Run tests with coverage**: `yarn test:coverage`
- **Run specific test suites**: `yarn test:unit`, `yarn test:integration`
- **Test-driven development** is required for all new features

## 📋 Development Workflow

### Code Standards
- **TypeScript** for type safety
- **Snake_case** for file naming
- **Prettier** for code formatting
- **ESLint** for code quality
- **80% minimum test coverage** for new code

### Commit Guidelines
- **Commit frequently** as you code
- **Run tests** before every commit
- **Format code** with Prettier after changes
- **Write meaningful commit messages**

### Testing Requirements
- **TDD approach**: Write tests before implementing features
- **Unit tests** for all business logic
- **Integration tests** for API endpoints
- **Component tests** for React components
- **End-to-end tests** for critical user flows

## 🔍 API Documentation

The platform provides a comprehensive REST API with:
- **OpenAPI 3.0** specification for all endpoints
- **Request/response validation** with proper error handling
- **Rate limiting** and security measures
- **Comprehensive testing** for all endpoints

API documentation is automatically generated and available at `/api/docs` when the backend is running.

## 🌟 Contributing

### Before Contributing
1. Read the [PROJECT_PLAN.md](./PROJECT_PLAN.md) to understand the development roadmap
2. Review the [FUNCTIONAL_SPECIFICATION.md](./FUNCTIONAL_SPECIFICATION.md) for feature requirements
3. Ensure you understand the testing requirements and TDD approach

### Development Process
1. **Create a feature branch** from the main branch
2. **Write tests first** following TDD principles
3. **Implement the feature** according to specifications
4. **Ensure test coverage** meets minimum requirements
5. **Format code** with Prettier
6. **Run full test suite** before committing
7. **Submit a pull request** with clear description

## 📚 Additional Resources

- **Headless UI Documentation**: [https://headlessui.com/](https://headlessui.com/)
- **Passport.js Discord Strategy**: [https://www.passportjs.org/packages/passport-discord/](https://www.passportjs.org/packages/passport-discord/)
- **OpenAPI Package**: [https://www.npmjs.com/package/@wesleytodd/openapi](https://www.npmjs.com/package/@wesleytodd/openapi)
- **Star Citizen Spectrum API**: Community-driven API documentation

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: This platform is designed for the Star Citizen gaming community and integrates with official RSI services. Please ensure compliance with RSI's terms of service and API usage policies.
