import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChipInput, TaxonomyCombobox } from './TaxonomyInputs';

describe('taxonomy inputs', () => {
  afterEach(cleanup);

  it('selects an existing movement family with keyboard-accessible controls', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(
      <TaxonomyCombobox
        label="Movement family"
        value=""
        options={['Pull-Up', 'Push-Up']}
        kind="movement_family"
        onChange={change}
        onCreate={vi.fn()}
        createLabel="Create new movement family"
        searchLabel="Search movement families"
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Movement family' }));
    await user.tab();
    await user.keyboard('{Enter}');
    expect(change).toHaveBeenCalledWith('Pull-Up');
  });

  it('creates a new controlled category only through the explicit action', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const create = vi.fn().mockResolvedValue('full-body');
    render(
      <TaxonomyCombobox
        label="Category"
        value="pull"
        options={['pull', 'push']}
        kind="category"
        onChange={change}
        onCreate={create}
        createLabel="Create new category"
        searchLabel="Search categories"
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Category' }));
    await user.type(screen.getByText('Search categories').nextElementSibling as HTMLInputElement, 'Full Body');
    await user.click(screen.getByRole('button', { name: /Create new category/ }));
    expect(create).toHaveBeenCalledWith('Full Body');
    expect(change).toHaveBeenCalledWith('full-body');
  });

  it('adds, pastes, de-duplicates and removes exercise-specific alias chips', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const { rerender } = render(
      <ChipInput label="Aliases" values={[]} kind="alias" onChange={change} placeholder="Add alias" />,
    );
    const input = screen.getByPlaceholderText('Add alias');
    await user.type(input, 'L Sit Pull Up{Enter}');
    expect(change).toHaveBeenCalledWith(['L Sit Pull Up']);
    rerender(<ChipInput label="Aliases" values={['L Sit Pull Up']} kind="alias" onChange={change} placeholder="Add alias" />);
    await user.click(screen.getByRole('button', { name: 'Aliases: L Sit Pull Up' }));
    expect(change).toHaveBeenLastCalledWith([]);
  });

  it('normalizes muscle chips and prevents duplicate aliases', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(
      <ChipInput
        label="Muscles"
        values={['lats']}
        options={['lats', 'biceps']}
        kind="muscle"
        onChange={change}
        placeholder="Search muscles"
      />,
    );
    await user.type(screen.getByPlaceholderText('Search muscles'), 'Lat{Enter}');
    expect(change).toHaveBeenCalledWith(['lats']);
  });

  it('keeps the popup constrained to the mobile viewport and supports RTL inheritance', async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <TaxonomyCombobox
          label="משפחת תנועה"
          value="Pull-Up"
          options={['Pull-Up']}
          kind="movement_family"
          onChange={vi.fn()}
          onCreate={vi.fn()}
          createLabel="יצירת משפחה חדשה"
          searchLabel="חיפוש משפחות תנועה"
        />
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'משפחת תנועה' }));
    expect(screen.getByRole('listbox').parentElement).toHaveClass('inset-x-0', 'max-h-80', 'overflow-auto');
    expect(screen.getByRole('listbox').closest('[dir="rtl"]')).toBeTruthy();
  });
});
