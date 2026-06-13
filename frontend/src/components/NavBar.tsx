import { useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from 'react-bootstrap'
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
            <div className="navbar">
                <div className="navbar-left">
                    <Link
                        to={user ? '/home' : '/login'}
                        className="navbar-crosslistr"
                    >
                        CrossListr
                    </Link>

                    {user && (
                        <>
                            <Link to='/home' className="navbar-link">
                                Dashboard
                            </Link>
                            <Button
                                variant='outline-primary'
                                className='navbar-button'
                                onClick={() => navigate('/items/new')}
                            >
                                Add Item
                            </Button>
                            <Link to='/home' className='navbar-link'>
                                All items
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default NavBar