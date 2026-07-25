import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import './index.css'

// StrictMode csak fejlesztési módban – production-ban kikapcsolva
// (StrictMode dupla mount + event listener race condition okozta a webes frissítési hibát)
const isDev = import.meta.env.DEV;

const tree = (
  <ErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ErrorBoundary>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  isDev ? <React.StrictMode>{tree}</React.StrictMode> : tree
)
