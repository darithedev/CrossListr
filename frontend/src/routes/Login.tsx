import { useState } from 'react'
import { Form, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

const Login = () => {
    const navigate = useNavigate();
    type LoginData = {
        email: string;
        password: string;
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

    const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        alert("Submitted!")
        clearLogin();
    }

    return (
        <Form 
            className="login-form"
            onSubmit={handleSubmit}
        >
            <h1>Log In</h1>
            <Form.Group controlId="email">
                <Form.Label>Email: </Form.Label>
                <Form.Control
                    type="email"
                    value={loginData.email}
                    placeholder='example@mail.com'
                    required
                    onChange={handleEmail}
                />
            </Form.Group>
            <Form.Group controlId="password">
                <Form.Label>Password: </Form.Label>
                <Form.Control
                    type="password"
                    placeholder="Password"
                    required
                    value={loginData.password}
                    onChange={handlePassword}
                />
            </Form.Group>
            <Button type="submit" variant="outline-success">
                Log In
            </Button>
            <Button type="button" variant="outline-warning" onClick={clearLogin}>
                Reset
            </Button>
            {/*<Button type="button" variant="outline-warning" onClick={() => navigate("/home")}>
                Back
            </Button>*/}
        </Form>
    )
}

export default Login;