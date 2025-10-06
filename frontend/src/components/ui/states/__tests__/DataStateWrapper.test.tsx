import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DataStateWrapper from '../DataStateWrapper';

describe('DataStateWrapper', () => {
  const mockData = { items: ['item1', 'item2', 'item3'] };
  const mockChildren = vi.fn((data) => <div>Data: {JSON.stringify(data)}</div>);

  beforeEach(() => {
    mockChildren.mockClear();
  });

  it('renders loading state when isLoading is true', () => {
    render(
      <DataStateWrapper
        isLoading={true}
        children={mockChildren}
        loadingProps={{
          title: 'Loading Data',
          description: 'Please wait...',
        }}
      />
    );
    
    expect(screen.getByText('Loading Data')).toBeInTheDocument();
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
    expect(mockChildren).not.toHaveBeenCalled();
  });

  it('renders error state when error exists and no data', () => {
    const mockRetry = vi.fn();
    const error = { message: 'Something went wrong' };
    
    render(
      <DataStateWrapper
        error={error}
        onRetry={mockRetry}
        children={mockChildren}
        errorProps={{
          title: 'Error Loading',
          description: 'Failed to load data',
        }}
      />
    );
    
    expect(screen.getByText('Error Loading')).toBeInTheDocument();
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(mockChildren).not.toHaveBeenCalled();
    
    fireEvent.click(screen.getByText('Try Again'));
    expect(mockRetry).toHaveBeenCalledOnce();
  });

  it('renders empty state when data is empty', () => {
    const emptyData = { items: [] };
    
    render(
      <DataStateWrapper
        data={emptyData}
        isEmpty={(data) => data.items.length === 0}
        children={mockChildren}
        emptyProps={{
          title: 'No Items',
          description: 'No items found',
          variant: 'no-data',
        }}
      />
    );
    
    expect(screen.getByText('No Items')).toBeInTheDocument();
    expect(screen.getByText('No items found')).toBeInTheDocument();
    expect(mockChildren).not.toHaveBeenCalled();
  });

  it('renders children when data is available', () => {
    render(
      <DataStateWrapper
        data={mockData}
        children={mockChildren}
      />
    );
    
    expect(mockChildren).toHaveBeenCalledWith(mockData);
    expect(screen.getByText(`Data: ${JSON.stringify(mockData)}`)).toBeInTheDocument();
  });

  it('renders children when data is available even with error (data takes precedence)', () => {
    const error = { message: 'Some error' };
    
    render(
      <DataStateWrapper
        data={mockData}
        error={error}
        children={mockChildren}
      />
    );
    
    expect(mockChildren).toHaveBeenCalledWith(mockData);
    expect(screen.getByText(`Data: ${JSON.stringify(mockData)}`)).toBeInTheDocument();
    expect(screen.queryByText('Some error')).not.toBeInTheDocument();
  });

  it('uses default isEmpty function for arrays', () => {
    const emptyArray: any[] = [];
    
    render(
      <DataStateWrapper
        data={emptyArray}
        children={mockChildren}
      />
    );
    
    expect(screen.getByText('No Data Available')).toBeInTheDocument();
    expect(mockChildren).not.toHaveBeenCalled();
  });

  it('uses default isEmpty function for objects', () => {
    const emptyObject = {};
    
    render(
      <DataStateWrapper
        data={emptyObject}
        children={mockChildren}
      />
    );
    
    expect(screen.getByText('No Data Available')).toBeInTheDocument();
    expect(mockChildren).not.toHaveBeenCalled();
  });

  it('renders retrying state', () => {
    render(
      <DataStateWrapper
        isLoading={true}
        isRetrying={true}
        children={mockChildren}
      />
    );
    
    expect(screen.getByText('Retrying...')).toBeInTheDocument();
  });

  it('renders empty state with action buttons', () => {
    const mockAction = vi.fn();
    const mockSecondaryAction = vi.fn();
    
    render(
      <DataStateWrapper
        data={[]}
        children={mockChildren}
        emptyProps={{
          title: 'No Data',
          description: 'No data available',
          action: {
            label: 'Add Item',
            onClick: mockAction,
            variant: 'primary',
          },
          secondaryAction: {
            label: 'Refresh',
            onClick: mockSecondaryAction,
            variant: 'secondary',
          },
        }}
      />
    );
    
    expect(screen.getByText('Add Item')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Add Item'));
    fireEvent.click(screen.getByText('Refresh'));
    
    expect(mockAction).toHaveBeenCalledOnce();
    expect(mockSecondaryAction).toHaveBeenCalledOnce();
  });
});