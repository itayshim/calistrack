import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('application startup', () => {
  it('loads the redesigned dashboard without falling into the error boundary', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: /Build strength/ })).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
  });
});
