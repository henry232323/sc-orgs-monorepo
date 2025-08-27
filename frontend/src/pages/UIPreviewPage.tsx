import React, { useState } from 'react';
import {
  Button,
  Input,
  Textarea,
  Paper,
  Chip,
  Dialog,
  ConfirmationDialog,
  Tabs,
  Listbox,
  Switch,
  ToggleSwitch,
  Dropdown,
  Sidebar,
  SidebarItem,
  SidebarSection,
  FilterGroup,
  TagInput,
  TimePicker,
  DatePicker,
  DateTimePicker,
  SettingsCard,
  RadioGroup,
  DiscordLoginButton,
  MarkdownEditor,
  ViewToggle,
  EventViewToggle,
  ListCalendarToggle,
  CustomViewToggle,
  UpvoteButton,
  CalendarDropdown,
  LimitedMarkdown,
  FullMarkdown,
  Checkbox,
  PageTitle,
  PageSubtitle,
  SectionTitle,
  SectionSubtitle,
  PaperTitle,
  PaperSubtitle,
  ComponentTitle,
  ComponentSubtitle,
  StatLarge,
  StatMedium,
  StatSmall,
  Caption,
  PageContainer,
} from '../components/ui';

const UIPreviewPage: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [selectedChips, setSelectedChips] = useState<string[]>([
    'Combat',
    'English',
  ]);
  const [switchValue, setSwitchValue] = useState(false);
  const [toggleValue, setToggleValue] = useState(true);
  const [radioValue, setRadioValue] = useState('option1');
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Star Citizen',
    'Gaming',
  ]);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDateTime, setSelectedDateTime] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedListItem, setSelectedListItem] = useState('');
  const [viewMode, setViewMode] = useState<
    'list' | 'calendar' | 'grid' | 'card'
  >('list');

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

  const dropdownOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  const listboxOptions = [
    { id: '1', name: 'First Item', description: 'Description for first item' },
    {
      id: '2',
      name: 'Second Item',
      description: 'Description for second item',
    },
    { id: '3', name: 'Third Item', description: 'Description for third item' },
  ];

  const handleChipToggle = (chip: string) => {
    setSelectedChips(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    );
  };

  const markdownContent = `
# Markdown Example

This is a **bold** text and this is *italic*.

## Code Block
\`\`\`javascript
const example = "Hello World";
console.log(example);
\`\`\`

## List
- Item 1
- Item 2
- Item 3

[Link example](https://example.com)
  `;

  return (
    <PageContainer>
      <div className='min-h-screen p-6 bg-background'>
        <div className='max-w-7xl mx-auto space-y-8'>
          {/* Header */}
          <div className='text-center'>
            <PageTitle>UI Components Preview</PageTitle>
            <PageSubtitle>
              Debug preview of all exported UI components
            </PageSubtitle>
          </div>

          {/* Typography Components */}
          <Paper variant='glass-strong' size='lg'>
            <SectionTitle>Typography Components</SectionTitle>
            <div className='space-y-4'>
              <div>
                <ComponentTitle>PageTitle</ComponentTitle>
                <ComponentSubtitle>
                  Used for main page headings
                </ComponentSubtitle>
                <PageTitle>This is a Page Title</PageTitle>
              </div>

              <div>
                <ComponentTitle>PageSubtitle</ComponentTitle>
                <ComponentSubtitle>Used for page subtitles</ComponentSubtitle>
                <PageSubtitle>
                  This is a page subtitle with more descriptive text
                </PageSubtitle>
              </div>

              <div>
                <ComponentTitle>SectionTitle</ComponentTitle>
                <SectionTitle>This is a Section Title</SectionTitle>
              </div>

              <div>
                <ComponentTitle>SectionSubtitle</ComponentTitle>
                <SectionSubtitle>This is a section subtitle</SectionSubtitle>
              </div>

              <div>
                <ComponentTitle>PaperTitle & PaperSubtitle</ComponentTitle>
                <PaperTitle>Paper Title</PaperTitle>
                <PaperSubtitle>Paper subtitle for card headers</PaperSubtitle>
              </div>

              <div>
                <ComponentTitle>
                  ComponentTitle & ComponentSubtitle
                </ComponentTitle>
                <ComponentTitle>Component Title</ComponentTitle>
                <ComponentSubtitle>
                  Component subtitle for component documentation
                </ComponentSubtitle>
              </div>

              <div>
                <ComponentTitle>Stat Components</ComponentTitle>
                <div className='flex gap-4'>
                  <StatLarge>1,234</StatLarge>
                  <StatMedium>567</StatMedium>
                  <StatSmall>89</StatSmall>
                </div>
              </div>

              <div>
                <ComponentTitle>Caption</ComponentTitle>
                <Caption>
                  This is a caption for additional context or metadata
                </Caption>
              </div>

              <div>
                <ComponentTitle>Typography Components</ComponentTitle>
                <p className='text-2xl font-bold text-primary'>H1 Typography</p>
                <p className='text-xl font-semibold text-primary'>
                  H2 Typography
                </p>
                <p className='text-lg font-medium text-primary'>
                  H3 Typography
                </p>
                <p className='text-base text-primary'>Body text typography</p>
                <p className='text-sm text-secondary'>Caption typography</p>
              </div>
            </div>
          </Paper>

          {/* Button Components */}
          <Paper variant='glass-strong' size='lg'>
            <SectionTitle>Button Components</SectionTitle>
            <div className='space-y-6'>
              <div>
                <ComponentTitle>Button Variants</ComponentTitle>
                <div className='flex flex-wrap gap-3'>
                  <Button variant='primary'>Primary</Button>
                  <Button variant='secondary'>Secondary</Button>
                  <Button variant='danger'>Danger</Button>
                  <Button variant='ghost'>Ghost</Button>
                  <Button variant='outline'>Outline</Button>
                  <Button variant='text'>Text</Button>
                  <Button variant='glass'>Glass</Button>
                </div>
              </div>

              <div>
                <ComponentTitle>Button Sizes</ComponentTitle>
                <div className='flex items-center gap-3'>
                  <Button size='sm'>Small</Button>
                  <Button size='md'>Medium</Button>
                  <Button size='lg'>Large</Button>
                </div>
              </div>

              <div>
                <ComponentTitle>Button States</ComponentTitle>
                <div className='flex gap-3'>
                  <Button>Normal</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>

              <div>
                <ComponentTitle>Discord Login Button</ComponentTitle>
                <DiscordLoginButton
                  onClick={() => console.log('Discord login clicked')}
                />
              </div>
            </div>
          </Paper>

          {/* Form Components */}
          <Paper variant='glass-strong' size='lg'>
            <SectionTitle>Form Components</SectionTitle>
            <div className='space-y-6'>
              <div>
                <ComponentTitle>Input Component</ComponentTitle>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <Input
                    label='Text Input'
                    value={inputValue}
                    onChange={setInputValue}
                    placeholder='Enter text...'
                  />
                  <Input
                    label='Email Input'
                    type='email'
                    value={inputValue}
                    onChange={setInputValue}
                    placeholder='Enter email...'
                  />
                  <Input
                    label='Search Input'
                    type='search'
                    value={inputValue}
                    onChange={setInputValue}
                    placeholder='Search...'
                  />
                  <Input
                    label='Input with Error'
                    value={inputValue}
                    onChange={setInputValue}
                    error='This field is required'
                    placeholder='Required field...'
                  />
                </div>
              </div>

              <div>
                <ComponentTitle>Textarea Component</ComponentTitle>
                <Textarea
                  label='Description'
                  value={textareaValue}
                  onChange={setTextareaValue}
                  placeholder='Enter description...'
                  rows={4}
                />
              </div>

              <div>
                <ComponentTitle>Checkbox Component</ComponentTitle>
                <Checkbox
                  checked={checkboxValue}
                  onChange={setCheckboxValue}
                  label='Accept terms and conditions'
                />
              </div>

              <div>
                <ComponentTitle>Switch Components</ComponentTitle>
                <div className='space-y-4'>
                  <Switch
                    enabled={switchValue}
                    checked={switchValue}
                    onChange={setSwitchValue}
                    label='Enable notifications'
                  />
                  <ToggleSwitch
                    checked={toggleValue}
                    onChange={() => setToggleValue(!toggleValue)}
                    label='Dark mode'
                  />
                </div>
              </div>

              <div>
                <ComponentTitle>RadioGroup Component</ComponentTitle>
                <div className='space-y-4'>
                  <RadioGroup
                    label='Select an option'
                    options={dropdownOptions}
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
                        description: 'Relaxed gameplay',
                      },
                      {
                        value: 'competitive',
                        label: 'Competitive',
                        description: 'Focused on winning',
                      },
                      {
                        value: 'hardcore',
                        label: 'Hardcore',
                        description: 'Maximum challenge',
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
              </div>
            </div>
          </Paper>

          {/* Selection Components */}
          <Paper variant='glass-strong' size='lg'>
            <SectionTitle>Selection Components</SectionTitle>
            <div className='space-y-6'>
              <div>
                <ComponentTitle>Dropdown Component</ComponentTitle>
                <Dropdown
                  options={dropdownOptions}
                  value={selectedOption}
                  onChange={setSelectedOption}
                  placeholder='Choose an option...'
                />
              </div>

              <div>
                <ComponentTitle>Listbox Component</ComponentTitle>
                <Listbox
                  options={listboxOptions.map(item => ({
                    id: item.id,
                    label: item.name,
                    description: item.description || '',
                  }))}
                  selected={
                    listboxOptions.find(item => item.id === selectedListItem)
                      ? {
                          id: selectedListItem,
                          label:
                            listboxOptions.find(
                              item => item.id === selectedListItem
                            )?.name || '',
                          description:
                            listboxOptions.find(
                              item => item.id === selectedListItem
                            )?.description || '',
                        }
                      : null
                  }
                  onChange={option => setSelectedListItem(option?.id as string || '')}
                  placeholder='Select an item...'
                />
              </div>

              <div>
                <ComponentTitle>TagInput Component</ComponentTitle>
                <TagInput
                  value={selectedTags}
                  onChange={setSelectedTags}
                  placeholder='Add tags...'
                  suggestions={availableTags}
                />
              </div>
            </div>
          </Paper>

          {/* Date & Time Components */}
          <Paper variant='glass-strong' size='lg'>
            <SectionTitle>Date & Time Components</SectionTitle>
            <div className='space-y-6'>
              <div>
                <ComponentTitle>TimePicker Component</ComponentTitle>
                <TimePicker
                  label='Select Time'
                  value={selectedTime}
                  onChange={setSelectedTime}
                />
              </div>

              <div>
                <ComponentTitle>DatePicker Component</ComponentTitle>
                <DatePicker
                  label='Select Date'
                  value={selectedDate}
                  onChange={setSelectedDate}
                />
              </div>

              <div>
                <ComponentTitle>DateTimePicker Component</ComponentTitle>
                <DateTimePicker
                  label='Select Date & Time'
                  value={selectedDateTime}
                  onChange={setSelectedDateTime}
                />
              </div>

              <div>
                <ComponentTitle>CalendarDropdown Component</ComponentTitle>
                <CalendarDropdown
                  event={{
                    title: 'Sample Event',
                    startTime: new Date(),
                    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
                    description: 'This is a sample event for testing',
                    location: 'Test Location',
                  }}
                />
              </div>
            </div>
          </Paper>

          {/* Chip Components */}
          <Paper variant='glass-strong' size='lg'>
            <SectionTitle>Chip Components</SectionTitle>
            <div className='space-y-6'>
              <div>
                <ComponentTitle>Interactive Chips</ComponentTitle>
                <div className='flex flex-wrap gap-2'>
                  {availableTags.slice(0, 6).map(tag => (
                    <Chip
                      key={tag}
                      variant={
                        selectedChips.includes(tag) ? 'selected' : 'interactive'
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
                <ComponentTitle>Status Chips</ComponentTitle>
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
                  <Chip variant='status' size='sm'>
                    Cancelled
                  </Chip>
                </div>
              </div>

              <div>
                <ComponentTitle>Removable Chips</ComponentTitle>
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

          {/* View Toggle Components */}
          <Paper variant='glass-strong' size='lg'>
            <SectionTitle>View Toggle Components</SectionTitle>
            <div className='space-y-6'>
              <div>
                <ComponentTitle>ViewToggle</ComponentTitle>
                <ViewToggle value={viewMode} onChange={setViewMode} />
              </div>

              <div>
                <ComponentTitle>EventViewToggle</ComponentTitle>
                <EventViewToggle
                  value={viewMode === 'list' ? 'list' : 'calendar'}
                  onChange={mode => setViewMode(mode)}
                />
              </div>

              <div>
                <ComponentTitle>ListCalendarToggle</ComponentTitle>
                <ListCalendarToggle
                  value={viewMode === 'list' ? 'list' : 'calendar'}
                  onChange={mode => setViewMode(mode)}
                />
              </div>

              <div>
                <ComponentTitle>CustomViewToggle</ComponentTitle>
                <CustomViewToggle value={viewMode} onChange={setViewMode} />
              </div>
            </div>
          </Paper>

          {/* Interactive Components */}
          <Paper variant='glass-strong' size='lg'>
            <SectionTitle>Interactive Components</SectionTitle>
            <div className='space-y-6'>
              <div>
                <ComponentTitle>UpvoteButton</ComponentTitle>
                <div className='flex gap-4'>
                  <UpvoteButton spectrumId='test-org-1' currentUpvotes={42} />
                  <UpvoteButton spectrumId='test-org-2' currentUpvotes={15} />
                </div>
              </div>

              <div>
                <ComponentTitle>Tabs Component</ComponentTitle>
                <Tabs
                  tabs={[
                    {
                      id: 'tab1',
                      label: 'Tab 1',
                      content: <div>Content for Tab 1</div>,
                    },
                    {
                      id: 'tab2',
                      label: 'Tab 2',
                      content: <div>Content for Tab 2</div>,
                    },
                    {
                      id: 'tab3',
                      label: 'Tab 3',
                      content: <div>Content for Tab 3</div>,
                    },
                  ]}
                  defaultIndex={0}
                  onChange={index =>
                    console.log(`Tab changed to: ${index + 1}`)
                  }
                />
              </div>

              <div>
                <ComponentTitle>FilterGroup Component</ComponentTitle>
                <FilterGroup
                  title='Playstyle'
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
              </div>
            </div>
          </Paper>

          {/* Dialog Components */}
          <Paper variant='glass-strong' size='lg'>
            <SectionTitle>Dialog Components</SectionTitle>
            <div className='space-y-4'>
              <div>
                <ComponentTitle>Dialog & ConfirmationDialog</ComponentTitle>
                <div className='flex gap-3'>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    Open Dialog
                  </Button>
                  <Button onClick={() => setIsConfirmOpen(true)}>
                    Open Confirmation
                  </Button>
                </div>
              </div>
            </div>
          </Paper>

          {/* Markdown Components */}
          <Paper variant='glass-strong' size='lg'>
            <SectionTitle>Markdown Components</SectionTitle>
            <div className='space-y-6'>
              <div>
                <ComponentTitle>MarkdownEditor</ComponentTitle>
                <MarkdownEditor
                  value={markdownContent}
                  onChange={value => console.log('Markdown changed:', value)}
                  placeholder='Write your markdown here...'
                />
              </div>

              <div>
                <ComponentTitle>LimitedMarkdown</ComponentTitle>
                <LimitedMarkdown content={markdownContent} />
              </div>

              <div>
                <ComponentTitle>FullMarkdown</ComponentTitle>
                <FullMarkdown content={markdownContent} />
              </div>
            </div>
          </Paper>

          {/* Layout Components */}
          <Paper variant='glass-strong' size='lg'>
            <SectionTitle>Layout Components</SectionTitle>
            <div className='space-y-6'>
              <div>
                <ComponentTitle>Sidebar Components</ComponentTitle>
                <div className='flex gap-4'>
                  <div className='w-64'>
                    <Sidebar>
                      <SidebarSection title='Navigation'>
                        <SidebarItem href='/dashboard'>Dashboard</SidebarItem>
                        <SidebarItem href='/organizations'>
                          Organizations
                        </SidebarItem>
                        <SidebarItem href='/events'>Events</SidebarItem>
                      </SidebarSection>
                      <SidebarSection title='Quick Actions'>
                        <SidebarItem
                          onClick={() => console.log('Favorites clicked')}
                        >
                          Favorites
                        </SidebarItem>
                      </SidebarSection>
                    </Sidebar>
                  </div>
                </div>
              </div>

              <div>
                <ComponentTitle>SettingsCard Component</ComponentTitle>
                <SettingsCard
                  title='Notification Settings'
                  icon={({ className }) => (
                    <div className={`w-5 h-5 ${className}`}>🔔</div>
                  )}
                >
                  <div className='space-y-4'>
                    <Switch
                      enabled={switchValue}
                      checked={switchValue}
                      onChange={setSwitchValue}
                      label='Email notifications'
                    />
                    <Switch
                      enabled={!switchValue}
                      checked={!switchValue}
                      onChange={() => setSwitchValue(!switchValue)}
                      label='Push notifications'
                    />
                  </div>
                </SettingsCard>
              </div>
            </div>
          </Paper>

          {/* Paper Variants */}
          <Paper variant='glass-strong' size='lg'>
            <SectionTitle>Paper Component Variants</SectionTitle>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Paper variant='glass' size='md'>
                <ComponentTitle>Glass Variant</ComponentTitle>
                <ComponentSubtitle>Standard glass effect</ComponentSubtitle>
              </Paper>
              <Paper variant='glass-strong' size='md'>
                <ComponentTitle>Glass Strong Variant</ComponentTitle>
                <ComponentSubtitle>Stronger glass effect</ComponentSubtitle>
              </Paper>
            </div>
          </Paper>
        </div>

        {/* Dialog Components */}
        <Dialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title='Sample Dialog'
        >
          <div className='space-y-4'>
            <p>This is a sample dialog with some content.</p>
            <div className='flex justify-end gap-3'>
              <Button variant='ghost' onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>Confirm</Button>
            </div>
          </div>
        </Dialog>

        <ConfirmationDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={() => setIsConfirmOpen(false)}
          title='Confirm Action'
          message='Are you sure you want to perform this action?'
        />
      </div>
    </PageContainer>
  );
};

export default UIPreviewPage;
