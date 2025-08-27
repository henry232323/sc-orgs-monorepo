/**
 * Tag validation utilities
 * These tags must match exactly with the frontend SEARCH_TAGS configuration
 */

// Playstyle tags - must match frontend TagType.PLAYSTYLE
export const VALID_PLAYSTYLE_TAGS = [
  'Casual',
  'Hardcore',
  'Roleplay',
  'Competitive',
  'Social',
  'Military',
] as const;

// Activity tags - must match frontend TagType.ACTIVITY
export const VALID_ACTIVITY_TAGS = [
  'Combat',
  'Trading',
  'Mining',
  'Exploration',
  'Piracy',
  'Bounty Hunting',
  'Mercenary',
  'Industrial',
  'Medical',
  'Science',
  'Transport',
  'Security',
] as const;

// All valid tags combined
export const ALL_VALID_TAGS = [...VALID_PLAYSTYLE_TAGS, ...VALID_ACTIVITY_TAGS] as const;

export type ValidPlaystyleTag = typeof VALID_PLAYSTYLE_TAGS[number];
export type ValidActivityTag = typeof VALID_ACTIVITY_TAGS[number];
export type ValidTag = typeof ALL_VALID_TAGS[number];

/**
 * Validates that all tags in the array are valid playstyle tags
 */
export function validatePlaystyleTags(tags: string[]): { isValid: boolean; invalidTags: string[] } {
  const invalidTags = tags.filter(tag => !VALID_PLAYSTYLE_TAGS.includes(tag as ValidPlaystyleTag));
  return {
    isValid: invalidTags.length === 0,
    invalidTags,
  };
}

/**
 * Validates that all tags in the array are valid activity tags
 */
export function validateActivityTags(tags: string[]): { isValid: boolean; invalidTags: string[] } {
  const invalidTags = tags.filter(tag => !VALID_ACTIVITY_TAGS.includes(tag as ValidActivityTag));
  return {
    isValid: invalidTags.length === 0,
    invalidTags,
  };
}

/**
 * Validates that all tags in the array are valid (either playstyle or activity)
 */
export function validateTags(tags: string[]): { isValid: boolean; invalidTags: string[] } {
  const invalidTags = tags.filter(tag => !ALL_VALID_TAGS.includes(tag as ValidTag));
  return {
    isValid: invalidTags.length === 0,
    invalidTags,
  };
}

/**
 * Gets a user-friendly error message for invalid tags
 */
export function getTagValidationErrorMessage(invalidTags: string[], tagType: 'playstyle' | 'activity' | 'general'): string {
  const validTags = tagType === 'playstyle' 
    ? VALID_PLAYSTYLE_TAGS 
    : tagType === 'activity' 
    ? VALID_ACTIVITY_TAGS 
    : ALL_VALID_TAGS;
    
  return `Invalid ${tagType} tags: ${invalidTags.join(', ')}. Valid ${tagType} tags are: ${validTags.join(', ')}`;
}