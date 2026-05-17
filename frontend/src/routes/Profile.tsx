import { useContext } from 'react'
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';

const Profile = () => {
    const navigate = useNavigate();
    const auth = useContext(UserContext);

    return (
        <div className="profile-container">
            <h1>Profile</h1>
        </div>
    )
}

export default Profile;