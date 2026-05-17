import { useContext } from 'react'
import { useNavigate } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap'
import { UserContext } from '../context/UserContext';

const Profile = () => {
    const navigate = useNavigate();
    const auth = useContext(UserContext);

    return (
        <Form className="profile-form">
            <h1>Profile</h1>

            <Form.Group controlId="name">
                <Form.Label>Name:</Form.Label>
                <Form.Control
                    type="text"
                    required
                    value={auth?.user?.name}
                    disabled
                >
                </Form.Control>
            </Form.Group>
            
            <Form.Group controlId="name">
                <Form.Label>Email:</Form.Label>
                <Form.Control
                    type="text"
                    required
                    value={auth?.user?.email}
                    disabled
                >
                </Form.Control>
            </Form.Group>

            <Form.Group controlId="name">
                <Form.Label>Phone Number:</Form.Label>
                <Form.Control
                    type="tel"
                    required
                    value={auth?.user?.phone_number}
                    disabled
                >
                </Form.Control>
            </Form.Group>
            <Button onClick={() => navigate('/home')}>Home</Button>
            <Button onClick={() => navigate('/settings')}>Settings</Button>
        </Form>
    )
}

export default Profile;