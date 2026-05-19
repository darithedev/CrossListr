import { useEffect } from 'react'

const Settings = () => {

    const fakebayConnection = () => {

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