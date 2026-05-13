import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ItemFormComponent from '../components/ItemFormComponent'

type ItemData = {
    id: string;
    item_images: string[];
    title: string;
    description: string;
    category: string;
    condition: string;
    price: number;
};

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
}

const ItemForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = id !== undefined;

    const [itemData, setItemData] = useState<ItemData>(newItem);

    useEffect(() => {
        const cloudinary = (window as any).cloundinary;

        const widget = cloudinary.createUploadWidget()
        
    }, [])

    const saveItem = (item: ItemData) => {
        // Add axios for POST /item & PUT /item/:id here
    };

    const handleSubmit = async (item: ItemData) => {
        await saveItem(item);
        navigate('/home')
    };

    return (
        <>
            <ItemFormComponent isEditing={isEditing} itemData={itemData} onSave={handleSubmit}/>
        </>
    )
}

export default ItemForm;