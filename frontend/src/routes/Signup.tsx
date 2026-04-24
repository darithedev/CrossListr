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
            
        </Form>
    )
}

export default Signup;