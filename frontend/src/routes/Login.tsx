import { useState, useContext } from 'react'
import { Form, Button } from 'react-bootstrap'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { UserContext } from '../context/UserContext'
import './Login.css'

const Login = () => {
    const navigate = useNavigate();
    const auth = useContext(UserContext);
    
    type LoginData = {
        email: string;
        password: string;
    };

    type AuthResponse = {
        token: string;
        user: {
            id: string;
            name: string;
            email: string;
            phone_number: number;
        };
    };

    const [loginData, setLoginData] = useState<LoginData>({
        email: "",
        password: ""
    });

    const handleEmail = (event: React.ChangeEvent<HTMLInputElement>) => {
        const email = event.target.value;
        setLoginData((prev) => ({ ...prev, email}));
    };

    const handlePassword = (event: React.ChangeEvent<HTMLInputElement>) => {
        const password = event.target.value;
        setLoginData((prev) => ({ ...prev, password}));
    };

    const clearLogin = () => {
        setLoginData({
            email: "",
            password: ""
        });
    };

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!auth) {
            return;
        }

        const URL = import.meta.env.VITE_API_URL;
        try {
            const response = await axios.post(`${URL}/v1/auth/login`, loginData);

            if (response.status === 200) {
                const { token, user } = response.data as AuthResponse;
                clearLogin();
                alert("Sucessfully logged in!");
                auth.login(token, user);
                navigate('/home');
            }

        } catch (error: unknown) {
            alert("Incorrect email or password. Please Try Again");
            console.error(error);
        }
    };

    return (
        <Form 
            className="login-form"
            onSubmit={handleSubmit}
        >
            <span className="app-name">CrossListr</span>
            <h2 className="welcome-header">Welcome Back</h2>
            <p className="login-description">Login to manage your inventory and listings</p>
            <Form.Group controlId="email">
                <Form.Label>Email Address</Form.Label>
                <Form.Control
                    type="email"
                    value={loginData.email}
                    placeholder='example@mail.com'
                    required
                    onChange={handleEmail}
                />
            </Form.Group>
            <Form.Group controlId="password">
                <Form.Label>Password</Form.Label>
                <Form.Control
                    type="password"
                    placeholder="Password"
                    required
                    value={loginData.password}
                    onChange={handlePassword}
                />
            </Form.Group>
            <Button type="submit" variant="outline-success" className="login-button">
                Log In
            </Button>
            <Link to="/signup" className="signup-button">
                Don't have an Account? Sign up for free!
            </Link>
        </Form>
    )
}

export default Login;
