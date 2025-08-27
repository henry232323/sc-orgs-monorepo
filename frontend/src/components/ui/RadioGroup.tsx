import {
  RadioGroup as HeadlessRadioGroup,
  Radio,
  Field,
  Label,
  Description,
} from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface RadioOption<T> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps<T> {
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  name?: string;
  label?: string;
  description?: string;
  variant?: 'default' | 'cards' | 'buttons';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RadioGroup = <T extends string | number | boolean>({
  options,
  value,
  onChange,
  name,
  label,
  description,
  variant = 'default',
  size = 'md',
  className = '',
}: RadioGroupProps<T>) => {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  const variantClasses = {
    default: {
      option:
        'flex items-center gap-3 p-3 rounded-[var(--radius-glass-md)] border border-glass hover:bg-glass-hover transition-all duration-[var(--duration-normal)]',
      radio:
        'group flex size-4 items-center justify-center rounded-full border border-glass-hover bg-glass data-checked:bg-brand-secondary data-checked:border-brand-secondary',
      dot: 'invisible size-2.5 rounded-full bg-white group-data-checked:visible',
    },
    cards: {
      option:
        'group relative flex cursor-pointer rounded-[var(--radius-paper)] bg-glass-elevated border border-glass-border transition-all duration-[var(--duration-normal)] hover:bg-glass-hover data-checked:bg-glass-hover data-checked:border-brand-secondary shadow-[var(--shadow-glass-sm)]',
      radio: 'hidden',
      dot: 'size-6 fill-brand-secondary opacity-0 transition-opacity duration-[var(--duration-normal)] group-data-checked:opacity-100',
    },
    buttons: {
      option:
        'glass-button flex items-center justify-center px-4 py-2 rounded-[var(--radius-glass-sm)] border border-glass hover:bg-glass-hover transition-all duration-[var(--duration-normal)] cursor-pointer data-checked:bg-brand-secondary data-checked:border-brand-secondary data-checked:text-primary',
      radio: 'hidden',
      dot: 'hidden',
    },
  };

  const currentVariant = variantClasses[variant];

  return (
    <div className={`space-y-[var(--spacing-tight)] ${className}`}>
      <HeadlessRadioGroup
        value={value}
        onChange={onChange}
        {...(name ? { name } : {})}
      >
        {label && (
          <Label className='text-sm font-semibold text-primary'>{label}</Label>
        )}

        {description && (
          <Description className='text-sm text-tertiary'>
            {description}
          </Description>
        )}
        <div
          className={
            variant === 'buttons'
              ? 'flex flex-wrap gap-[var(--spacing-tight)]'
              : 'space-y-[var(--spacing-tight)]'
          }
        >
          {options.map(option => (
            <Field
              key={String(option.value)}
              disabled={option.disabled || false}
            >
              <Radio
                value={option.value}
                disabled={option.disabled || false}
                className={({ checked, disabled }) => `
                  ${currentVariant.option}
                  ${checked ? 'ring-2 ring-brand-secondary ring-opacity-50' : ''}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${sizeClasses[size]}
                `}
              >
                {variant === 'buttons' ? (
                  <Label className='font-medium cursor-pointer text-primary'>
                    {option.label}
                  </Label>
                ) : variant === 'cards' ? (
                  <div
                    className='flex w-full items-center justify-between'
                    style={{ padding: 'var(--spacing-tight)' }}
                  >
                    <div>
                      <Label className='font-semibold text-primary cursor-pointer'>
                        {option.label}
                      </Label>
                      {option.description && (
                        <Description
                          className='text-sm text-tertiary'
                          style={{ marginTop: 'var(--spacing-tight)' }}
                        >
                          {option.description}
                        </Description>
                      )}
                    </div>
                    <div className='relative'>
                      {/* Empty circle for unselected */}
                      <div className='size-6 rounded-full border-2 border-glass-border bg-transparent transition-opacity duration-[var(--duration-normal)] group-data-checked:opacity-0'></div>
                      {/* Check icon for selected */}
                      <CheckCircleIcon className='absolute inset-0 size-6 fill-brand-secondary opacity-0 transition-opacity duration-[var(--duration-normal)] group-data-checked:opacity-100' />
                    </div>
                  </div>
                ) : (
                  <div className='flex items-center gap-3'>
                    <div className={currentVariant.radio}>
                      <span className={currentVariant.dot} />
                    </div>

                    <div className='flex-1'>
                      <Label className='font-medium text-primary cursor-pointer'>
                        {option.label}
                      </Label>
                      {option.description && (
                        <Description className='text-sm text-tertiary mt-1'>
                          {option.description}
                        </Description>
                      )}
                    </div>
                  </div>
                )}
              </Radio>
            </Field>
          ))}
        </div>
      </HeadlessRadioGroup>
    </div>
  );
};

export default RadioGroup;
