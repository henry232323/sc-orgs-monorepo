export type TagCategory = {
  title: string;
  tags: string[];
};

export enum TagType {
  LANGUAGES = 'languages',
  PLAYSTYLE = 'playstyle',
  ACTIVITY = 'activity',
}

import { getSortedLanguageOptions } from '../../utils/languageMapping';

export const SEARCH_TAGS: Record<TagType, TagCategory> = {
  [TagType.LANGUAGES]: {
    title: 'Language Tags',
    tags: getSortedLanguageOptions().map(option => option.label),
  },
  [TagType.PLAYSTYLE]: {
    title: 'Play Style Tags',
    tags: [
      'Casual',
      'Hardcore',
      'Roleplay',
      'Competitive',
      'Social',
      'Military',
    ],
  },
  [TagType.ACTIVITY]: {
    title: 'Activity Tags',
    tags: [
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
    ],
  },
} as const;

export * from './TagManager.tsx';
