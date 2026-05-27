import { useState, useEffect } from 'react'
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios'

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

type ItemResponse = {
    id: string;
    title: string;
    description: string;
    category: string;
    condition: string;
    price: number;
    images: { image_id: number; url: string; index: number }[];
};

type ItemListing = {
    marketplace: string;
    status: string;
    external_id: string | null;
};

// Likely move to /helper dir
const authHeaders = () => {
    const token = localStorage.getItem('token')
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
};

const ItemDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [item, setItem] = useState<Item | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const marketplaces = ['fakebay', 'faketsy', 'fakify'];
    const [connections, setConnections] = useState<string[]>([]);

    useEffect(() => {
        if (!id) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        const loadItem = async () => {
            try {
                const { data } = await axios.get<ItemResponse>(
                    `${API_URL}/v1/items/${id}`,
                    { headers: authHeaders() }
                );

                const urls = data.images
                    .slice()
                    .sort((a, b) => a.index - b.index)
                    .map((img) => img.url)

                setItem({
                    id: String(data.id),
                    item_images: urls,
                    title: data.title || '',
                    description: data.description || '',
                    category: data.category || '',
                    condition: data.condition || '',
                    price: Number(data.price || 0),
                });
            } catch (error) {
                console.error('Failed to load item details:', error);
                alert('Oops! Could not load item details.');
                navigate('/home');
            } finally {
                setIsLoading(false);
            }
        }

        loadItem();
    }, [id, navigate]);

    const crosslist = (marketplace: String) => {

    }

    return (
        <div className="details-container">
            {isLoading ? (
                <span>Loading...</span>
            ) :  (item && (
                    <>
                        <h2>{item.title}</h2>
                        <p>Images:</p>
                        {item.item_images?.map((url, i) => (
                            <img key={`${i}`} src={url} alt="" />
                        ))}
                        <p>Description: {item.description}</p>
                        <p>Category: {item.category}</p>
                        <p>Condition: {item.condition}</p>
                        <p>Price: {item.price}</p>
                        <button onClick={() => crosslist('fakebay')}>Crosslist to Fakebay</button>
                        <button onClick={() => navigate('/home')}>Back</button>
                    </>
                )
            )}
        </div>
    )
}
export default ItemDetails;