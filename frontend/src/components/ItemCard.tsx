import { useState } from 'react'
import { Card, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

type Item = {
    id: string;
    title: string;
    item_images: string[];
};

type ItemCardProps = {
    items: Item[];
}

const ItemCard = ({ items }: ItemCardProps) => {
    const navigate = useNavigate();

    return (
        <>
            {items.map((item) => (
                <Card key={item.id} style={{ width: '18rem' }}>
                    <Card.Img variant="top" src={item.item_images[0]} />
                     <Card.Body>
                        <Card.Title>{item.title}</Card.Title>
                        <Button variant="primary">Select</Button>
                        <Button onClick={() => 
                            navigate(`/items/${item.id}/edit`)
                        }>
                            Edit
                        </Button>
                    </Card.Body>
                </Card>
            ))}
        </>
       
    )
}

export default ItemCard;