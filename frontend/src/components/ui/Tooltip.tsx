import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  delay = 500,
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    if (disabled || !triggerRef.current) return;

    timeoutRef.current = setTimeout(() => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;

      let x = 0;
      let y = 0;

      switch (placement) {
        case 'top':
          x = rect.left + scrollX + rect.width / 2;
          y = rect.top + scrollY - 8;
          break;
        case 'bottom':
          x = rect.left + scrollX + rect.width / 2;
          y = rect.bottom + scrollY + 8;
          break;
        case 'left':
          x = rect.left + scrollX - 8;
          y = rect.top + scrollY + rect.height / 2;
          break;
        case 'right':
          x = rect.right + scrollX + 8;
          y = rect.top + scrollY + rect.height / 2;
          break;
      }

      setPosition({ x, y });
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getTooltipClasses = () => {
    const baseClasses =
      'absolute z-50 px-3 py-2 text-xs font-medium text-white bg-gray-900 dark:bg-gray-800 rounded-[var(--radius-sm)] shadow-lg pointer-events-none transition-opacity duration-[var(--duration-normal)] backdrop-blur-sm';

    switch (placement) {
      case 'top':
        return `${baseClasses} -translate-x-1/2 -translate-y-full`;
      case 'bottom':
        return `${baseClasses} -translate-x-1/2`;
      case 'left':
        return `${baseClasses} -translate-x-full -translate-y-1/2`;
      case 'right':
        return `${baseClasses} -translate-y-1/2`;
      default:
        return baseClasses;
    }
  };

  const getArrowClasses = () => {
    const baseClasses =
      'absolute w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45';

    switch (placement) {
      case 'top':
        return `${baseClasses} bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2`;
      case 'bottom':
        return `${baseClasses} top-0 left-1/2 -translate-x-1/2 -translate-y-1/2`;
      case 'left':
        return `${baseClasses} right-0 top-1/2 -translate-y-1/2 translate-x-1/2`;
      case 'right':
        return `${baseClasses} left-0 top-1/2 -translate-y-1/2 -translate-x-1/2`;
      default:
        return baseClasses;
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className='inline-block'
      >
        {children}
      </div>

      {isVisible &&
        !disabled &&
        createPortal(
          <div
            className='fixed inset-0 pointer-events-none'
            style={{ zIndex: 9999 }}
          >
            <div
              className={getTooltipClasses()}
              style={{
                left: position.x,
                top: position.y,
              }}
            >
              {content}
              <div className={getArrowClasses()} />
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default Tooltip;
