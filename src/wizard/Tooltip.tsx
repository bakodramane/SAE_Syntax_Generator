import type { ReactNode } from 'react'

interface TooltipProps {
  text: string
  children: ReactNode
}

export function Tooltip({ text, children }: TooltipProps) {
  return (
    <span className="relative inline-flex items-center group">
      {children}
      <span
        role="tooltip"
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 px-3 py-2
                   bg-gray-800 text-white text-xs rounded shadow-lg leading-snug
                   opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity
                   z-50 whitespace-normal"
      >
        {text}
      </span>
    </span>
  )
}

export function InfoIcon() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center w-4 h-4 rounded-full
                 bg-gray-200 text-gray-500 text-xs font-bold ml-1 cursor-help select-none"
    >
      ?
    </span>
  )
}
