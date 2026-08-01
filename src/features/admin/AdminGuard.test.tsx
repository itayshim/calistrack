import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AdminGuard } from './AdminGuard';

describe('admin authorization', () => {
  it('does not allow anonymous users to access admin pages', async () => {
    render(<MemoryRouter initialEntries={['/admin']}><Routes><Route element={<AdminGuard />}><Route path="/admin" element={<div>Secret admin</div>} /></Route><Route path="/admin/login" element={<div>Login required</div>} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Login required')).toBeInTheDocument();
    expect(screen.queryByText('Secret admin')).not.toBeInTheDocument();
  });
  it('does not allow a normal anonymous shell to access Skill QA routes', async () => {
    render(<MemoryRouter initialEntries={['/admin/skills/front-lever']}><Routes><Route element={<AdminGuard />}><Route path="/admin/skills/front-lever" element={<div>Skill QA secret</div>} /></Route><Route path="/admin/login" element={<div>Admin sign-in</div>} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Admin sign-in')).toBeInTheDocument();
    expect(screen.queryByText('Skill QA secret')).not.toBeInTheDocument();
  });
});
