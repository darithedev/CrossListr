import '@testing-library/jest-dom/vitest'
import { describe, test, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import NavBar from './NavBar'

afterEach(() => {
    cleanup()
})

describe('NavBar', () => {
    test('renders navbar container skeleton', () => {
        const { container } = render(<NavBar />)
        expect(container.querySelector('.navbar-container')).toBeInTheDocument()
    });
});