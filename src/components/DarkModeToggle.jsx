import React from 'react'
import { useDarkMode } from '../context/DarkModeContext'

export default function DarkModeToggle({ className = '' }) {
  const { toggleDarkMode } = useDarkMode()

  return (
    <button
      id="theme-toggle"
      type="button"
      onClick={toggleDarkMode}
      className={className}
      aria-label="Toggle color palette"
    >
      <span className="visually-hidden">Toggle color palette</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="-50 -50 100 100"
        width="1em"
        height="1em"
      >
        <defs>
          <circle id="circle" r="7" />
          <mask id="mask--circle">
            <use transform="scale(4)" xlinkHref="#circle" fill="white" />
            <g transform="translate(20 -20)">
              <g id="shadow" transform="scale(0)">
                <use transform="scale(4)" xlinkHref="#circle" fill="black" />
              </g>
            </g>
          </mask>
        </defs>

        <g fill="currentColor">
          <g id="body" transform="scale(0.75) rotate(90)">
            <g mask="url(#mask--circle)">
              <use transform="scale(4)" xlinkHref="#circle" />
            </g>
          </g>

          <g id="appendages">
            <g>
              <use transform="rotate(0) translate(0 38)" xlinkHref="#circle" />
            </g>
            <g>
              <use transform="rotate(60) translate(0 38)" xlinkHref="#circle" />
            </g>
            <g>
              <use transform="rotate(120) translate(0 38)" xlinkHref="#circle" />
            </g>
            <g>
              <use transform="rotate(180) translate(0 38)" xlinkHref="#circle" />
            </g>
            <g>
              <use transform="rotate(240) translate(0 38)" xlinkHref="#circle" />
            </g>
            <g>
              <use transform="rotate(300) translate(0 38)" xlinkHref="#circle" />
            </g>
          </g>
        </g>
      </svg>
    </button>
  )
}

