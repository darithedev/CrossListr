import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserContext } from '../context/UserContext'
const Home = () => {
    const navigate = useNavigate();
    const auth = useContext(UserContext);

    const handleLogout = () => {
        auth?.logout();
        navigate('/login');
    }
    return (
        <div className="home-container">
            <h1>Hello Home Route</h1>
            <button onClick={() => handleLogout()}>Logout</button>
        </div>
    )
};

export default Home;