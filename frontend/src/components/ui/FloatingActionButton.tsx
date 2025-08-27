import { useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import {
  CheckIcon,
  SunIcon,
  MoonIcon,
  SparklesIcon,
  RocketLaunchIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';

export type BackgroundTheme =
  | 'gray'
  | 'dark'
  | 'cyberpunk'
  | 'natural'
  | 'space';

interface ThemeOption {
  id: BackgroundTheme;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  gradient: string;
}

const themeOptions: ThemeOption[] = [
  {
    id: 'gray',
    name: 'Space Gray',
    description: 'A sleek gray',
    icon: SparklesIcon,
    gradient:
      'linear-gradient(to bottom right, rgb(17 24 39), rgb(31 41 55), rgb(0 0 0))',
  },
  {
    id: 'dark',
    name: 'Pure Dark',
    description: 'Deep black with subtle light accents',
    icon: MoonIcon,
    gradient:
      'linear-gradient(to bottom right, rgb(0 0 0), rgb(10 10 10), rgb(20 20 20))',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Dark with vibrant neon lights',
    icon: LightBulbIcon,
    gradient:
      'linear-gradient(45deg, rgba(138, 43, 226, 0.8), rgba(0, 184, 255, 0.8), rgba(214, 0, 255, 0.8), rgba(0, 255, 159, 0.8))',
  },
  {
    id: 'natural',
    name: 'Forest Theme',
    description: 'Beautiful forest landscape background',
    icon: SunIcon,
    gradient:
      'linear-gradient(45deg, rgba(34, 139, 34, 0.8), rgba(0, 100, 0, 0.8), rgba(0, 128, 0, 0.8))',
  },
  {
    id: 'space',
    name: 'Space Theme',
    description: 'Stunning cosmic space background',
    icon: RocketLaunchIcon,
    gradient:
      'linear-gradient(45deg, rgba(138, 43, 226, 0.8), rgba(30, 144, 255, 0.8), rgba(255, 20, 147, 0.8))',
  },
];

interface FloatingActionButtonProps {
  currentTheme: BackgroundTheme;
  onThemeChange: (theme: BackgroundTheme) => void;
}

const FloatingActionButton = ({
  currentTheme,
  onThemeChange,
}: FloatingActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const currentThemeOption =
    themeOptions.find(option => option.id === currentTheme) || themeOptions[0];
  const CurrentIcon = currentThemeOption!.icon;

  const handleThemeChange = (theme: BackgroundTheme) => {
    onThemeChange(theme);
    setIsOpen(false);
  };

  return (
    <div className='fixed bottom-6 right-6 z-50'>
      <Listbox value={currentTheme} onChange={handleThemeChange}>
        <div className='relative'>
          {/* Main FAB Button */}
          <Listbox.Button
            onClick={() => setIsOpen(!isOpen)}
            className={`
              glass-elevated glass-interactive
              flex items-center justify-center
              w-14 h-14 rounded-full
              shadow-[var(--shadow-glass-lg)]
              hover:shadow-[var(--shadow-glass-xl)]
              transition-all duration-[var(--duration-normal)]
              ${isOpen ? 'scale-110' : 'scale-100'}
            `}
          >
            <CurrentIcon className='w-6 h-6 text-primary' />
          </Listbox.Button>

          {/* Dropdown Menu */}
          <Transition
            show={isOpen}
            enter='transition duration-200 ease-out'
            enterFrom='transform scale-95 opacity-0 translate-y-2'
            enterTo='transform scale-100 opacity-100 translate-y-0'
            leave='transition duration-150 ease-in'
            leaveFrom='transform scale-100 opacity-100 translate-y-0'
            leaveTo='transform scale-95 opacity-0 translate-y-2'
          >
            <Listbox.Options className='absolute bottom-16 right-0 w-64 glass-elevated rounded-[var(--radius-paper)] p-2 shadow-[var(--shadow-glass-xl)] border border-glass'>
              <div className='space-y-1'>
                <div className='px-3 py-2 text-xs font-semibold text-tertiary uppercase tracking-wide'>
                  Choose Background
                </div>
                {themeOptions.map(option => {
                  const Icon = option.icon;
                  const isSelected = option.id === currentTheme;

                  return (
                    <Listbox.Option
                      key={option.id}
                      value={option.id}
                      className={({ active }) => `
                        relative cursor-pointer select-none py-3 px-3 rounded-[var(--radius-glass-sm)]
                        transition-all duration-[var(--duration-fast)]
                        ${active ? 'bg-glass-hover' : ''}
                        ${isSelected ? 'bg-brand-secondary-bg border border-brand-secondary' : ''}
                      `}
                    >
                      {({ selected }) => (
                        <div className='flex items-center gap-3'>
                          {/* Theme Preview */}
                          <div
                            className='w-8 h-8 rounded-full border border-glass flex-shrink-0'
                            style={{ background: option.gradient }}
                          />

                          {/* Theme Info */}
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-2'>
                              <Icon className='w-4 h-4 text-primary flex-shrink-0' />
                              <span
                                className={`text-sm font-medium ${selected ? 'text-primary' : 'text-primary'}`}
                              >
                                {option.name}
                              </span>
                              {selected && (
                                <CheckIcon className='w-4 h-4 text-brand-secondary flex-shrink-0' />
                              )}
                            </div>
                            <p className='text-xs text-tertiary mt-0.5'>
                              {option.description}
                            </p>
                          </div>
                        </div>
                      )}
                    </Listbox.Option>
                  );
                })}
              </div>
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
};

export default FloatingActionButton;
