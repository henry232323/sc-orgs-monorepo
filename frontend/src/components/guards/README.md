# Route Guards Documentation

This directory contains reusable route protection components for managing access control in the frontend application.

## Overview

The route guard system provides a declarative way to protect routes based on different authorization requirements:

1. **Authentication** - User must be logged in
2. **Organization Membership** - User must be a member of the target organization
3. **Organization Roles** - User must have specific roles within an organization
4. **RSI Verification** - User must have verified their RSI account

## Available Guards

### `RequireAuth`

Protects routes that require user authentication. Redirects unauthenticated users to the login page.

```tsx
<RequireAuth>
  <DashboardPage />
</RequireAuth>
```

**Props:**
- `children`: ReactNode - The protected content
- `fallback?`: ReactNode - Optional loading component

### `RequireOrganizationMember`

Protects routes that require the user to be a member of the target organization. Extracts `spectrumId` from URL params.

```tsx
<RequireOrganizationMember>
  <OrganizationMembers />
</RequireOrganizationMember>
```

**Props:**
- `children`: ReactNode - The protected content
- `fallback?`: ReactNode - Optional loading component

### `RequireOrganizationRole`

Protects routes that require specific organization roles. More granular than membership check.

```tsx
<RequireOrganizationRole 
  requiredRoles={[OrganizationRole.OWNER, OrganizationRole.ADMIN]}
>
  <OrganizationManagementPage />
</RequireOrganizationRole>
```

**Props:**
- `children`: ReactNode - The protected content
- `fallback?`: ReactNode - Optional loading component
- `requiredRole?`: OrganizationRole - Single required role
- `requiredRoles?`: OrganizationRole[] - Array of acceptable roles
- `allowOwner?`: boolean - Whether organization owner automatically has access (default: true)

### `RequireRsiVerification`

Protects routes that require RSI account verification.

```tsx
<RequireRsiVerification>
  <JoinOrganization />
</RequireRsiVerification>
```

**Props:**
- `children`: ReactNode - The protected content
- `fallback?`: ReactNode - Optional loading component

### `RequireAuthenticatedMember` (Composite)

A composite guard that combines multiple protection levels for convenience.

```tsx
<RequireAuthenticatedMember 
  requireRsiVerification={true}
  requiredRole={OrganizationRole.ADMIN}
>
  <SensitiveAdminPage />
</RequireAuthenticatedMember>
```

**Props:**
- `children`: ReactNode - The protected content
- `fallback?`: ReactNode - Optional loading component
- `requireRsiVerification?`: boolean - Whether RSI verification is required
- `requiredRole?`: OrganizationRole - Single required role
- `requiredRoles?`: OrganizationRole[] - Array of acceptable roles
- `allowOwner?`: boolean - Whether organization owner automatically has access

## Error Pages

When access is denied, users see contextual error pages with:

- Clear explanation of why access was denied
- Appropriate action buttons (e.g., "Verify RSI Account", "Back to Organization")
- Consistent styling with the application theme

## Usage Examples

### Basic Authentication

```tsx
// In App.tsx
<Route 
  path='/dashboard' 
  element={
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  } 
/>
```

### Organization Membership

```tsx
// Organization member pages
<Route
  path='/organizations/:spectrumId/members'
  element={
    <RequireOrganizationMember>
      <OrganizationMembers />
    </RequireOrganizationMember>
  }
/>
```

### Role-Based Access

```tsx
// Admin/Owner only pages
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
```

### Complex Requirements

```tsx
// Requires auth + membership + RSI verification
<RequireAuthenticatedMember requireRsiVerification={true}>
  <SpecialFeature />
</RequireAuthenticatedMember>
```

## Implementation Details

### Data Dependencies

- Uses `useAuth()` hook for authentication state
- Uses `useGetOrganizationQuery()` for organization data
- Uses `useGetOrganizationMembersQuery()` for membership data
- Extracts organization ID from URL params (`spectrumId`)

### Loading States

All guards show a consistent loading spinner while checking permissions. You can provide a custom fallback component.

### Error Handling

- **Organization Not Found**: Shows when organization doesn't exist or user lacks access
- **Access Denied**: Shows when user isn't a member
- **Insufficient Permissions**: Shows when user lacks required role
- **RSI Verification Required**: Shows when RSI verification is needed

### Caching

The guards leverage RTK Query's caching system:
- Organization data is cached for 5 minutes
- Member data is cached for 5 minutes
- Permissions are cached for 10 minutes

## Organization Role Hierarchy

```typescript
export enum OrganizationRole {
  OWNER = 'owner',      // Full control
  ADMIN = 'admin',      // Management permissions
  MODERATOR = 'moderator', // Limited moderation
  MEMBER = 'member',    // Basic membership
}
```

## Best Practices

1. **Use the most specific guard** - Don't use `RequireAuth` when you need `RequireOrganizationMember`
2. **Combine guards sparingly** - The composite guard is for complex cases only
3. **Provide meaningful error messages** - The built-in error pages are contextual
4. **Consider loading states** - Guards show loading spinners during permission checks
5. **Test edge cases** - Ensure guards work when data is loading or unavailable

## Future Enhancements

- **Permission-based guards**: Check specific permissions rather than roles
- **Time-based access**: Restrict access based on time/date
- **Feature flags**: Conditional access based on feature toggles
- **Audit logging**: Track access attempts and denials
