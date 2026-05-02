import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserContext } from '../context/UserContext'
import ItemCard from '../components/ItemCard';

type Item = {
    id: string;
    item_images: string[];
    title: string;
    description: string;
    category: string;
    condition: string;
    price: number;
};

type Items = Item[];

const Home = () => {
    const navigate = useNavigate();
    const auth = useContext(UserContext);

    // Items are pulled from GET /items endpoint
    const [items, setItems] = useState<Items>([]);

    const handleLogout = () => {
        auth?.logout();
        navigate('/login');
    }
    return (
        <div className="home-container">
            <h1>Hello Home Route</h1>
            <ItemCard items={items}/>
            <button onClick={() => handleLogout()}>Logout</button>
        </div>
    )
};

export default Home;