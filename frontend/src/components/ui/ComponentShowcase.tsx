import React, { useState } from 'react';
import {
  Chip,
  Paper,
  Sidebar,
  SidebarItem,
  SidebarSection,
  FilterGroup,
  Input,
  Switch,
  RadioGroup,
} from './index';
import {
  HomeIcon,
  UserGroupIcon,
  CalendarIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  StarIcon,
  FunnelIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

const ComponentShowcase: React.FC = () => {
  const [selectedChips, setSelectedChips] = useState<string[]>([
    'Combat',
    'English',
  ]);
  const [switchValue, setSwitchValue] = useState(false);
  const [radioValue, setRadioValue] = useState('option1');

  const handleChipToggle = (chip: string) => {
    setSelectedChips(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    );
  };

  const availableTags = [
    'Combat',
    'Trading',
    'Mining',
    'Exploration',
    'Piracy',
    'English',
    'German',
    'French',
    'Spanish',
    'Russian',
  ];

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Organizations', href: '/organizations', icon: BuildingOfficeIcon },
    { name: 'Events', href: '/events', icon: CalendarIcon },
    { name: 'Profile', href: '/profile', icon: UserGroupIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className='min-h-screen p-[var(--spacing-card-lg)]'>
      <div className='max-w-7xl mx-auto'>
        <h1 className='text-4xl font-bold text-primary mb-[var(--spacing-section)]'>
          Component Showcase
        </h1>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-[var(--gap-grid-lg)]'>
          {/* Main Content */}
          <div className='lg:col-span-2 space-y-[var(--spacing-section)]'>
            {/* Chip Components */}
            <Paper variant='glass-strong' size='lg'>
              <h2 className='text-2xl font-semibold text-primary mb-[var(--spacing-card-lg)]'>
                Chip Components
              </h2>

              <div className='space-y-[var(--spacing-card-lg)]'>
                <div>
                  <h3 className='text-lg font-semibold text-primary mb-[var(--spacing-tight)]'>
                    Filter Chips
                  </h3>
                  <div className='flex flex-wrap gap-2'>
                    {availableTags.map(tag => (
                      <Chip
                        key={tag}
                        variant={
                          selectedChips.includes(tag)
                            ? 'selected'
                            : 'interactive'
                        }
                        onClick={() => handleChipToggle(tag)}
                        size='md'
                      >
                        {tag}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className='text-lg font-semibold text-primary mb-[var(--spacing-tight)]'>
                    Status Chips
                  </h3>
                  <div className='flex flex-wrap gap-2'>
                    <Chip variant='status' size='sm'>
                      Active
                    </Chip>
                    <Chip variant='status' size='sm'>
                      Pending
                    </Chip>
                    <Chip variant='status' size='sm'>
                      Completed
                    </Chip>
                  </div>
                </div>

                <div>
                  <h3 className='text-lg font-semibold text-primary mb-[var(--spacing-tight)]'>
                    Removable Chips
                  </h3>
                  <div className='flex flex-wrap gap-2'>
                    {selectedChips.map(tag => (
                      <Chip
                        key={tag}
                        variant='selected'
                        removable
                        onRemove={() => handleChipToggle(tag)}
                        size='md'
                      >
                        {tag}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            </Paper>

            {/* Filter Groups */}
            <Paper variant='glass-strong' size='lg'>
              <h2 className='text-2xl font-semibold text-primary mb-[var(--spacing-card-lg)]'>
                Filter Groups
              </h2>

              <div className='space-y-[var(--spacing-card-lg)]'>
                <FilterGroup
                  title='Playstyle'
                  icon={<TagIcon className='w-4 h-4' />}
                  description='Select your preferred playstyle'
                >
                  <div className='grid grid-cols-2 gap-2'>
                    {['Combat', 'Trading', 'Mining', 'Exploration'].map(tag => (
                      <Chip
                        key={tag}
                        variant={
                          selectedChips.includes(tag)
                            ? 'selected'
                            : 'interactive'
                        }
                        onClick={() => handleChipToggle(tag)}
                        size='sm'
                      >
                        {tag}
                      </Chip>
                    ))}
                  </div>
                </FilterGroup>

                <FilterGroup
                  title='Language'
                  icon={<StarIcon className='w-4 h-4' />}
                  description='Choose your preferred language'
                  variant='collapsible'
                >
                  <div className='grid grid-cols-2 gap-2'>
                    {['English', 'German', 'French', 'Spanish'].map(tag => (
                      <Chip
                        key={tag}
                        variant={
                          selectedChips.includes(tag)
                            ? 'selected'
                            : 'interactive'
                        }
                        onClick={() => handleChipToggle(tag)}
                        size='sm'
                      >
                        {tag}
                      </Chip>
                    ))}
                  </div>
                </FilterGroup>
              </div>
            </Paper>

            {/* Form Elements */}
            <Paper variant='glass' size='lg'>
              <h2 className='text-2xl font-semibold text-white mb-6'>
                Form Elements
              </h2>

              <div className='space-y-4'>
                <Input
                  label='Search'
                  value=''
                  placeholder='Search organizations...'
                  onChange={value => console.log(value)}
                />

                <div className='flex items-center space-x-4'>
                  <Switch
                    enabled={switchValue}
                    checked={switchValue}
                    onChange={setSwitchValue}
                    label='Enable notifications'
                  />

                  <Switch
                    enabled={!switchValue}
                    checked={!switchValue}
                    onChange={() => setSwitchValue(!switchValue)}
                    label='Dark mode'
                  />
                </div>

                <RadioGroup
                  label='Select an option'
                  options={[
                    { value: 'option1', label: 'Option 1' },
                    { value: 'option2', label: 'Option 2' },
                    { value: 'option3', label: 'Option 3' },
                  ]}
                  value={radioValue}
                  onChange={setRadioValue}
                />

                <RadioGroup
                  label='Card-style options'
                  description='Choose your preferred play style'
                  variant='cards'
                  options={[
                    {
                      value: 'casual',
                      label: 'Casual',
                      description: 'Relaxed gameplay, no pressure',
                    },
                    {
                      value: 'competitive',
                      label: 'Competitive',
                      description: 'Focused on winning and improvement',
                    },
                    {
                      value: 'hardcore',
                      label: 'Hardcore',
                      description: 'Maximum challenge and dedication',
                    },
                  ]}
                  value={radioValue}
                  onChange={setRadioValue}
                />

                <RadioGroup
                  label='Button-style options'
                  variant='buttons'
                  size='sm'
                  options={[
                    { value: 'small', label: 'Small' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'large', label: 'Large' },
                  ]}
                  value={radioValue}
                  onChange={setRadioValue}
                />
              </div>
            </Paper>
          </div>

          {/* Sidebar */}
          <div>
            <Sidebar>
              <div className='p-6'>
                <SidebarSection
                  title='Navigation'
                  description='Main navigation items'
                >
                  {navigation.map(item => (
                    <SidebarItem
                      key={item.name}
                      href={item.href}
                      icon={<item.icon />}
                    >
                      {item.name}
                    </SidebarItem>
                  ))}
                </SidebarSection>

                <SidebarSection title='Quick Actions'>
                  <SidebarItem
                    icon={<StarIcon />}
                    onClick={() => console.log('Favorites clicked')}
                  >
                    Favorites
                  </SidebarItem>
                  <SidebarItem
                    icon={<FunnelIcon />}
                    onClick={() => console.log('Filters clicked')}
                  >
                    Filters
                  </SidebarItem>
                </SidebarSection>

                <SidebarSection title='Recent'>
                  <SidebarItem variant='nested' href='/organizations/1'>
                    Galactic Security Force
                  </SidebarItem>
                  <SidebarItem variant='nested' href='/events/1'>
                    Stanton Security Patrol
                  </SidebarItem>
                </SidebarSection>
              </div>
            </Sidebar>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentShowcase;
