import React from 'react'
import { Sidebar } from '../components/Sidebar'
import { Header } from '../components/Header'
import { ErrorBoundary } from '../components/ErrorBoundary'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-[#09090b] text-[#fafafa] font-sans selection:bg-blue-500 selection:text-white">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-8 overflow-y-auto bg-[#09090b]">
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}

