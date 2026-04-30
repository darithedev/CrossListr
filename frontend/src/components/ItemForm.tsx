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
        <Form 
            className="form-citem"
            onSubmit={handleSubmit}
        >
            <h2>New Item</h2>
            <Form.Group controlId="title">
                <Form.Label>Title: </Form.Label>
                <Form.Control
                    type="text"
                    placeholder="Vintage Jacket"
                    required
                    value={item.title}
                    onChange={handleTitle}
                />
            </Form.Group>
            <Form.Group controlId="description">
                <Form.Label>Description: </Form.Label>
                <Form.Control
                    type="text"
                    placeholder="Describe this item"
                    required
                    value={item.description}
                    onChange={handleDescription}
                />
            </Form.Group>
            <Form.Group controlId="category">
                <Form.Label>Category: </Form.Label>
                <Form.Control
                    type="text"
                    value={item.category}
                    onChange={handleCategory}
                />
            </Form.Group>
            <Form.Group controlId="condition">
                <Form.Label>Item COndition: </Form.Label>
                <Form.Control
                    type="text"
                    placeholder="Used"
                    value={item.condition}
                    onChange={handleCondition}
                />
            </Form.Group>
            <Form.Group controlId="price">
                <Form.Label>Price: </Form.Label>
                <Form.Control
                    type="number"
                    value={item.price}
                    onChange={handlePrice}
                />
            </Form.Group>
            <Form.Group>
                <Button type="submit" variant="outline-success">
                    Submit
                </Button>
                <Button type="button" variant="outline-warning" onClick={clearForm}>
                    Reset
                </Button>
                {/*<Button type="button" variant="outline-warning" onClick={() => navigate("/")}>
                Back
            </Button>*/}
            </Form.Group>
        </Form>
    )

}

export default ItemForm; 