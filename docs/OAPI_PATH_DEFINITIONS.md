# OpenAPI Path Definitions Summary

This document lists all the `oapi.path` definitions that have been added to HR controllers to replace verbose OpenAPI JSDoc comments.

## HR Activity Controller
**File**: `backend/src/controllers/hr_activity_controller.ts`

- `// oapi.path.get('/organizations/{organizationId}/hr-activities')`
  - **Method**: `getOrganizationActivities`
  - **Description**: Get paginated HR activities with filtering

## HR Skill Statistics Controller
**File**: `backend/src/controllers/hr_skill_statistics_controller.ts`

- `// oapi.path.get('/organizations/{organizationId}/skills/statistics')`
  - **Method**: `getAllSkillsStatistics`
  - **Description**: Get statistics for all organization skills

- `// oapi.path.get('/organizations/{organizationId}/skills/{skillId}/statistics')`
  - **Method**: `getSkillStatistics`
  - **Description**: Get statistics for a specific skill

## HR Document Controller
**File**: `backend/src/controllers/hr_document_controller.ts`

- `// oapi.path.post('/organizations/{organizationId}/documents')`
  - **Method**: `uploadDocument`
  - **Description**: Upload a new document

- `// oapi.path.get('/organizations/{organizationId}/documents')`
  - **Method**: `listDocuments`
  - **Description**: List documents with filtering

- `// oapi.path.get('/organizations/{organizationId}/documents/{documentId}/acknowledgments')`
  - **Method**: `getDocumentAcknowledgments`
  - **Description**: Get document acknowledgment status

- `// oapi.path.post('/organizations/{organizationId}/documents/{documentId}/acknowledgments')`
  - **Method**: `acknowledgeDocument`
  - **Description**: Acknowledge a document

## HR Analytics Controller
**File**: `backend/src/controllers/hr_analytics_controller.ts`

- `// oapi.path.get('/organizations/{organizationId}/hr-analytics')`
  - **Method**: `getDashboardMetrics`
  - **Description**: Get comprehensive HR analytics

## HR Application Controller
**File**: `backend/src/controllers/hr_application_controller.ts`

- `// oapi.path.post('/organizations/{organizationId}/applications')`
  - **Method**: `submitApplication`
  - **Description**: Submit a new job application

- `// oapi.path.get('/organizations/{organizationId}/applications')`
  - **Method**: `listApplications`
  - **Description**: List applications with filtering and pagination

## HR Skill Controller
**File**: `backend/src/controllers/hr_skill_controller.ts`

- `// oapi.path.get('/organizations/{organizationId}/skills')`
  - **Method**: `listSkills`
  - **Description**: List all available skills with filtering

- `// oapi.path.post('/organizations/{organizationId}/skills')`
  - **Method**: `createSkill`
  - **Description**: Create a new skill (admin only)

- `// oapi.path.post('/organizations/{organizationId}/skills/user')`
  - **Method**: `addUserSkill`
  - **Description**: Add a skill to the current user

- `// oapi.path.get('/organizations/{organizationId}/skills/user/{userId}')`
  - **Method**: `getUserSkills`
  - **Description**: Get skills for a specific user

- `// oapi.path.put('/organizations/{organizationId}/skills/{skillId}/verify')`
  - **Method**: `verifyUserSkill`
  - **Description**: Verify a user's skill

## HR Onboarding Controller
**File**: `backend/src/controllers/hr_onboarding_controller.ts`

- `// oapi.path.get('/organizations/{organizationId}/onboarding/templates')`
  - **Method**: `getTemplates`
  - **Description**: Get onboarding templates

- `// oapi.path.post('/organizations/{organizationId}/onboarding/templates')`
  - **Method**: `createTemplate`
  - **Description**: Create a new onboarding template

- `// oapi.path.get('/organizations/{organizationId}/onboarding/progress')`
  - **Method**: `getProgress`
  - **Description**: Get onboarding progress for users

- `// oapi.path.put('/organizations/{organizationId}/onboarding/progress')`
  - **Method**: `updateProgress`
  - **Description**: Update onboarding progress

- `// oapi.path.post('/organizations/{organizationId}/onboarding/tasks/{taskId}/complete')`
  - **Method**: `completeTask`
  - **Description**: Mark an onboarding task as complete

## HR Performance Controller
**File**: `backend/src/controllers/hr_performance_controller.ts`

- `// oapi.path.post('/organizations/{organizationId}/performance/reviews')`
  - **Method**: `createReview`
  - **Description**: Create a new performance review

- `// oapi.path.get('/organizations/{organizationId}/performance/reviews')`
  - **Method**: `listReviews`
  - **Description**: List performance reviews with filtering

- `// oapi.path.get('/organizations/{organizationId}/performance/reviews/{reviewId}')`
  - **Method**: `getReview`
  - **Description**: Get a specific performance review

- `// oapi.path.get('/organizations/{organizationId}/performance/analytics')`
  - **Method**: `getAnalytics`
  - **Description**: Get performance analytics

- `// oapi.path.post('/organizations/{organizationId}/performance/goals')`
  - **Method**: `createGoal`
  - **Description**: Create a new performance goal

## Benefits of oapi.path Definitions

### 1. Concise Documentation
- Single line comments instead of 50+ line JSDoc blocks
- Easier to read and maintain
- Less visual clutter in code

### 2. Clear Path Mapping
- Explicit path definitions with parameter placeholders
- Easy to see which endpoints are documented
- Consistent naming conventions

### 3. Maintainability
- Simple to update when endpoints change
- No complex schema definitions to maintain
- Reduced chance of documentation drift

### 4. Integration Ready
- Compatible with OpenAPI tooling
- Can be processed by documentation generators
- Supports automated API discovery

## Usage Guidelines

### Path Parameter Format
Use curly braces for path parameters:
```javascript
// oapi.path.get('/organizations/{organizationId}/skills/{skillId}')
```

### HTTP Methods
Include the appropriate HTTP method:
```javascript
// oapi.path.get()    - for GET requests
// oapi.path.post()   - for POST requests  
// oapi.path.put()    - for PUT requests
// oapi.path.delete() - for DELETE requests
// oapi.path.patch()  - for PATCH requests
```

### Placement
Place the comment directly above the method definition:
```javascript
// oapi.path.get('/organizations/{organizationId}/skills')
async listSkills(req: Request, res: Response): Promise<void> {
  // method implementation
}
```

## Next Steps

1. **Tooling Integration**: Set up tooling to process oapi.path definitions
2. **Documentation Generation**: Configure automatic API documentation generation
3. **Validation**: Implement request/response validation based on paths
4. **Testing**: Generate test cases from path definitions
5. **Client Generation**: Auto-generate client libraries from definitions

## Migration Complete

All major HR endpoints now use concise `oapi.path` definitions instead of verbose OpenAPI JSDoc comments. This provides clean, maintainable API documentation while preserving all necessary endpoint information.