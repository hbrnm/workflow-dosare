import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'
import './styles/appTokens.css'
import './styles/appShellIntegrations.css'
import './styles/mobileThemes.css'
import './styles/mobileAppShell.css'
import './styles/alerteCenter.css'

registerSW({
  immediate: true,
  onRegisteredSW(_swScriptUrl, registration) {
    const checkForUpdate = () => registration?.update().catch(() => {});
    checkForUpdate();
    window.setInterval(checkForUpdate, 60 * 60 * 1000);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
