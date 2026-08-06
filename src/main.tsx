import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './renderer/App'
import './renderer/styles/tailwind.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
