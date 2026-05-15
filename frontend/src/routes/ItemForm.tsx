import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Form, Button } from 'react-bootstrap'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL;
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const MAX_IMAGES = 12;

type ItemData = {
    id: string;
    item_images: { url: string; image_id?: number }[];
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
}

const newItem: ItemData = {
    id: "",
    item_images: [],
    title: "",
    description: "",
    category: "",
    condition: "",
    price: 0
};

type CloudinaryWidget = {
    open: () => void;
    close: () => void;
    hide: () => void;
    destroy: () => void;
};

type CloudinaryPayload = {
    secure_url: string;
    url: string;
    [additional_response: string]: unknown;
};

type CloudinaryInfo = {
    event: string;
    info: CloudinaryPayload;
};

// Likely move to /helper dir
const authHeaders = () => {
    const token = localStorage.getItem('token')
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
}

const ItemForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = id !== undefined;

    const [itemData, setItemData] = useState<ItemData>(newItem);
    const [isLoading, setIsLoading] = useState(isEditing); 

    const cloudinaryRef = useRef<CloudinaryWidget | null>(null);

    const imageCountRef = useRef<number>(0);

    useEffect(() => {
        const cloudinary = (window as any).cloudinary;

        const widget = cloudinary.createUploadWidget({ 
            cloudName: CLOUD_NAME, 
            uploadPreset: UPLOAD_PRESET, 
            sources: ["local", "url", "camera"],
            showAdvancedOptions: true,
            cropping: false,
            multiple: true,
            defaultSource: "local",
            undefined: {
                isTrusted: true,
                _vts: 1778775168369
            },
            styles: {
                palette: {
                    window: "#FFFFFF",
                    windowBorder: "#6A7481",
                    tabIcon: "#3448C5",
                    menuIcons: "#5A616A",
                    textDark: "#000000",
                    textLight: "#FFFFFF",
                    link: "#3448C5",
                    action: "#3448C5",
                    inactiveTabIcon: "#0E2F5A",
                    error: "#F44235",
                    inProgress: "#3448C5",
                    complete: "#20B832",
                    sourceBg: "#F5FAFE"
                },
                fonts: {
                    default: null,
                    "'Fira Sans', sans-serif": {
                        url: "https://fonts.googleapis.com/css?family=Fira+Sans",
                        active: true
                    }
                }
            }
        }, (error: unknown, info: CloudinaryInfo) => {
                if (error) {
                    console.error('Cloudinary widget error:', error)
                    return;
                }

                if (info.event === 'success' && info.info) {
                    const url = info.info.secure_url;

                    if (!url) return;

                    setItemData((prev) => {
                        if (prev.item_images.length >= MAX_IMAGES) return prev;
                        return { ...prev, item_images: [...prev.item_images, { url }]};
                    });
                }
            }
        ) as CloudinaryWidget;

        cloudinaryRef.current = widget;

        return () => {
            widget.destroy();
            cloudinaryRef.current = null;
        }
        
    }, [])

    const handleTitle = (event: React.ChangeEvent<HTMLInputElement>) => {
        const title = event.target.value;
        setItemData((prev) => ({ ...prev, title }));
    };

    const handleDescription = (event: React.ChangeEvent<HTMLInputElement>) => {
        const description = event.target.value;
        setItemData((prev) => ({ ...prev, description }));
    };

    const handleCategory = (event: React.ChangeEvent<HTMLInputElement>) => {
        const category = event.target.value;
        setItemData((prev) => ({ ...prev, category }));
    };

    const handleCondition = (event: React.ChangeEvent<HTMLInputElement>) => {
        const condition = event.target.value;
        setItemData((prev) => ({ ...prev, condition }));
    };

    const handlePrice = (event: React.ChangeEvent<HTMLInputElement>) => {
        const price = Number(event.target.value);
        setItemData((prev) => ({ ...prev, price }));
    };

    const handleRemoveImage = async (index: number) => {
        const image = itemData.item_images[index];

        if (!image) return;

        const itemId = itemData.id;

        if (isEditing && itemId && image.image_id != null) {
            try {
                await axios.delete(
                    `${API_URL}/v1/items/${itemId}/images/${image.image_id}`,
                    { headers: authHeaders() }
                );
            } catch (error) {
                console.error('Failed to delete this image:', error);
                alert('Error! Image was not deleted.')
                return;
            }
        };

        setItemData((prev) => ({ ...prev, item_images: prev.item_images.filter((_, i) => i !== index)}))
    };

    const clearForm = () => {
        setItemData({
            id: "",
            item_images: [],
            title: "",
            description: "",
            category: "",
            condition: "",
            price: 0
        });
    };

    useEffect(() => {
        if (!isEditing || !id) {
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

                const urls = data.images.map((img) => ({
                    url: img.url,
                    image_id: img.image_id
                }));

                imageCountRef.current = urls.length;

                setItemData({
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

    }, [isEditing, id, navigate]);

    const saveItem = async (item: ItemData): Promise<void> => {
        const payload = {
            title: item.title,
            description: item.description,
            category: item.category,
            condition: item.condition,
            price: item.price,
            source: 'manual',
            external_id: null,
        }

        let itemId: string;
        if (isEditing && id) {
            const { data } = await axios.put(`${API_URL}/v1/items/${id}`, payload, {
                headers: authHeaders(),
            });
            itemId = String(data.id ?? id);
        } else {
            const { data } = await axios.post(`${API_URL}/v1/items`, payload, {
                headers: authHeaders(),
            });
            itemId = String(data.id ?? id);
        };

        setItemData((prev) => ({ ...prev, id: itemId }));

        const images = itemData.item_images.slice(imageCountRef.current)
        for (let i = 0; i < images.length; i++) {
            await axios.post(
                `${API_URL}/v1/items/${itemId}/images`,
                {
                    image_url: images[i],
                    index_number: imageCountRef.current + i,
                },
                { headers: authHeaders() }
            )
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await saveItem(itemData);
            alert('Successfully saved item!');
            navigate('/home');
        } catch (error) {
            console.error('Failed to save item:', error)
        }
    };

    return (
        <Form className="form-item" onSubmit={handleSubmit}>
            <h2>{!isEditing ? 'New Item' : 'Edit Item'}</h2>

            <Form.Group controlId="images">
                <div className="upload-box">
                    {itemData.item_images.map((img, index) => (
                        <div key={`${index}`}>
                            <img src={img.url} alt=""/>
                            <button type="button" onClick={() => handleRemoveImage(index)}>x</button>
                        </div>
                    ))}
                </div>
                <p>Photos: {itemData.item_images.length}/{MAX_IMAGES}</p>
                <Button
                    type="button"
                    variant="outline-primary"
                    onClick={() => cloudinaryRef.current?.open()}
                >
                    Add photos
                </Button>
            </Form.Group>

            <Form.Group controlId="title">
                <Form.Label>Title:</Form.Label>
                <Form.Control
                    type="text"
                    placeholder="Vintage Jacket"
                    required
                    value={itemData.title}
                    onChange={handleTitle}
                />
            </Form.Group>

            <Form.Group controlId="description">
                <Form.Label>Description:</Form.Label>
                <Form.Control
                    type="text"
                    placeholder="Describe this item"
                    required
                    value={itemData.description}
                    onChange={handleDescription}
                />
            </Form.Group>

            <Form.Group controlId="category">
                <Form.Label>Category:</Form.Label>
                <Form.Control
                    type="text"
                    value={itemData.category}
                    onChange={handleCategory}
                />
            </Form.Group>

            <Form.Group controlId="condition">
                <Form.Label>Item Condition:</Form.Label>
                <Form.Control
                    type="text"
                    placeholder="Used"
                    value={itemData.condition}
                    onChange={handleCondition}
                />
            </Form.Group>

            <Form.Group controlId="price">
                <Form.Label>Price:</Form.Label>
                <Form.Control
                    type="number"
                    value={itemData.price}
                    onChange={handlePrice}
                />
            </Form.Group>

            <Form.Group>
                <Button type="button" variant="outline-success" onClick={() => saveItem(itemData)}>
                    Save draft
                </Button>
                <Button type="submit" variant="outline-success">
                    Submit
                </Button>
                <Button type="button" variant="outline-warning" onClick={clearForm}>
                    Reset
                </Button>
                <Button type="button" variant="outline-warning" onClick={() => navigate("/home")}>
                    Back
                </Button>
            </Form.Group>
        </Form>
    )
}

export default ItemForm;
