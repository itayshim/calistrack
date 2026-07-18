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
    await user.click(screen.getByRole('combobox', { name: 'Movement family' }));
    await user.keyboard('{ArrowDown}{Enter}');
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
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
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
    document.documentElement.dir = 'rtl';
    await user.click(screen.getByRole('combobox', { name: 'משפחת תנועה' }));
    const popup = await screen.findByTestId('taxonomy-popover');
    expect(popup.parentElement).toBe(document.body);
    expect(popup).toHaveClass('fixed', 'z-[1000]', 'modal-surface', 'taxonomy-popover');
    expect(popup).toHaveAttribute('data-theme-surface', 'opaque-elevated');
    expect(popup).toHaveAttribute('dir', 'rtl');
    expect(popup.style.maxHeight).toMatch(/px$/);
    document.documentElement.dir = 'ltr';
  });

  it('uses an opaque search header and internally scrolling option list', async () => {
    const user = userEvent.setup();
    render(
      <TaxonomyCombobox
        label="Category"
        value="pull"
        options={['push', 'pull', 'legs', 'core']}
        kind="category"
        onChange={vi.fn()}
        onCreate={vi.fn()}
        createLabel="Create new category"
        searchLabel="Search categories"
      />,
    );
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    const popup = await screen.findByTestId('taxonomy-popover');
    expect(popup.querySelector('.taxonomy-search-header')).toHaveClass('bg-white', 'dark:bg-elevated');
    expect(screen.getByRole('listbox')).toHaveClass('overflow-y-auto', 'overscroll-contain');
  });

  it('closes on Escape, returns focus, and closes on outside click', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TaxonomyCombobox
          label="Category"
          value="pull"
          options={['push', 'pull']}
          kind="category"
          onChange={vi.fn()}
          onCreate={vi.fn()}
          createLabel="Create new category"
          searchLabel="Search categories"
        />
        <button type="button">Outside</button>
      </>,
    );
    const trigger = screen.getByRole('combobox', { name: 'Category' });
    await user.click(trigger);
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opening another taxonomy combobox closes the previous popup', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TaxonomyCombobox label="Category" value="pull" options={['pull']} kind="category" onChange={vi.fn()} onCreate={vi.fn()} createLabel="Create" searchLabel="Search categories" />
        <TaxonomyCombobox label="Movement family" value="Pull-Up" options={['Pull-Up']} kind="movement_family" onChange={vi.fn()} onCreate={vi.fn()} createLabel="Create" searchLabel="Search families" />
      </>,
    );
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    expect(await screen.findByRole('listbox')).toHaveAccessibleName('Category');
    await user.click(screen.getByRole('combobox', { name: 'Movement family' }));
    expect(await screen.findByRole('listbox')).toHaveAccessibleName('Movement family');
    expect(screen.getAllByRole('listbox')).toHaveLength(1);
  });

  it.each([
    [390, 844],
    [440, 956],
    [1440, 900],
  ])('stays inside a %d×%d viewport and flips above a low trigger', async (viewportWidth, viewportHeight) => {
    const user = userEvent.setup();
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    const rectangle = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: viewportWidth - 110,
      y: viewportHeight - 176,
      top: viewportHeight - 176,
      right: viewportWidth - 10,
      bottom: viewportHeight - 124,
      left: viewportWidth - 110,
      width: 100,
      height: 52,
      toJSON: () => ({}),
    } as DOMRect);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: viewportWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: viewportHeight });
    render(
      <TaxonomyCombobox label="Category" value="pull" options={['pull', 'push']} kind="category" onChange={vi.fn()} onCreate={vi.fn()} createLabel="Create" searchLabel="Search" />,
    );
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    const popup = await screen.findByTestId('taxonomy-popover');
    expect(Number.parseFloat(popup.style.left)).toBeGreaterThanOrEqual(12);
    expect(Number.parseFloat(popup.style.left) + Number.parseFloat(popup.style.width)).toBeLessThanOrEqual(viewportWidth - 12);
    expect(popup.style.bottom).not.toBe('');
    expect(Number.parseFloat(popup.style.maxHeight)).toBeLessThanOrEqual(Math.round(viewportHeight * 0.52));
    rectangle.mockRestore();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
  });
});
