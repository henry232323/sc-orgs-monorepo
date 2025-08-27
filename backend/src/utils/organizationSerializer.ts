/**
 * Common organization serialization utilities
 * Ensures consistent data formatting across all endpoints
 */

export interface BaseOrganization {
  rsi_org_id: string;
  name: string;
  description?: string;
  icon_url?: string;
  languages?: string[];
  is_active: boolean;
  is_registered: boolean;
  total_members: number;
  total_upvotes: number;
  playstyle_tags?: string[];
  focus_tags?: string[];
  created_at: string; // ISO string for consistent frontend parsing
  updated_at: string; // ISO string for consistent frontend parsing
  // Note: internal database 'id' is intentionally excluded for security
}

export interface UserOrganization extends BaseOrganization {
  // Additional fields specific to user's relationship with the org
  role_name: string;
  is_owner: boolean;
  joined_at: string; // ISO string for consistent frontend parsing
  is_hidden: boolean;
}

/**
 * Parse JSON string tags to arrays and handle language arrays
 */
function parseTags(org: any): any {
  // Helper function to safely parse language field
  const parseLanguage = (lang: any): string[] => {
    if (!lang) return [];
    if (Array.isArray(lang)) {
      // Filter out any corrupted object strings and ensure all items are strings
      return lang
        .filter(item => typeof item === 'string' && item !== '[object Object]')
        .map(item => item.trim())
        .filter(item => item.length > 0);
    }
    if (typeof lang === 'string') {
      // Try to parse as JSON first, if that fails, treat as single language string
      try {
        const parsed = JSON.parse(lang);
        if (Array.isArray(parsed)) {
          // Filter out corrupted objects and ensure all items are strings
          return parsed
            .filter(
              item => typeof item === 'string' && item !== '[object Object]'
            )
            .map(item => item.trim())
            .filter(item => item.length > 0);
        }
        return typeof parsed === 'string' && parsed !== '[object Object]'
          ? [parsed]
          : [];
      } catch {
        // If JSON.parse fails, it's likely a single language string like "English"
        return lang !== '[object Object]' ? [lang] : [];
      }
    }
    return [];
  };

  return {
    ...org,
    // PostgreSQL arrays are returned as arrays directly - no parsing needed
    playstyle_tags: Array.isArray(org.playstyle_tags) ? org.playstyle_tags : [],
    focus_tags: Array.isArray(org.focus_tags) ? org.focus_tags : [],
    languages: Array.isArray(org.languages) ? org.languages : ['English'],
  };
}

/**
 * Remove internal database fields that should not be exposed to frontend
 */
function sanitizeForPublic(organization: any): any {
  const {
    id, // Remove internal database ID
    owner_id, // Remove internal owner ID
    verification_sentinel, // Remove verification data
    ...publicOrg
  } = organization;

  return publicOrg;
}

/**
 * Convert database dates to ISO strings for consistent frontend parsing
 */
function serializeDates(org: any): any {
  return {
    ...org,
    created_at: org.created_at ? new Date(org.created_at).toISOString() : null,
    updated_at: org.updated_at ? new Date(org.updated_at).toISOString() : null,
    joined_at: org.joined_at ? new Date(org.joined_at).toISOString() : null,
  };
}

/**
 * Base organization serializer - used by organization list/search endpoints
 */
export function serializeOrganization(org: any): BaseOrganization {
  const parsed = parseTags(org);
  const sanitized = sanitizeForPublic(parsed);
  const serialized = serializeDates(sanitized);

  return serialized as BaseOrganization;
}

/**
 * User organization serializer - used by user organization endpoints
 * Includes additional user-specific fields while maintaining base consistency
 */
export function serializeUserOrganization(org: any): UserOrganization {
  const parsed = parseTags(org);
  const sanitized = sanitizeForPublic(parsed);
  const serialized = serializeDates(sanitized);

  // Apply sanitization to remove internal IDs, then add user-specific fields
  return {
    ...serialized,
    is_owner: org.role_name === 'Owner',
  } as UserOrganization;
}

/**
 * Serialize an array of organizations
 */
export function serializeOrganizations(orgs: any[]): BaseOrganization[] {
  return orgs.map(serializeOrganization);
}

/**
 * Serialize an array of user organizations
 */
export function serializeUserOrganizations(orgs: any[]): UserOrganization[] {
  return orgs.map(serializeUserOrganization);
}
