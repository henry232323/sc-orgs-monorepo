# 🎨 SC-Orgs Design System & Theme Guide

This comprehensive guide covers the new design system and theming approach for the SC-Orgs application, built on [Tailwind CSS theme variables](https://tailwindcss.com/docs/theme).

## 📋 Table of Contents

1. [Overview](#overview)
2. [Theme Variables](#theme-variables)
3. [Glass Morphism System](#glass-morphism-system)
4. [Color System](#color-system)
5. [Spacing & Layout](#spacing--layout)
6. [Component Usage](#component-usage)
7. [Migration Guide](#migration-guide)
8. [Best Practices](#best-practices)

## 🎯 Overview

The SC-Orgs design system provides a consistent, maintainable theming approach using Tailwind CSS theme variables. This system ensures:

- **Consistency** - All components use the same design tokens
- **Maintainability** - Changes to theme variables update the entire app
- **Performance** - CSS variables enable efficient runtime theming
- **Developer Experience** - Intuitive utilities and presets

### Key Features

- **Glass Morphism Effects** - Consistent backdrop blur, shadows, and transparency
- **Semantic Color System** - Meaningful color tokens for different contexts
- **Responsive Design** - Mobile-optimized glass effects and spacing
- **Interactive States** - Standardized hover, focus, and active states
- **Component Presets** - Pre-built combinations for common patterns

## 🎨 Theme Variables

All theme variables are defined in `frontend/src/app.css` using Tailwind's `@theme` directive.

### Color Variables

```css
/* Background Gradients */
--color-bg-primary: linear-gradient(to bottom right, rgb(17 24 39), rgb(31 41 55), rgb(0 0 0));
--color-bg-secondary: linear-gradient(135deg, rgb(17 24 39) 0%, rgb(31 41 55) 50%, rgb(0 0 0) 100%);

/* Glass Morphism Colors */
--color-glass-bg: rgba(255 255 255 / 0.05);
--color-glass-bg-hover: rgba(255 255 255 / 0.1);
--color-glass-border: rgba(255 255 255 / 0.1);

/* Text Colors */
--color-text-primary: rgb(255 255 255);
--color-text-secondary: rgba(255 255 255 / 0.8);
```

### Spacing Variables

```css
/* Card & Container Spacing */
--spacing-card-sm: 0.75rem;     /* 12px */
--spacing-card-md: 1rem;        /* 16px */
--spacing-card-lg: 1.5rem;      /* 24px */
--spacing-card-xl: 2rem;        /* 32px */

/* Layout Spacing */
--spacing-section: 3rem;        /* 48px */
--spacing-component: 1.5rem;    /* 24px */
```

### Animation Variables

```css
/* Transition Durations */
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;

/* Interactive Scales */
--scale-hover: 1.02;
--scale-active: 0.98;
```

## ✨ Glass Morphism System

The glass morphism system provides consistent transparent, blurred backgrounds with proper shadows and borders.

### Glass Variants

```tsx
// Basic glass effects
<div className="glass">Default glass</div>
<div className="glass-subtle">Subtle glass</div>
<div className="glass-strong">Strong glass</div>
<div className="glass-elevated">Elevated glass</div>

// Interactive glass
<div className="glass glass-interactive">Interactive glass</div>
<button className="glass-button">Glass button</button>

// Card variations
<div className="glass-card">Default card</div>
<div className="glass-card-lg">Large card</div>
```

### Using Glass Presets

```tsx
import { glassPresets, buildGlassClass } from '../utils/theme';

// Using presets
<div className={glassPresets.elevated}>Elevated content</div>

// Building custom glass classes
<div className={buildGlassClass('default', true, 'rounded-xl')}>
  Interactive glass with custom styling
</div>
```

### Component Integration

```tsx
// Paper component with glass variants
<Paper variant="glass-strong" size="lg" interactive>
  Strong glass paper with interaction
</Paper>

// Button with glass styling
<Button variant="glass" size="md">
  Glass button
</Button>
```

## 🎨 Color System

### Text Colors

```tsx
<h1 className="text-primary">Primary heading</h1>
<p className="text-secondary">Secondary text</p>
<span className="text-muted">Muted text</span>
```

### Background Colors

```tsx
<div className="bg-glass">Glass background</div>
<div className="bg-glass-elevated">Elevated background</div>
```

### Status Colors

```tsx
import { buildStatusClass } from '../utils/theme';

// Using utility function
<div className={buildStatusClass('success', ['text', 'bg', 'border'])}>
  Success message
</div>

// Using individual classes
<span className="text-success bg-success border-success">
  Success badge
</span>
```

### Interactive States

```tsx
<button className="glass-button hover:bg-glass-hover focus:border-glass-focus">
  Interactive button
</button>
```

## 📐 Spacing & Layout

### Card Spacing

```tsx
// Using CSS variables in inline styles
<div style={{ padding: 'var(--spacing-card-lg)' }}>
  Large card padding
</div>

// Using utility classes
<div className="p-[var(--spacing-card-md)]">
  Medium card padding
</div>
```

### Layout Patterns

```tsx
import { layouts } from '../utils/theme';

// Pre-built layout patterns
<div className={layouts.cardGrid}>
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
</div>

<div className={layouts.pageContainer}>
  <div className={layouts.sectionContainer}>
    Page content
  </div>
</div>
```

### Grid Systems

```tsx
// Stats grid
<div className="grid gap-[var(--gap-grid-sm)] grid-cols-2 md:grid-cols-4">
  {stats.map(stat => (
    <div key={stat.id} className="glass-card text-center">
      {stat.content}
    </div>
  ))}
</div>
```

## 🧩 Component Usage

### Paper Component

```tsx
<Paper variant="glass-strong" size="xl" interactive>
  <h2>Card Title</h2>
  <p>Card content with strong glass effect</p>
</Paper>
```

### Button Component

```tsx
<Button variant="glass" size="lg">
  <Icon className="w-5 h-5" />
  Glass Button
</Button>
```

### Form Elements

```tsx
<input className="input-glass w-full" placeholder="Glass input" />
```

### Navigation

```tsx
<nav className="nav-glass">
  <div className="glass-button px-[var(--nav-item-padding)]">
    Nav Item
  </div>
</nav>
```

## 🔄 Migration Guide

### From Old System to New Theme Variables

#### Before (Old System)
```tsx
// Old hardcoded classes
<div className="bg-white/5 border-white/10 backdrop-blur-sm rounded-xl p-6">
  Content
</div>

// Old theme utility
import { themeColors } from '../utils/theme';
<div className={themeColors.primary.bg}>Content</div>
```

#### After (New Theme System)
```tsx
// New glass system
<div className="glass-card-lg">
  Content
</div>

// New theme utilities
import { glassPresets } from '../utils/theme';
<div className={glassPresets.cardLg}>Content</div>
```

### Component Migration

#### Paper Component
```tsx
// Before
<Paper variant="glass" size="lg" />

// After - same API, enhanced styling
<Paper variant="glass-strong" size="xl" />
```

#### Button Component
```tsx
// Before
<Button variant="secondary" />

// After - new glass variant
<Button variant="glass" />
```

### CSS Class Migration

| Old Classes | New Classes | Description |
|-------------|-------------|-------------|
| `bg-white/5 border-white/10 backdrop-blur-sm` | `glass` | Basic glass effect |
| `bg-white/10 hover:bg-white/15` | `glass glass-interactive` | Interactive glass |
| `p-6 rounded-xl` | `glass-card-lg` | Large glass card |
| `text-white/80` | `text-secondary` | Secondary text |
| `border-white/20` | `border-glass-hover` | Glass border |

## 🏆 Best Practices

### 1. Use Semantic Classes

```tsx
// ✅ Good - semantic meaning
<div className="text-primary">Main heading</div>
<div className="bg-glass-elevated">Important content</div>

// ❌ Avoid - hardcoded values
<div className="text-white">Main heading</div>
<div className="bg-white/10">Important content</div>
```

### 2. Leverage Component Presets

```tsx
// ✅ Good - use presets for common patterns
import { glassComponents } from '../utils/theme';

<div className={glassComponents.heroCard}>
  Hero content
</div>

// ❌ Avoid - rebuilding common patterns
<div className="glass-elevated rounded-xl p-8">
  Hero content
</div>
```

### 3. Build Reusable Patterns

```tsx
// ✅ Good - create reusable combinations
const cardClass = buildGlassClass('elevated', true, 'rounded-xl p-6');

// ❌ Avoid - repeating class combinations
const cardClass = "glass-elevated glass-interactive rounded-xl p-6";
```

### 4. Use Layout Utilities

```tsx
// ✅ Good - use layout presets
import { layouts } from '../utils/theme';

<div className={layouts.cardGrid}>
  {cards.map(card => <Card key={card.id} />)}
</div>

// ❌ Avoid - hardcoded grid classes
<div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {cards.map(card => <Card key={card.id} />)}
</div>
```

### 5. Responsive Considerations

```tsx
// ✅ Good - mobile-optimized glass effects
<div className={buildResponsiveGlass('strong', 'subtle')}>
  Content
</div>

// Consider reduced motion
<div className="glass-interactive">
  <!-- CSS handles prefers-reduced-motion automatically -->
</div>
```

### 6. Performance Tips

```tsx
// ✅ Good - use CSS variables for dynamic values
<div style={{ 
  padding: 'var(--spacing-card-lg)',
  borderRadius: 'var(--radius-glass-xl)' 
}}>
  Content
</div>

// ✅ Good - leverage utility classes for static styles
<div className="glass-card-xl">
  Content
</div>
```

## 🚀 Advanced Usage

### Custom Glass Effects

```tsx
// Create custom glass combinations
const customGlass = [
  glassPresets.strong,
  'rounded-2xl',
  'border-2',
  'shadow-2xl'
].join(' ');

<div className={customGlass}>
  Custom glass effect
</div>
```

### Dynamic Theming

```tsx
// Access CSS variables in JavaScript
import { getCSSVar } from '../utils/theme';

const cardPadding = getCSSVar('--spacing-card-lg');
const glassBlur = getCSSVar('--blur-glass-medium');
```

### Theme Extensions

```css
/* Add custom theme variables in app.css */
@theme {
  /* Custom brand colors */
  --color-brand-primary: rgb(59 130 246);
  --color-brand-secondary: rgb(147 51 234);
  
  /* Custom spacing */
  --spacing-hero: 6rem;
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Glass effects not appearing**
   - Ensure `backdrop-filter` is supported
   - Check for conflicting CSS
   - Verify proper HTML structure

2. **Inconsistent spacing**
   - Use theme variables instead of hardcoded values
   - Check responsive breakpoints

3. **Performance issues**
   - Use `will-change: transform` sparingly
   - Leverage CSS containment
   - Consider `prefers-reduced-motion`

### Browser Support

The glass morphism system requires:
- `backdrop-filter` support (modern browsers)
- CSS custom properties support
- CSS Grid and Flexbox support

For older browsers, graceful degradation is provided through fallback styles.

---

This theme system provides a robust foundation for consistent, maintainable styling across the SC-Orgs application. The combination of Tailwind's utility-first approach with semantic design tokens creates an optimal developer experience while ensuring visual consistency.
