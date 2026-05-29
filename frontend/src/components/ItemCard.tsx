import { Card, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import './ItemCard.css'

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
                <Button 
                    key={item.id}
                    variant="primary"
                    onClick={() => navigate(`/items/${item.id}`)}
                    className="card-container"
                >
                    <Card>
                        {item.item_images?.[0] ? (
                            <Card.Img variant="top" src={item.item_images[0]} alt={item.title} className="image-icon"/>
                        ) : ( 
                            <div className="placeholder-img" aria-label="No image"></div>
                        )}
                        <Card.Body>
                            <Card.Title>{item.title}</Card.Title>
                            <span>${item.price}</span>
                            <Button 
                                className="edit-button"
                                
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/items/${item.id}/edit`)
                                }}
                            >
                                Edit
                            </Button>
                        </Card.Body>
                    </Card>
                </Button>
            ))}
        </>
       
    )
}

export default ItemCard;
