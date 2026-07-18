import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionMenu, Select } from './SelectMenu';

describe('shared floating menus', () => {
  afterEach(() => {
    cleanup();
    document.documentElement.dir = 'ltr';
  });

  it('renders Select in a portal with an opaque constrained surface and selects by keyboard', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(<Select label="Difficulty" value="beginner" onChange={change} options={[
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
    ]} />);
    const trigger = screen.getByRole('combobox', { name: 'Difficulty' });
    await user.click(trigger);
    const popup = screen.getByTestId('select-popover');
    expect(popup.parentElement).toBe(document.body);
    expect(popup).toHaveClass('modal-surface', 'floating-menu-surface', 'fixed', 'z-[1000]');
    expect(popup).toHaveAttribute('data-theme-surface', 'opaque-elevated');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(change).toHaveBeenCalledWith('intermediate');
    expect(trigger).toHaveFocus();
  });

  it('supports typeahead, selected and disabled option states', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(<Select label="Measurement" value="reps" onChange={change} options={[
      { value: 'reps', label: 'Repetitions' },
      { value: 'duration', label: 'Timed hold' },
      { value: 'weighted', label: 'Weighted repetitions', disabled: true },
    ]} />);
    const trigger = screen.getByRole('combobox', { name: 'Measurement' });
    await user.click(trigger);
    expect(screen.getByRole('option', { name: 'Repetitions' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Weighted repetitions' })).toBeDisabled();
    await user.keyboard('t{Enter}');
    expect(change).toHaveBeenCalledWith('duration');
  });

  it('filters a searchable Select and closes on outside click', async () => {
    const user = userEvent.setup();
    render(<><Select searchable searchLabel="Search exercises" label="Exercise" value="" onChange={vi.fn()} options={[
      { value: 'push-up', label: 'Push-Up' },
      { value: 'pull-up', label: 'Pull-Up' },
    ]} /><button>Outside</button></>);
    await user.click(screen.getByRole('combobox', { name: 'Exercise' }));
    await user.type(screen.getByPlaceholderText('Search exercises'), 'pull');
    expect(screen.getByRole('option', { name: 'Pull-Up' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Push-Up' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders an accessible ActionMenu, invokes destructive actions, and returns focus on Escape', async () => {
    const user = userEvent.setup();
    const remove = vi.fn();
    render(<ActionMenu label="Program actions" trigger={<span>...</span>} items={[
      { id: 'edit', label: 'Edit', onSelect: vi.fn() },
      { id: 'delete', label: 'Delete', destructive: true, onSelect: remove },
    ]} />);
    const trigger = screen.getByRole('button', { name: 'Program actions' });
    await user.click(trigger);
    const menu = screen.getByRole('menu', { name: 'Program actions' });
    expect(menu.parentElement).toBe(document.body);
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveClass('is-destructive');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(remove).toHaveBeenCalledOnce();
  });

  it('inherits RTL direction and only keeps one floating menu open', async () => {
    document.documentElement.dir = 'rtl';
    const user = userEvent.setup();
    render(<>
      <Select label="First" value="a" onChange={vi.fn()} options={[{ value: 'a', label: 'A' }]} />
      <ActionMenu label="Second" trigger={<span>...</span>} items={[{ id: 'x', label: 'Action', onSelect: vi.fn() }]} />
    </>);
    await user.click(screen.getByRole('combobox', { name: 'First' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Second' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('menu')).toHaveAttribute('dir', 'rtl');
  });

  it.each([[390, 844], [440, 956], [1440, 900]])('stays in a %d×%d viewport and flips above', async (width, height) => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: width - 110, y: height - 80, top: height - 80, right: width - 10,
      bottom: height - 28, left: width - 110, width: 100, height: 52, toJSON: () => ({}),
    } as DOMRect);
    const user = userEvent.setup();
    render(<Select label="Difficulty" value="beginner" onChange={vi.fn()} options={[{ value: 'beginner', label: 'Beginner' }]} />);
    await user.click(screen.getByRole('combobox', { name: 'Difficulty' }));
    const popup = screen.getByTestId('select-popover');
    expect(Number.parseFloat(popup.style.left)).toBeGreaterThanOrEqual(12);
    expect(Number.parseFloat(popup.style.left) + Number.parseFloat(popup.style.width)).toBeLessThanOrEqual(width - 12);
    expect(popup.style.bottom).not.toBe('');
    rect.mockRestore();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
  });
});
