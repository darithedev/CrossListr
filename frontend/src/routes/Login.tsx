import { useState } from 'react'
import { Form, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

const Login = () => {
    const navigate = useNavigate();
    type LoginData = {
        name: string;
        email: string;
    };

    const [loginData, setLoginData] = useState<LoginData>({
        name: "",
        email: ""
    });

    const handleName = (event: React.ChangeEvent<HTMLInputElement>) => {
        const name = event.target.value;
        setLoginData((prev) => ({ ...prev, name}));
    };

    const handleEmail = (event: React.ChangeEvent<HTMLInputElement>) => {
        const email = event.target.value;
        setLoginData((prev) => ({ ...prev, email}));
    };

    const clearLogin = () => {
        setLoginData({
            name: "",
            email: ""
        });
    }

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
            <h1>Login</h1>
            <Form.Group controlId="name">
                <Form.Label>Name: </Form.Label>
                <Form.Control
                    type="text"
                    placeholder="Riley Cares"
                    required
                    value={loginData.name}
                    onChange={handleName}
                />
            </Form.Group>
            <Form.Group controlId="email">
                <Form.Label>Email: </Form.Label>
                <Form.Control
                    type="email"
                    value={loginData.email}
                    placeholder='example@mail.com'
                    onChange={handleEmail}
                />
            </Form.Group>
            <Button type="submit" variant="outline-success">
                Submit
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