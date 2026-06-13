import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ItemCard from '../components/ItemCard';
import axios from 'axios'
import './Home.css'

const API_URL = import.meta.env.VITE_API_URL;

type Item = {
    id: string;
    item_images: string[];
    title: string;
    description: string;
    category: string;
    condition: string;
    price: number;
};

type NormalizeItem = {
    id: string | number;
    title: string;
    description: string;
    category: string;
    condition: string;
    price: number;
    image_url: string | null;
    index_number: number | null;
};

type Items = Item[];


function normalizeItems(rows: NormalizeItem[]): Items {
    const items: Items = [];

    for (const row of rows) {
        const id = String(row.id);
        const prev = items[items.length - 1];

        if (!prev || prev.id !== id) {
            items.push({
                id,
                title: row.title,
                description: row.description,
                category: row.category,
                condition: row.condition,
                price: Number(row.price),
                item_images: [],
            });
        }

        if (row.image_url) {
            items[items.length -1].item_images.push(row.image_url);
        }
    }

    return items;
}

const Home = () => {
    const navigate = useNavigate();

    // Items are pulled from GET /items endpoint
    const [items, setItems] = useState<Items>([]);

    useEffect(() => {
        const getItems = async () => {
            try {
                const token = localStorage.getItem('token');
                const { data } = await axios.get(`${API_URL}/v1/items`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                setItems(normalizeItems(data));
            } catch (error) {
                console.error('Failed to load items:', error);
            }
        };
        getItems();
    }, []);

    return (
        <div className="home-container">
            <ItemCard items={items}/>

            <button 
                onClick={() => navigate('/items/new')}
                className="home-button add-item-button"
            >
                Add New Item
            </button>
        </div>
    )
};

export default Home;
