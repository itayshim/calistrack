import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PageBackLink } from './PageBackLink';

describe('PageBackLink', () => {
  it('renders a labeled parent link with the shared RTL-aware directional icon', () => {
    render(
      <MemoryRouter>
        <div dir="rtl">
          <PageBackLink to="/exercises" label="חזרה לתרגילים" />
        </div>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'חזרה לתרגילים' });
    expect(link).toHaveAttribute('href', '/exercises');
    expect(link.querySelector('svg')).toHaveClass('directional-icon');
  });
});
