import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

// StrictMode csak fejlesztési módban – production-ban kikapcsolva
// (StrictMode dupla mount + event listener race condition okozta a webes frissítési hibát)
const isDev = import.meta.env.DEV;

ReactDOM.createRoot(document.getElementById('root')).render(
  isDev
    ? <React.StrictMode><ErrorBoundary><App /></ErrorBoundary></React.StrictMode>
    : <ErrorBoundary><App /></ErrorBoundary>
)
