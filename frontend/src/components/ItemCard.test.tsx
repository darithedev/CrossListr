import '@testing-library/jest-dom/vitest'
import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ItemCard from './ItemCard'

afterEach(() => {
    cleanup()
})

describe('Me Component', () => {
    test('Me component renders', () => {
        render(
            <MemoryRouter>
                <ItemCard items={[{ id: '1', title: 'Vintage Jacket', price: 25, item_images: [] }]} />
            </MemoryRouter>
        )
        expect(screen.getByText('Vintage Jacket')).toBeInTheDocument()
    });
});



