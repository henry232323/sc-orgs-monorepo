import React, { useState } from 'react';
import { Button, Input, TagInput } from '../ui';
import { useUpdateOrganizationMutation } from '../../services/apiSlice';
import { Organization } from '../../types/organization';
import { MarkdownEditor } from '../ui';
import {
  getSortedLanguageOptions,
  convertCodesToNames,
  convertNamesToCodes,
} from '../../utils/languageMapping';
import { SEARCH_TAGS, TagType } from '../tags';

interface OrganizationEditProps {
  organization: Organization;
  onUpdate: () => void;
}

const OrganizationEdit: React.FC<OrganizationEditProps> = ({
  organization,
  onUpdate,
}) => {
  const [updateOrganization, { isLoading: isUpdating }] =
    useUpdateOrganizationMutation();
  const [formData, setFormData] = useState({
    name: organization.name || '',
    headline: organization.headline || '',
    description: organization.description || '',
    icon_url: organization.icon_url || '',
    banner_url: organization.banner_url || '',
    website: organization.website || '',
    discord: organization.discord || '',
    location: organization.location || '',
    languages: Array.isArray(organization.languages)
      ? convertCodesToNames(organization.languages)
      : organization.languages
        ? [organization.languages]
        : ['English'],
    playstyle_tags: organization.playstyle_tags || [],
    focus_tags: organization.focus_tags || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Convert languages names to codes for backend
      const formDataWithCodes = {
        ...formData,
        languages: convertNamesToCodes(formData.languages),
      };

      await updateOrganization({
        rsi_org_id: organization.rsi_org_id,
        data: formDataWithCodes,
      }).unwrap();

      onUpdate();
    } catch (error) {
      console.error('Failed to update organization:', error);
    }
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Available tags for suggestions - using standardized tags from TagManager
  const playstyleTags = SEARCH_TAGS[TagType.PLAYSTYLE].tags;
  const activityTags = SEARCH_TAGS[TagType.ACTIVITY].tags;

  // Available languages options
  const languagesOptions = getSortedLanguageOptions();

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-lg font-medium text-primary'>Edit Organization</h2>
        <p className='text-sm text-tertiary'>
          Update your organization's information and settings
        </p>
      </div>

      <form onSubmit={handleSubmit} className='space-y-6'>
        <div>
          <label className='block text-sm font-medium text-secondary mb-2'>
            Organization Name
          </label>
          <Input
            type='text'
            value={formData.name}
            onChange={value => handleInputChange('name', value)}
            required
            placeholder='Enter organization name'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-secondary mb-2'>
            Headline
          </label>
          <Input
            type='text'
            value={formData.headline}
            onChange={value => handleInputChange('headline', value)}
            placeholder='Enter organization headline'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-secondary mb-2'>
            Description
          </label>
          <MarkdownEditor
            value={formData.description}
            onChange={value => handleInputChange('description', value || '')}
            preview='edit'
            height={200}
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-secondary mb-2'>
            Icon URL
          </label>
          <Input
            type='url'
            value={formData.icon_url}
            onChange={value => handleInputChange('icon_url', value)}
            placeholder='https://example.com/icon.png'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-secondary mb-2'>
            Banner URL
          </label>
          <Input
            type='url'
            value={formData.banner_url}
            onChange={value => handleInputChange('banner_url', value)}
            placeholder='https://example.com/banner.png'
          />
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <label className='block text-sm font-medium text-secondary mb-2'>
              Website (Optional)
            </label>
            <Input
              type='url'
              value={formData.website}
              onChange={value => handleInputChange('website', value)}
              placeholder='https://example.com'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-secondary mb-2'>
              Discord Server (Optional)
            </label>
            <Input
              type='url'
              value={formData.discord}
              onChange={value => handleInputChange('discord', value)}
              placeholder='https://discord.gg/invite-code'
            />
          </div>
        </div>

        <div>
          <label className='block text-sm font-medium text-secondary mb-2'>
            Location (Optional)
          </label>
          <Input
            type='text'
            value={formData.location}
            onChange={value => handleInputChange('location', value)}
            placeholder='e.g., Stanton System, Terra'
          />
        </div>

        {/* Language Section */}
        <div>
          <label className='block text-sm font-medium text-secondary mb-2'>
            Supported Languages
          </label>
          <TagInput
            value={formData.languages}
            onChange={languagess => handleInputChange('languages', languagess)}
            suggestions={languagesOptions.map(option => option.label)}
            placeholder='Add supported languagess (e.g., English, German, French)'
            maxTags={10}
          />
          <p className='mt-1 text-xs text-white/50'>
            Select all languagess your organization supports for communication
          </p>
        </div>

        {/* Tags Section */}
        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-secondary mb-2'>
              Playstyle Tags
            </label>
            <TagInput
              value={formData.playstyle_tags}
              onChange={tags => handleInputChange('playstyle_tags', tags)}
              suggestions={playstyleTags}
              placeholder='Add playstyle tags (e.g., Casual, Hardcore, Roleplay)'
              maxTags={15}
            />
            <p className='mt-1 text-xs text-white/50'>
              How your organization prefers to play (e.g., Casual, Hardcore, Roleplay, Competitive, Social, Military)
            </p>
          </div>

          <div>
            <label className='block text-sm font-medium text-secondary mb-2'>
              Focus Tags
            </label>
            <TagInput
              value={formData.focus_tags}
              onChange={tags => handleInputChange('focus_tags', tags)}
              suggestions={activityTags}
              placeholder='Add focus tags (e.g., Combat, Trading, Mining)'
              maxTags={15}
            />
            <p className='mt-1 text-xs text-white/50'>
              Primary activities and areas of focus (e.g., Combat, Trading, Mining, Exploration, Piracy, Bounty Hunting, Mercenary, Industrial, Medical, Science, Transport, Security)
            </p>
          </div>
        </div>

        <div className='flex justify-end space-x-3 pt-4'>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              // Reset form data
              setFormData({
                name: organization.name || '',
                headline: organization.headline || '',
                description: organization.description || '',
                icon_url: organization.icon_url || '',
                banner_url: organization.banner_url || '',
                website: organization.website || '',
                discord: organization.discord || '',
                location: organization.location || '',
                languages: Array.isArray(organization.languages)
                  ? convertCodesToNames(organization.languages)
                  : organization.languages
                    ? [organization.languages]
                    : ['English'],
                playstyle_tags: organization.playstyle_tags || [],
                focus_tags: organization.focus_tags || [],
              });
            }}
          >
            Reset
          </Button>
          <Button type='submit' variant='primary' disabled={isUpdating}>
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OrganizationEdit;
