import { useContext } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { UserContext } from '../context/UserContext'

const ProtectedRoute = () => {
    const auth = useContext(UserContext);

    if (!auth) {
        return null;
    }

    const { user, loading } = auth;

    if (loading) {
        return null;
    }
    return (
        user ? <Outlet /> :  <Navigate to='/login' />
    )
}

export default ProtectedRoute;