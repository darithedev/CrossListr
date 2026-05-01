import { useState, useEffect, createContext } from 'react'
import axios from 'axios'

type User = {
    id: string;
    name: string;
    email: string;
    phone_number: number;
};

type UserContextValue = {
    user: User | null;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    loading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
};

export const UserContext = createContext<UserContextValue | null>(null);

const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const login = (token: string, loggedInUser: User) => {
        localStorage.setItem('token', token);
        setUser(loggedInUser);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            const URL = import.meta.env.VITE_API_URL;

            if (!token) {
                setUser(null);
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get(`${URL}/v1/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (response.status === 200) {
                    setUser(response.data.user);
                } else {
                    logout()
                }
            } catch (error: unknown) {
                logout();
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    return (
        <UserContext.Provider value={{ user, setUser, loading, login, logout }}>
            { children }
        </UserContext.Provider>
    )
};

export default UserProvider;

