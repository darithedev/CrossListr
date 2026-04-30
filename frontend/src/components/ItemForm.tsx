import { useState } from 'react'
import { Form, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const ItemForm = () => {
    const navigate = useNavigate();

    type ItemData = {
        item_images: string[];
        title: string;
        description: string;
        category: string;
        condition: string;
        price: number;
    };

    const [item, setItem] = useState<ItemData>({
        item_images: [],
        title: "",
        description: "",
        category: "",
        condition: "",
        price: 0
    });

    const handleItemImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const images = event.target.files;

        if (!images) return;

        // Complete logic for storing images
    };

    const handleTitle = (event: React.ChangeEvent<HTMLInputElement>) => {
        const title = event.target.value;
        setItem((prev) => ({ ...prev, title }));
    };

    const handleDescription = (event: React.ChangeEvent<HTMLInputElement>) => {
        const description = event.target.value;
        setItem((prev) => ({ ...prev, description }));
    };

    const handleCategory = (event: React.ChangeEvent<HTMLInputElement>) => {
        const category = event.target.value;
        setItem((prev) => ({ ...prev, category }));
    };

    const handleCondition = (event: React.ChangeEvent<HTMLInputElement>) => {
        const condition = event.target.value;
        setItem((prev) => ({ ...prev, condition }));
    };

    const handlePrice = (event: React.ChangeEvent<HTMLInputElement>) => {
        const price = Number(event.target.value);
        setItem((prev) => ({ ...prev, price }));
    };

    const clearForm = () => {
        setItem({ 
            item_images: [],
            title: "",
            description: "",
            category: "",
            condition: "",
            price: 0
        });
    };

    const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
    };

    return (
        <Form>
            
        </Form>
    )

}

export default ItemForm; 