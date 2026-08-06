import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingProps {
  message?: string
  fullScreen?: boolean
}

export const Loading: React.FC<LoadingProps> = ({ message = 'Loading analytics data...', fullScreen = false }) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <Loader2 className="w-5 h-5 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
      </div>
      <p className="text-xs font-medium text-slate-400 tracking-wide">{message}</p>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        {content}
      </div>
    )
  }

  return content
}
