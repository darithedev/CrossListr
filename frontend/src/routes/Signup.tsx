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