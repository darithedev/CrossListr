import { useState } from 'react'
import { Card, Button } from 'react-bootstrap'

type Item = {
    id: string;
    title: string;
    item_images: string[];
}

const ItemCard = () => {
    const [items, setItems] = useState<Item[]>([]);

    return (
        <>
            {items.map((item) => (
                <Card key={item.id} style={{ width: '18rem' }}>
                    <Card.Img variant="top" src={item.item_images[0]} />
                     <Card.Body>
                        <Card.Title>{item.title}</Card.Title>
                        <Button variant="primary">Select</Button>
                    </Card.Body>
                </Card>
            ))}
        </>
       
    )
}

export default ItemCard;