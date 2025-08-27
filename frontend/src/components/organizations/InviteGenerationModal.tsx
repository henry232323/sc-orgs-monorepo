import React, { useState } from 'react';
import { Button, Dialog, DateTimePicker, Dropdown, Input } from '../ui';
import { useGetOrganizationRolesQuery } from '../../services/apiSlice';

interface InviteGenerationModalProps {
  isOpen: boolean;
  spectrumId: string;
  onGenerate: (role_id: string, maxUses?: number, expiresAt?: string) => void;
  onCancel: () => void;
}

const InviteGenerationModal: React.FC<InviteGenerationModalProps> = ({
  isOpen,
  spectrumId,
  onGenerate,
  onCancel,
}) => {
  const [role_id, setRoleId] = useState<string>('');
  const [maxUses, setMaxUses] = useState<number | undefined>(undefined);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch organization roles
  const { data: roles, isLoading: rolesLoading } = useGetOrganizationRolesQuery(spectrumId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      await onGenerate(role_id, maxUses || undefined, expiresAt || undefined);
    } finally {
      setIsGenerating(false);
    }
  };

  // Create role options from fetched roles (only editable roles)
  const roleOptions = roles?.filter(role => role.is_editable).map(role => ({
    value: role.id,
    label: role.name,
    description: role.description || `${role.name} role`,
  })) || [];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      title='Generate Invite Code'
      size='md'
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-element)',
        }}
      >
        {/* Role Selection */}
        <div>
          <label
            className='block text-sm font-medium text-secondary'
            style={{ marginBottom: 'var(--spacing-tight)' }}
          >
            Role
          </label>
          <Dropdown
            value={role_id}
            onChange={setRoleId}
            options={roleOptions}
            placeholder={rolesLoading ? 'Loading roles...' : 'Select role for new members'}
            className='w-full'
            disabled={rolesLoading}
          />
        </div>

        {/* Max Uses */}
        <div>
          <Input
            type='text'
            label='Max Uses (optional)'
            value={maxUses?.toString() || ''}
            onChange={value => setMaxUses(value ? parseInt(value) : undefined)}
            placeholder='Unlimited'
          />
          <p
            className='text-xs text-tertiary'
            style={{ marginTop: 'var(--spacing-tight)' }}
          >
            Leave empty for unlimited uses
          </p>
        </div>

        {/* Expiration Date */}
        <div>
          <DateTimePicker
            label='Expires At (optional)'
            value={expiresAt}
            onChange={setExpiresAt}
            placeholder='Select expiration date and time'
          />
          <p
            className='text-xs text-tertiary'
            style={{ marginTop: 'var(--spacing-tight)' }}
          >
            Leave empty for no expiration
          </p>
        </div>

        {/* Action Buttons */}
        <div
          className='flex justify-end'
          style={{
            gap: 'var(--spacing-element)',
            paddingTop: 'var(--spacing-element)',
          }}
        >
          <Button type='button' onClick={onCancel} variant='outline'>
            Cancel
          </Button>
          <Button type='submit' variant='primary' disabled={isGenerating || !role_id || rolesLoading}>
            {isGenerating ? 'Generating...' : 'Generate Code'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default InviteGenerationModal;
