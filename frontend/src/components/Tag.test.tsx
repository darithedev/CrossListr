import '@testing-library/jest-dom/vitest'
import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import Tag from './Tag'

afterEach(() => cleanup())

describe('Tag', () => {
  test('renders tag text', () => {
    render(<Tag tag="Listed" category="status" />)
    expect(screen.getByText('Listed')).toBeInTheDocument()
  })
})