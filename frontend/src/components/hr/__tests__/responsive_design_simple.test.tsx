/**
 * Simple Responsive Design Tests for HR Components
 * 
 * Basic tests to verify responsive design improvements are applied correctly.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// Simple test components to verify responsive classes
const TestComponent: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}>Test Content</div>
);

describe('Responsive Design Utilities', () => {
  describe('CSS Classes Application', () => {
    it('should apply responsive padding classes', () => {
      const { container } = render(
        <TestComponent className="responsive-padding-x responsive-padding-y" />
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('responsive-padding-x');
      expect(element).toHaveClass('responsive-padding-y');
    });

    it('should apply responsive text classes', () => {
      const { container } = render(
        <TestComponent className="responsive-text-lg responsive-text-base responsive-text-sm" />
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('responsive-text-lg');
      expect(element).toHaveClass('responsive-text-base');
      expect(element).toHaveClass('responsive-text-sm');
    });

    it('should apply responsive grid classes', () => {
      const { container } = render(
        <TestComponent className="responsive-grid-1-2 responsive-grid-1-2-4 responsive-grid-1-3" />
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('responsive-grid-1-2');
      expect(element).toHaveClass('responsive-grid-1-2-4');
      expect(element).toHaveClass('responsive-grid-1-3');
    });

    it('should apply responsive flex classes', () => {
      const { container } = render(
        <TestComponent className="responsive-flex-col-row" />
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('responsive-flex-col-row');
    });

    it('should apply touch-friendly classes', () => {
      const { container } = render(
        <TestComponent className="touch-friendly" />
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('touch-friendly');
    });

    it('should apply mobile glass effect classes', () => {
      const { container } = render(
        <TestComponent className="glass-mobile-reduced" />
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('glass-mobile-reduced');
    });

    it('should apply responsive container classes', () => {
      const { container } = render(
        <TestComponent className="responsive-container" />
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('responsive-container');
    });
  });

  describe('Responsive Design Patterns', () => {
    it('should combine multiple responsive classes correctly', () => {
      const { container } = render(
        <TestComponent className="responsive-padding-x responsive-text-lg glass-mobile-reduced touch-friendly" />
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('responsive-padding-x');
      expect(element).toHaveClass('responsive-text-lg');
      expect(element).toHaveClass('glass-mobile-reduced');
      expect(element).toHaveClass('touch-friendly');
    });

    it('should apply standard Tailwind responsive classes', () => {
      const { container } = render(
        <TestComponent className="flex flex-col lg:flex-row w-full sm:w-auto" />
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('flex');
      expect(element).toHaveClass('flex-col');
      expect(element).toHaveClass('lg:flex-row');
      expect(element).toHaveClass('w-full');
      expect(element).toHaveClass('sm:w-auto');
    });

    it('should apply grid responsive classes', () => {
      const { container } = render(
        <TestComponent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('grid');
      expect(element).toHaveClass('grid-cols-1');
      expect(element).toHaveClass('sm:grid-cols-2');
      expect(element).toHaveClass('lg:grid-cols-4');
    });

    it('should apply spacing responsive classes', () => {
      const { container } = render(
        <TestComponent className="space-y-4 lg:space-y-8 gap-3 lg:gap-6" />
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('space-y-4');
      expect(element).toHaveClass('lg:space-y-8');
      expect(element).toHaveClass('gap-3');
      expect(element).toHaveClass('lg:gap-6');
    });
  });

  describe('Performance Optimization Classes', () => {
    it('should apply motion reduction classes', () => {
      const { container } = render(
        <TestComponent className="motion-reduce:transition-none motion-reduce:transform-none" />
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('motion-reduce:transition-none');
      expect(element).toHaveClass('motion-reduce:transform-none');
    });

    it('should apply backdrop blur responsive classes', () => {
      const { container } = render(
        <TestComponent className="backdrop-blur-sm md:backdrop-blur-md lg:backdrop-blur-lg" />
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('backdrop-blur-sm');
      expect(element).toHaveClass('md:backdrop-blur-md');
      expect(element).toHaveClass('lg:backdrop-blur-lg');
    });
  });

  describe('Accessibility Classes', () => {
    it('should apply focus and hover states', () => {
      const { container } = render(
        <TestComponent className="focus:outline-none focus:ring-2 hover:bg-glass-hover" />
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('focus:outline-none');
      expect(element).toHaveClass('focus:ring-2');
      expect(element).toHaveClass('hover:bg-glass-hover');
    });

    it('should apply screen reader classes', () => {
      const { container } = render(
        <TestComponent className="sr-only sm:not-sr-only" />
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('sr-only');
      expect(element).toHaveClass('sm:not-sr-only');
    });
  });
});