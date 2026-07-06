import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

// StrictMode csak fejlesztési módban – production-ban kikapcsolva
// (StrictMode dupla mount + event listener race condition okozta a webes frissítési hibát)
const isDev = import.meta.env.DEV;

// Globális tárolási-hiba jelző: ha a localStorage mentés elbukik (pl. megtelt
// tárhely), a felhasználó NE csendben veszítsen adatot. Közvetlen DOM-banner,
// hogy a React render-fától független és mindig megjelenjen.
window.addEventListener("crm-storage-error", (e) => {
  const quota = e?.detail?.type === "quota";
  let el = document.getElementById("crm-storage-error-banner");
  if (!el) {
    el = document.createElement("div");
    el.id = "crm-storage-error-banner";
    el.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#B91C1C;color:#fff;" +
      "font:600 13px/1.5 system-ui,sans-serif;padding:12px 16px;display:flex;gap:12px;" +
      "align-items:center;justify-content:space-between;box-shadow:0 -2px 12px rgba(0,0,0,.25)";
    const msg = document.createElement("span");
    msg.textContent = quota
      ? "⛔ A böngésző tárhelye megtelt – a legutóbbi mentés NEM sikerült! Készíts biztonsági mentést és szabadíts fel helyet, mielőtt folytatod."
      : "⛔ Mentési hiba történt – a legutóbbi módosítás lehet, hogy NEM mentődött el. Töltsd újra az oldalt vagy készíts mentést.";
    const btn = document.createElement("button");
    btn.textContent = "✕";
    btn.style.cssText =
      "flex-shrink:0;background:transparent;color:#fff;border:1px solid #fff;border-radius:6px;" +
      "padding:3px 9px;cursor:pointer;font-weight:700";
    btn.onclick = () => el.remove();
    el.appendChild(msg);
    el.appendChild(btn);
    document.body.appendChild(el);
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  isDev
    ? <React.StrictMode><ErrorBoundary><App /></ErrorBoundary></React.StrictMode>
    : <ErrorBoundary><App /></ErrorBoundary>
)
