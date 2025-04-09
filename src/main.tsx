import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom' // Using HashRouter for better GitHub Pages support
import App from './App'
import './index.css'
import { NotificationProvider } from './components/ui/Notification'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </HashRouter>
  </React.StrictMode>,
)
