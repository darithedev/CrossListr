import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ItemFormComponent from '../components/ItemFormComponent'

const API_URL = import.meta.env.VITE_API_URL;
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

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
};

type CloudinaryInfo = {
    event: string;
    info: CloudinaryPayload;
};

const ItemForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = id !== undefined;

    const [itemData, setItemData] = useState<ItemData>(newItem);

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
            }
        ) as CloudinaryWidget;
        
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