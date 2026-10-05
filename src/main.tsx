import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isWhyPath } from './site.ts'
import Why from './Why.tsx'

const page = isWhyPath(window.location.pathname) ? <Why /> : <App />

createRoot(document.getElementById('root')!).render(<StrictMode>{page}</StrictMode>)
