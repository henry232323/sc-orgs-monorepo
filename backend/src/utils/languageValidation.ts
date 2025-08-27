/**
 * Language validation utilities
 * Common languages supported by Star Citizen organizations
 */

// Supported languages - based on common languages in gaming communities
export const VALID_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Chinese',
  'Japanese',
  'Korean',
  'Dutch',
  'Swedish',
  'Norwegian',
  'Danish',
  'Finnish',
  'Polish',
  'Czech',
  'Hungarian',
  'Romanian',
  'Bulgarian',
  'Croatian',
  'Serbian',
  'Slovak',
  'Slovenian',
  'Greek',
  'Turkish',
  'Arabic',
  'Hebrew',
  'Hindi',
  'Thai',
  'Vietnamese',
  'Indonesian',
  'Malay',
  'Tagalog',
  'Ukrainian',
  'Belarusian',
  'Lithuanian',
  'Latvian',
  'Estonian',
  'Icelandic',
  'Irish',
  'Welsh',
  'Scottish Gaelic',
  'Catalan',
  'Basque',
  'Galician',
  'Maltese',
  'Luxembourgish',
  'Albanian',
  'Macedonian',
  'Bosnian',
  'Montenegrin',
  'Moldovan',
  'Georgian',
  'Armenian',
  'Azerbaijani',
  'Kazakh',
  'Kyrgyz',
  'Tajik',
  'Turkmen',
  'Uzbek',
  'Mongolian',
  'Tibetan',
  'Nepali',
  'Sinhala',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Gujarati',
  'Punjabi',
  'Bengali',
  'Marathi',
  'Urdu',
  'Persian',
  'Pashto',
  'Dari',
  'Kurdish',
  'Swahili',
  'Amharic',
  'Yoruba',
  'Igbo',
  'Hausa',
  'Zulu',
  'Afrikaans',
  'Esperanto'
] as const;

export type ValidLanguage = typeof VALID_LANGUAGES[number];

/**
 * Validates that all languages in the array are valid
 */
export function validateLanguages(languages: string[]): { isValid: boolean; invalidLanguages: string[] } {
  const invalidLanguages = languages.filter(lang => !VALID_LANGUAGES.includes(lang as ValidLanguage));
  return {
    isValid: invalidLanguages.length === 0,
    invalidLanguages,
  };
}

/**
 * Gets a user-friendly error message for invalid languages
 */
export function getLanguageValidationErrorMessage(invalidLanguages: string[]): string {
  return `Invalid languages: ${invalidLanguages.join(', ')}. Valid languages are: ${VALID_LANGUAGES.slice(0, 20).join(', ')}${VALID_LANGUAGES.length > 20 ? ' and more...' : ''}`;
}

/**
 * Gets a subset of common languages for UI dropdowns
 */
export function getCommonLanguages(): ValidLanguage[] {
  return [
    'English',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Russian',
    'Chinese',
    'Japanese',
    'Korean',
    'Dutch',
    'Swedish',
    'Norwegian',
    'Danish',
    'Finnish',
    'Polish',
    'Arabic',
    'Hindi',
    'Thai',
    'Vietnamese'
  ];
}
