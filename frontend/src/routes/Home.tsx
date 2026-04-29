import { useNavigate } from 'react-router-dom'

type HomeProps = {
    logout: () => void
};

const Home = ({ logout }: HomeProps) => {
    const navigate = useNavigate();

    return (
        <div className="home-container">
            <h1>Hello Home Route</h1>
            <button onClick={() => {logout(), navigate('/login')}}>Logout</button>
        </div>
    )
};

export default Home;