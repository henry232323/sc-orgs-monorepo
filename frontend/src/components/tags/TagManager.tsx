import React from 'react';
import { TagType, SEARCH_TAGS } from '@/components/tags/index.ts';
import { FilterGroup } from '@/components/ui';
import { TagIcon } from '@heroicons/react/24/outline';
import TagSection from './TagSection';

interface TagProps {
  description: string;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

const TagManager: React.FC<TagProps> = ({
  description,
  selectedTags,
  onTagsChange,
}: TagProps) => {
  const handleTagToggle = (tag: string) => {
    const newSelectedTags: string[] = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];

    onTagsChange(newSelectedTags);
  };

  return (
    <FilterGroup
      title={'Filter by Tags'}
      icon={<TagIcon />}
      description={description}
    >
      {Object.entries(SEARCH_TAGS).map(([tagType, tagCategory]) => (
        <TagSection
          key={tagType}
          tagType={tagType as TagType}
          tagCategory={tagCategory}
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
        />
      ))}
    </FilterGroup>
  );
};

export default TagManager;
