/**
 * Language mapping utility for converting between locale codes and display names
 * This ensures consistency between frontend and backend language handling
 */

export interface LanguageOption {
  code: string; // ISO 639-1 language code (e.g., 'en', 'de', 'fr')
  name: string; // Display name (e.g., 'English', 'German', 'French')
  nativeName?: string; // Native name (e.g., 'Deutsch', 'Français')
}

/**
 * All supported languages with their ISO codes and display names
 * Backend accepts all of these languages
 */
export const ALL_SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
  { code: 'zu', name: 'Zulu', nativeName: 'IsiZulu' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan' },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskera' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
];

/**
 * Most popular languages for frontend display (limited to 10)
 * These are the languages shown in dropdowns and selection interfaces
 */
export const POPULAR_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

// Use popular languages for frontend interfaces
export const SUPPORTED_LANGUAGES = POPULAR_LANGUAGES;

/**
 * Create a lookup map from language code to language option (all languages for validation)
 */
export const LANGUAGE_CODE_MAP: Record<string, LanguageOption> =
  ALL_SUPPORTED_LANGUAGES.reduce(
    (acc, lang) => {
      acc[lang.code] = lang;
      return acc;
    },
    {} as Record<string, LanguageOption>
  );

/**
 * Create a lookup map from language name to language option (all languages for validation)
 */
export const LANGUAGE_NAME_MAP: Record<string, LanguageOption> =
  ALL_SUPPORTED_LANGUAGES.reduce(
    (acc, lang) => {
      acc[lang.name.toLowerCase()] = lang;
      return acc;
    },
    {} as Record<string, LanguageOption>
  );

/**
 * Convert language code to display name
 */
export function getLanguageName(code: string): string {
  const language = LANGUAGE_CODE_MAP[code];
  return language ? language.name : code;
}

/**
 * Convert language name to language code
 */
export function getLanguageCode(name: string): string {
  const language = LANGUAGE_NAME_MAP[name.toLowerCase()];
  return language ? language.code : name;
}

/**
 * Validate if a language code is supported
 */
export function isValidLanguageCode(code: string): boolean {
  return code in LANGUAGE_CODE_MAP;
}

/**
 * Validate if a language name is supported
 */
export function isValidLanguageName(name: string): boolean {
  return name.toLowerCase() in LANGUAGE_NAME_MAP;
}

/**
 * Get all supported language codes (from all languages for validation)
 */
export function getSupportedLanguageCodes(): string[] {
  return ALL_SUPPORTED_LANGUAGES.map(lang => lang.code);
}

/**
 * Get all supported language names (from all languages for validation)
 */
export function getSupportedLanguageNames(): string[] {
  return ALL_SUPPORTED_LANGUAGES.map(lang => lang.name);
}

/**
 * Get popular language codes (for frontend display)
 */
export function getPopularLanguageCodes(): string[] {
  return POPULAR_LANGUAGES.map(lang => lang.code);
}

/**
 * Get popular language names (for frontend display)
 */
export function getPopularLanguageNames(): string[] {
  return POPULAR_LANGUAGES.map(lang => lang.name);
}

/**
 * Convert array of language codes to language names
 */
export function convertCodesToNames(codes: string[]): string[] {
  return codes.map(code => getLanguageName(code));
}

/**
 * Convert array of language names to language codes
 */
export function convertNamesToCodes(names: string[]): string[] {
  return names.map(name => getLanguageCode(name));
}

/**
 * Get language options for dropdowns/selectors (popular languages only)
 */
export function getLanguageOptions(): Array<{
  value: string;
  label: string;
  nativeName?: string;
}> {
  return POPULAR_LANGUAGES.map(lang => {
    const result: { value: string; label: string; nativeName?: string } = {
      value: lang.code,
      label: lang.name,
    };
    if (lang.nativeName) {
      result.nativeName = lang.nativeName;
    }
    return result;
  });
}

/**
 * Sort languages alphabetically by display name (popular languages only)
 */
export function getSortedLanguageOptions(): Array<{
  value: string;
  label: string;
  nativeName?: string;
}> {
  return getLanguageOptions().sort((a, b) => a.label.localeCompare(b.label));
}
