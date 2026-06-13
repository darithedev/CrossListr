import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserContext } from '../context/UserContext'

const NavBar = () => {
    const auth = useContext(UserContext);
    const navigate = useNavigate();

    if (!auth?.user) {
        return null
    }

    const { user, logout, loading } = auth

    const handleLogout = () => {
        logout();
        navigate('/login');
    }

    return (
        <div className="navbar-container">
            
        </div>
    )
}

export default NavBar