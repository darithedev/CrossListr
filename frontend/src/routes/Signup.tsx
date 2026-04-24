import { useState } from 'react'
import { Form, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

const Signup = () => {
    const navigate = useNavigate();
    
    type SignupData = {
        name: string;
        phone_number: string;
        email: string;
        password: string;
    };

    const [signupData, setSignupData] = useState<SignupData>({
        name: "",
        phone_number: "",
        email: "",
        password: ""
    });

    const handleName = (event: React.ChangeEvent<HTMLInputElement>) => {
        const name = event.target.value;
        setSignupData((prev) => ({ ...prev, name}));
    };

    const handlePhoneNumber = (event: React.ChangeEvent<HTMLInputElement>) => {
        const phone_number = event.target.value.replace(/\D/g, '');
        setSignupData((prev) => ({ ...prev, phone_number}));
    };

    const handleEmail = (event: React.ChangeEvent<HTMLInputElement>) => {
        const email = event.target.value;
        setSignupData((prev) => ({ ...prev, email}));
    };

        const handlePassword = (event: React.ChangeEvent<HTMLInputElement>) => {
        const password = event.target.value;
        setSignupData((prev) => ({ ...prev, password}));
    };

    const clearLogin = () => {
        setSignupData({
            name: "",
            phone_number: "",
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
            className="singup-form"
            onSubmit={handleSubmit}
        >
            <h1>Enter Your Personal Information</h1>
            <Form.Group controlId="name">
                <Form.Label>Full Name: </Form.Label>
                <Form.Control
                    type="text"
                    value={signupData.name}
                    required
                    placeholder='Riley Cares'
                    onChange={handleName}
                />
            </Form.Group>
            <Form.Group controlId="phone_number">
                <Form.Label>Phone Number: </Form.Label>
                <Form.Control
                    type="tel"
                    value={signupData.phone_number}
                    placeholder='Enter 11-digit US phone number'
                    onChange={handlePhoneNumber}
                    maxLength={11}
                />
            </Form.Group>
            <Form.Group controlId="email">
                <Form.Label>Email: </Form.Label>
                <Form.Control
                    type="email"
                    value={signupData.email}
                    required
                    placeholder='example@mail.com'
                    onChange={handleEmail}
                />
            </Form.Group>
            <Form.Group controlId="password">
                <Form.Label>Password: </Form.Label>
                <Form.Control
                    type="password"
                    placeholder="Password"
                    required
                    value={signupData.password}
                    onChange={handlePassword}
                />
            </Form.Group>
            <Button type="submit" variant="outline-success">
                Sign Up
            </Button>
            <Button type="button" variant="outline-warning" onClick={clearLogin}>
                Reset
            </Button>
            {/*<Button type="button" variant="outline-warning" onClick={() => navigate("/")}>
                Back
            </Button>*/}
        </Form>
    )
}

export default Signup;