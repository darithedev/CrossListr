import { Navigate, Outlet } from 'react-router-dom'

type ProtectedRouteProps = {
    isAuthenticated: boolean;
}

const ProtectedRoute = ({ isAuthenticated }: ProtectedRouteProps) => {
    return (
        isAuthenticated ? <Outlet /> :  <Navigate to='/login' />
    )
}

export default ProtectedRoute;