import React from 'react'
import { FiSun, FiMoon } from 'react-icons/fi'
import { useDarkMode } from '../context/DarkModeContext'

export default function DarkModeToggle({ className = '' }) {
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  return (
    <button
      onClick={toggleDarkMode}
      className={`
        relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-transparent 
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 
        focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-800
        ${isDarkMode ? 'bg-red-600' : 'bg-gray-200'}
        ${className}
      `}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      <div className="relative flex items-center justify-center w-4 h-4">
        <FiSun 
          className={`
            absolute h-4 w-4 text-yellow-500 transition-all duration-200 ease-in-out
            ${isDarkMode ? 'opacity-0 rotate-180 scale-0' : 'opacity-100 rotate-0 scale-100'}
          `} 
        />
        <FiMoon 
          className={`
            absolute h-4 w-4 text-white transition-all duration-200 ease-in-out
            ${isDarkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-180 scale-0'}
          `} 
        />
      </div>
    </button>
  )
}
