import { useEffect } from 'react'

const FAKEBAY_URL = import.meta.env.VITE_FAKEBAY_AUTH_PUBLIC_URL;

const Settings = () => {

    const fakebayConnection = () => {
        const clientId = import.meta.env.VITE_FAKEBAY_CLIENT_ID ?? 'dev-fakebay-client';

        const authBase = `${FAKEBAY_URL}/oauth2/authorize`;

        const redirectUri = `${window.location.origin}/demo/oauth/callback`;

        const url = new URL(authBase);
        url.searchParams.set('client_id', clientId);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('redirect_uri', redirectUri);
        url.searchParams.set('scope', 'https://api.ebay.com/oauth/api_scope');
        url.searchParams.set('state', 'fakebay-ui');

        window.location.assign(url.toString());
    };

    const faketsyConnection = () => {

    };

    useEffect(() => {

    });

    return (
        <div className="settings-container">
            <h1>Settings</h1>
            <div className="integration">
                <h3>Integration</h3>
                <button type="button" onClick={fakebayConnection}>Connect to Fakebay</button>
                <button type="button" onClick={faketsyConnection}>Connect to Faketsy</button>
            </div>
        </div>
    )
}

export default Settings;