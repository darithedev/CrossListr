import { Card, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

type Item = {
    id: string;
    title: string;
    price: number;
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
                    {item.item_images?.[0] ? (
                        <Card.Img variant="top" src={item.item_images[0]} alt={item.title} />
                    ) : ( 
                        <div className="placeholder-img" aria-label="No image"></div>
                    )}
                    <Card.Body>
                        <Card.Title>{item.title}</Card.Title>
                        <span>${item.price}</span>
                        <Button variant="primary" onClick={() => navigate(`/items/${item.id}`)}>Select</Button>
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
