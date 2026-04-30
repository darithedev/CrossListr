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

    return (
        <Form>
            
        </Form>
    )

}

export default ItemForm; 