import React from 'react';
import {
  glassPresets,
  buildGlassClass,
  buildStatusClass,
  layouts,
  glassComponents,
} from '../../utils/theme';
import { Paper, Button } from '../ui';
import {
  SparklesIcon,
  HeartIcon,
  StarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

/**
 * Theme Showcase Component
 *
 * Demonstrates the new SC-Orgs design system and theme variables.
 * This component serves as both documentation and testing for the theme system.
 */
const ThemeShowcase: React.FC = () => {
  return (
    <div className={layouts.pageContainer}>
      <div className={layouts.sectionContainer}>
        {/* Header */}
        <div className='text-center mb-[var(--spacing-section)]'>
          <h1 className='text-5xl font-bold text-primary mb-4'>
            🎨 SC-Orgs Design System
          </h1>
          <p className='text-secondary text-xl max-w-3xl mx-auto'>
            Explore the new theme system with consistent glass morphism effects,
            semantic colors, and standardized spacing throughout the
            application.
          </p>
        </div>

        {/* Glass Morphism Variants */}
        <div className={layouts.componentContainer}>
          <h2 className='text-3xl font-bold text-primary mb-[var(--spacing-component)]'>
            ✨ Glass Morphism Effects
          </h2>

          <div className={layouts.cardGrid}>
            <div className={glassPresets.subtle}>
              <div className='flex items-center mb-4'>
                <SparklesIcon className='w-6 h-6 text-[var(--color-accent-blue)] mr-2' />
                <h3 className='text-lg font-semibold text-primary'>
                  Subtle Glass
                </h3>
              </div>
              <p className='text-secondary'>
                Minimal glass effect with light blur and subtle shadows. Perfect
                for background elements.
              </p>
              <div className='mt-4 px-3 py-2 bg-glass rounded-lg'>
                <code className='text-tertiary text-sm'>glass-subtle</code>
              </div>
            </div>

            <div className={glassPresets.default}>
              <div className='flex items-center mb-4'>
                <HeartIcon className='w-6 h-6 text-[var(--color-accent-purple)] mr-2' />
                <h3 className='text-lg font-semibold text-primary'>
                  Default Glass
                </h3>
              </div>
              <p className='text-secondary'>
                Standard glass effect with medium blur and balanced shadows. The
                most commonly used variant.
              </p>
              <div className='mt-4 px-3 py-2 bg-glass rounded-lg'>
                <code className='text-tertiary text-sm'>glass</code>
              </div>
            </div>

            <div className={glassPresets.strong}>
              <div className='flex items-center mb-4'>
                <StarIcon className='w-6 h-6 text-[var(--color-warning)] mr-2' />
                <h3 className='text-lg font-semibold text-primary'>
                  Strong Glass
                </h3>
              </div>
              <p className='text-secondary'>
                Pronounced glass effect with strong blur and prominent shadows.
                Great for important content areas.
              </p>
              <div className='mt-4 px-3 py-2 bg-glass rounded-lg'>
                <code className='text-tertiary text-sm'>glass-strong</code>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Glass */}
        <div className={layouts.componentContainer}>
          <h2 className='text-3xl font-bold text-primary mb-[var(--spacing-component)]'>
            🎯 Interactive Glass Elements
          </h2>

          <div className='grid gap-[var(--gap-grid-md)] grid-cols-1 md:grid-cols-2'>
            <div className={buildGlassClass('default', true)}>
              <h3 className='text-lg font-semibold text-primary mb-3'>
                Interactive Glass Card
              </h3>
              <p className='text-secondary mb-4'>
                Hover over this card to see the interactive glass effect in
                action. The background becomes more opaque and the border
                brightens.
              </p>
              <div className='flex gap-2'>
                <Button variant='glass' size='sm'>
                  Glass Button
                </Button>
                <Button variant='outline' size='sm'>
                  Outline
                </Button>
              </div>
            </div>

            <div className={glassComponents.statsCard}>
              <div className='text-center'>
                <div className='text-4xl font-bold text-primary mb-2'>
                  1,234
                </div>
                <div className='text-secondary text-sm'>Active Users</div>
                <div className='mt-4'>
                  <span className='text-success text-xs'>
                    ↗ +12% this month
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Colors */}
        <div className={layouts.componentContainer}>
          <h2 className='text-3xl font-bold text-primary mb-[var(--spacing-component)]'>
            🎨 Status Color System
          </h2>

          <div className={layouts.cardGrid}>
            <div className={buildStatusClass('success', ['bg', 'border'])}>
              <div className='flex items-center mb-3'>
                <CheckCircleIcon className='w-6 h-6 text-success mr-2' />
                <h3 className='text-lg font-semibold text-success'>Success</h3>
              </div>
              <p className='text-secondary'>
                Used for positive actions, confirmations, and successful
                operations.
              </p>
            </div>

            <div className={buildStatusClass('warning', ['bg', 'border'])}>
              <div className='flex items-center mb-3'>
                <ExclamationTriangleIcon className='w-6 h-6 text-warning mr-2' />
                <h3 className='text-lg font-semibold text-warning'>Warning</h3>
              </div>
              <p className='text-secondary'>
                Used for cautions, important notices, and actions that need
                attention.
              </p>
            </div>

            <div className={buildStatusClass('error', ['bg', 'border'])}>
              <div className='flex items-center mb-3'>
                <XCircleIcon className='w-6 h-6 text-error mr-2' />
                <h3 className='text-lg font-semibold text-error'>Error</h3>
              </div>
              <p className='text-secondary'>
                Used for errors, failures, and destructive actions.
              </p>
            </div>

            <div className={buildStatusClass('info', ['bg', 'border'])}>
              <div className='flex items-center mb-3'>
                <InformationCircleIcon className='w-6 h-6 text-info mr-2' />
                <h3 className='text-lg font-semibold text-info'>Info</h3>
              </div>
              <p className='text-secondary'>
                Used for informational messages, tips, and neutral
                notifications.
              </p>
            </div>
          </div>
        </div>

        {/* Component Presets */}
        <div className={layouts.componentContainer}>
          <h2 className='text-3xl font-bold text-primary mb-[var(--spacing-component)]'>
            🧩 Component Presets
          </h2>

          <div className='space-y-[var(--spacing-component)]'>
            {/* Hero Card */}
            <div className={glassComponents.heroCard}>
              <h3 className='text-2xl font-bold text-primary mb-4'>
                Hero Card
              </h3>
              <p className='text-secondary text-lg mb-6'>
                A prominent card design perfect for hero sections, important
                announcements, or featured content areas.
              </p>
              <div className='flex gap-4'>
                <Button variant='primary' size='lg'>
                  Get Started
                </Button>
                <Button variant='glass' size='lg'>
                  Learn More
                </Button>
              </div>
            </div>

            {/* Content Cards */}
            <div className='grid gap-[var(--gap-grid-md)] grid-cols-1 md:grid-cols-2'>
              <div className={glassComponents.contentCard}>
                <h4 className='text-lg font-semibold text-primary mb-3'>
                  Content Card
                </h4>
                <p className='text-secondary'>
                  Standard content cards with consistent padding, borders, and
                  glass effects. Perfect for articles, product cards, or any
                  content blocks.
                </p>
              </div>

              <div className={glassComponents.contentCard}>
                <h4 className='text-lg font-semibold text-primary mb-3'>
                  Consistent Styling
                </h4>
                <p className='text-secondary'>
                  All cards use the same design tokens, ensuring visual
                  consistency across the entire application.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Button Variants */}
        <div className={layouts.componentContainer}>
          <h2 className='text-3xl font-bold text-primary mb-[var(--spacing-component)]'>
            🎛️ Button Variants
          </h2>

          <Paper variant='glass' size='lg'>
            <div className='grid gap-6 grid-cols-1 md:grid-cols-2'>
              <div>
                <h4 className='text-lg font-semibold text-primary mb-4'>
                  Primary Actions
                </h4>
                <div className='space-y-3'>
                  <div className='flex gap-3'>
                    <Button variant='primary' size='sm'>
                      Small
                    </Button>
                    <Button variant='primary' size='md'>
                      Medium
                    </Button>
                    <Button variant='primary' size='lg'>
                      Large
                    </Button>
                  </div>
                  <div className='flex gap-3'>
                    <Button variant='glass' size='sm'>
                      Glass
                    </Button>
                    <Button variant='glass' size='md'>
                      Glass
                    </Button>
                    <Button variant='glass' size='lg'>
                      Glass
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <h4 className='text-lg font-semibold text-primary mb-4'>
                  Secondary Actions
                </h4>
                <div className='space-y-3'>
                  <div className='flex gap-3'>
                    <Button variant='outline' size='sm'>
                      Outline
                    </Button>
                    <Button variant='outline' size='md'>
                      Outline
                    </Button>
                    <Button variant='outline' size='lg'>
                      Outline
                    </Button>
                  </div>
                  <div className='flex gap-3'>
                    <Button variant='ghost' size='sm'>
                      Ghost
                    </Button>
                    <Button variant='ghost' size='md'>
                      Ghost
                    </Button>
                    <Button variant='ghost' size='lg'>
                      Ghost
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Paper>
        </div>

        {/* Typography & Spacing */}
        <div className={layouts.componentContainer}>
          <h2 className='text-3xl font-bold text-primary mb-[var(--spacing-component)]'>
            📝 Typography & Spacing
          </h2>

          <Paper variant='glass-strong' size='xl'>
            <div className='space-y-6'>
              <div>
                <h3 className='text-2xl font-bold text-primary mb-2'>
                  Text Hierarchy
                </h3>
                <h4 className='text-xl font-semibold text-primary mb-2'>
                  Primary Text
                </h4>
                <p className='text-secondary mb-2'>
                  Secondary text for descriptions and supporting information.
                </p>
                <p className='text-tertiary mb-2'>
                  Tertiary text for less important details and metadata.
                </p>
                <p className='text-muted'>
                  Muted text for subtle information and placeholders.
                </p>
              </div>

              <div className='border-t border-glass pt-6'>
                <h4 className='text-lg font-semibold text-primary mb-4'>
                  Spacing System
                </h4>
                <div className='space-y-4'>
                  <div className='bg-glass-elevated p-[var(--spacing-card-sm)] rounded-lg'>
                    <code className='text-tertiary text-sm'>
                      Small spacing (12px)
                    </code>
                  </div>
                  <div className='bg-glass-elevated p-[var(--spacing-card-md)] rounded-lg'>
                    <code className='text-tertiary text-sm'>
                      Medium spacing (16px)
                    </code>
                  </div>
                  <div className='bg-glass-elevated p-[var(--spacing-card-lg)] rounded-lg'>
                    <code className='text-tertiary text-sm'>
                      Large spacing (24px)
                    </code>
                  </div>
                  <div className='bg-glass-elevated p-[var(--spacing-card-xl)] rounded-lg'>
                    <code className='text-tertiary text-sm'>
                      Extra large spacing (32px)
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </Paper>
        </div>

        {/* Code Examples */}
        <div className={layouts.componentContainer}>
          <h2 className='text-3xl font-bold text-primary mb-[var(--spacing-component)]'>
            💻 Usage Examples
          </h2>

          <Paper variant='glass' size='lg'>
            <h4 className='text-lg font-semibold text-primary mb-4'>
              Quick Start
            </h4>
            <div className='space-y-4'>
              <div className='bg-gray-900/50 p-4 rounded-lg border border-glass'>
                <pre className='text-sm text-tertiary overflow-x-auto'>
                  {`// Import theme utilities
import { glassPresets, buildGlassClass, colors } from '../utils/theme';

// Use glass presets
<div className={glassPresets.elevated}>
  Elevated glass content
</div>

// Build custom glass classes
<div className={buildGlassClass('default', true, 'rounded-xl')}>
  Interactive glass with custom styling
</div>

// Use semantic colors
<h1 className={colors.text.primary}>Primary heading</h1>
<p className={colors.text.secondary}>Secondary text</p>`}
                </pre>
              </div>

              <div className='flex gap-3'>
                <Button variant='glass' size='sm'>
                  View Documentation
                </Button>
                <Button variant='outline' size='sm'>
                  See More Examples
                </Button>
              </div>
            </div>
          </Paper>
        </div>
      </div>
    </div>
  );
};

export default ThemeShowcase;
