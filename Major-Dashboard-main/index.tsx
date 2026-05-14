
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(<App />);
  } catch (err) {
    console.error("Mounting Error:", err);
    rootElement.innerHTML = `<div style="color: white; padding: 20px; font-family: monospace;">
      <h1>Critical System Failure</h1>
      <pre>${err instanceof Error ? err.message : String(err)}</pre>
    </div>`;
  }
}
