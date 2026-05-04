import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { Toaster } from "@/components/ui/sonner"
import ErrorBoundary from "@/components/ErrorBoundary"
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TRPCProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
        <Toaster position="top-right" richColors />
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>,
)
