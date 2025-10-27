import React from 'react'
import { FiSun, FiMoon } from 'react-icons/fi'
import { useDarkMode } from '../context/DarkModeContext'

export default function DarkModeToggle({ className = '' }) {
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  return (
    <button
      onClick={toggleDarkMode}
      className={`
        relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 
        focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-800
        ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}
        ${className}
      `}
      role="switch"
      aria-checked={isDarkMode}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      <span className="sr-only">{isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}</span>
      
      {/* Toggle Circle */}
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg 
          ring-0 transition duration-200 ease-in-out flex items-center justify-center
          ${isDarkMode ? 'translate-x-6' : 'translate-x-0.5'}
        `}
      >
        {/* Simple circles instead of icons */}
        <span className={`
          w-2 h-2 rounded-full transition-colors duration-200
          ${isDarkMode ? 'bg-gray-700' : 'bg-yellow-400'}
        `}></span>
      </span>
      
      {/* Background indicators */}
      <span className={`
        absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] transition-opacity duration-200
        ${isDarkMode ? 'opacity-0' : 'opacity-100'}
      `}>
        ☀
      </span>
      <span className={`
        absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] transition-opacity duration-200
        ${isDarkMode ? 'opacity-100' : 'opacity-0'}
      `}>
        ☾
      </span>
    </button>
  )
}
