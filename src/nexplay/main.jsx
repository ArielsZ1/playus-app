import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import NexplayApp from './NexplayApp.jsx'
import { guardarCodigoDeUrl } from './invitacion.js'
import '../index.css'

guardarCodigoDeUrl()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/nexplay">
      <NexplayApp />
    </BrowserRouter>
  </React.StrictMode>
)
