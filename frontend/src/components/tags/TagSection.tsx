import { type TagCategory, TagType } from '@/components/tags/index.ts';
import React from 'react';
import { Chip } from '@/components/ui';

interface TagSectionProps {
  tagType: TagType;
  tagCategory: TagCategory;
  selectedTags: string[]; // Receive selected tags from parent
  onTagToggle: (tag: string) => void; // Handle individual tag toggle
}

const TagSection: React.FC<TagSectionProps> = ({
  tagType,
  tagCategory,
  selectedTags,
  onTagToggle,
}: TagSectionProps) => {
  const { title, tags } = tagCategory;

  return (
    <div key={tagType} className='space-y-3 mb-6'>
      <h4 className='text-sm font-semibold text-white/80 flex items-center'>
        {title}
      </h4>
      <div className='flex flex-wrap gap-2'>
        {tags.map(tag => (
          <Chip
            key={tag}
            variant={selectedTags.includes(tag) ? 'selected' : 'interactive'}
            onClick={() => onTagToggle(tag)}
            size='sm'
          >
            {tag}
          </Chip>
        ))}
      </div>
    </div>
  );
};

export default TagSection;
