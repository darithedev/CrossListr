import { useState, useEffect } from 'react'
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios'
import Tag from '../components/Tag';
import './ItemDetails.css'

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

    const [listings, setListings] = useState<ItemListing[]>([]);
    const [isCrosslisting, setIsCrosslisting] = useState(false);

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

    useEffect(() => {
        const getConnections = async () => {
            try {
                if (!localStorage.getItem('token')) return;

                const { data } = await axios.get(
                    `${API_URL}/v1/connections`, 
                    { headers: authHeaders() }
                );

                const connectedMarketplaces = data.map((mp: {name: string}) => mp.name);
                setConnections(connectedMarketplaces);
            } catch (error) {
                console.error('Failed to load connected marketplaces:', error);
            }
        };
        getConnections();
    }, []);

    useEffect(() => {
        if (!id) return;

        const getListings = async () => {
            try {
                const { data } = await axios.get<ItemListing[]>(
                    `${API_URL}/v1/items/${id}/listings`,
                    { headers: authHeaders() }
                );
                setListings(data);
            } catch (error) {
                console.error('Failed to load listings:', error);
            }
        };
        getListings();
    }, [id]);

    const crosslist = async (marketplace: string) => {
        try {
            if (!id || !connections.includes(marketplace)) return;

            setIsCrosslisting(true);

            const { data } = await axios.post(
                `${API_URL}/v1/items/${id}/crosslist/${marketplace}`,
                {},
                { headers: authHeaders() }
            );

            if (data.external_id) {
                setListings((prev) => [
                    ...prev.filter((listing) => listing.marketplace !== marketplace),
                    {
                        marketplace,
                        status: 'listed',
                        external_id: data.external_id
                    },
                ]);
            }
            alert(`Successfully listed on ${marketplace}!`);
        } catch (error) {
            console.error('Failed to crosslist listing:', error);
            alert('Error! Could not list on Fakebay.');
        } finally {
            setIsCrosslisting(false);
        }
    }

    const fakebayExternalId = listings.find((listing) =>
        listing.marketplace === 'fakebay' &&
        listing.status === 'listed' &&
        listing.external_id
    )?.external_id ?? null;

    return (
        <div className="details-container">
            {isLoading ? (
                <p 
                    className="details-loading"
                    role="status" 
                    aria-live="polite"
                >
                    Loading...
                </p>
            ) :  (item && (
                    <>
                        <h2 className="details-header">{item.title}</h2>
                        <section className="details-images-section">
                            <p className="details-label">Images</p>
                            <div className="details-images">
                                {item.item_images?.map((url, i) => (
                                    <img 
                                        key={`${i}`}
                                        src={url} 
                                        alt={`${item.title}, image ${i + 1} of ${item.item_images.length}`}
                                    />
                                ))}
                            </div>
                        </section>
                        
                        <p className="details-field">
                            <span className="details-label">Description</span> 
                            {item.description}
                        </p>
                        <p className="details-field">
                            <span className="details-label">Category</span>
                            {item.category}
                        </p>
                        <p className="details-field">
                            <span className="details-label">Condition</span>
                            {item.condition}
                        </p>
                        <p className="details-price">${item.price}</p>
                        
                        <section className="details-marketplace-section">
                            <h3 className="details-section-title">List on marketplaces</h3>
                            {marketplaces.map((marketplace) => {
                                const marketplaceName = marketplace.charAt(0).toUpperCase() + marketplace.slice(1);
                                const isConnected = connections.includes(marketplace);
                                const externalId = marketplace === 'fakebay' ? fakebayExternalId : null;

                                if (!isConnected) {
                                    return (
                                        <button
                                            key={marketplaceName}
                                            type="button"
                                            className="details-button details-button-secondary"
                                            onClick={() => navigate('/settings')}
                                        >
                                            Connect {marketplaceName}
                                        </button>
                                    );
                                }

                                if (externalId) {
                                    return (
                                        <div key={marketplace} className="details-marketplace-row">
                                            <Tag tag={marketplaceName} category={'marketplace'}/>
                                            <Tag tag={'active'} category={'status'} />
                                            <span className="details-external-id">Id: {externalId}</span>
                                        </div>
                                    );
                                }

                                return (
                                    <button
                                        key={marketplace}
                                        type="button"
                                        className="details-button"
                                        onClick={() => crosslist(marketplace)}
                                        disabled={isCrosslisting}
                                    >
                                        {isCrosslisting ? 'Listing...' : `Crosslist to ${marketplaceName}`}
                                    </button>
                                );
                            })}
                        </section>
                        
                        <div className="details-back-section">
                            <button 
                                type="button"
                                className="details-button details-button-secondary"
                                onClick={() => navigate('/home')}
                            >
                                Back
                            </button>
                        </div>
                    </>
                )
            )}
        </div>
    )
}
export default ItemDetails;