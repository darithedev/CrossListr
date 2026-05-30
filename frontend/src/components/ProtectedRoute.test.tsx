import '@testing-library/jest-dom/vitest'
import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { UserContext } from '../context/UserContext'
import ProtectedRoute from './ProtectedRoute'

describe('ProtectedRoute', () => {
  test('ProtectedRoute renders child when user is logged in', () => {
    render(
      <UserContext.Provider
        value={{
          user: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
            phone_number: 0,
          },
          loading: false,
          setUser: vi.fn(),
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <MemoryRouter initialEntries={['/home']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<div>Protected page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </UserContext.Provider>
    )

    expect(screen.getByText('Protected page')).toBeInTheDocument()
  })
})