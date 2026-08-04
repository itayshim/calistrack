import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminPreviewBadge, AdminValidationBanner } from './AdminPreview';

describe('shared Administrator preview surfaces', () => {
  it('renders validation severity and expandable diagnostic codes', () => {
    render(<AdminValidationBanner
      valid={false}
      language="en"
      errors={[{ code: 'missing_exercise', path: 'weeks.0.workouts.0', message: 'Exercise is missing' }]}
      warnings={[{ code: 'missing_media', path: 'weeks.0', message: 'Media is missing' }]}
    />);
    expect(screen.getByRole('heading', { name: 'Blocking content errors' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.getByText('missing_exercise')).toBeInTheDocument();
    expect(screen.getByText('missing_media')).toBeInTheDocument();
  });

  it('provides consistent badge styling for preview metadata', () => {
    render(<AdminPreviewBadge tone="success">Published</AdminPreviewBadge>);
    expect(screen.getByText('Published')).toHaveClass('rounded-full');
  });
});
