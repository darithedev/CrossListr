import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL;
const FAKEBAY_URL = import.meta.env.VITE_FAKEBAY_AUTH_PUBLIC_URL;

const Settings = () => {
    const navigate = useNavigate();
    const [fakebayConnected, setFakebayConnected] = useState(false);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const getConnections = async () => {
            try {

                if (!token) {
                    return
                }

                const { data } = await axios.get(`${API_URL}/v1/connections`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const marketplaces = data.map((m: { name: string }) => m.name);
                setFakebayConnected(marketplaces.includes('fakebay'));
            } catch (error) {
                console.error('Failled to load connections:', error);
            }
        };
        getConnections();
    }, [navigate]);
    
    const fakebayConnection = () => {
        if (!token) {
            return
        }

        const clientId = import.meta.env.VITE_FAKEBAY_CLIENT_ID ?? 'dev-fakebay-client';

        const authBase = `${FAKEBAY_URL}/oauth2/authorize`;

        const redirectUri = `${API_URL}/v1/connections/fakebay/callback`;

        const url = new URL(authBase);
        url.searchParams.set('client_id', clientId);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('redirect_uri', redirectUri);
        url.searchParams.set('scope', 'https://api.ebay.com/oauth/api_scope');
        url.searchParams.set('state', token ?? '');

        window.location.assign(url.toString());
    };

    const faketsyConnection = () => {

    };

    return (
        <div className="settings-container">
            <h1>Settings</h1>
            <div className="integration">
                <h3>Integration</h3>
                {fakebayConnected ? (
                    <button type="button" disabled>Connected to Fakebay</button>
                ) : (
                    <button type="button" onClick={fakebayConnection}>Connect to Fakebay</button>
                )}
                <button type="button" onClick={faketsyConnection}>Connect to Faketsy</button>
                <button type="button" onClick={() => navigate('/profile')}>Back</button>
            </div>
        </div>
    )
}

export default Settings;