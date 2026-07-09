import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

// Full 50-950 shade ramps (Tailwind's canonical values) for each selectable
// accent. Applied by overriding the app's --color-primary-* CSS variables,
// which every bg-primary-*/text-primary-*/ring-primary-* utility already reads.
export const ACCENT_PALETTES = {
  Indigo: {
    swatch: '#6366f1',
    shades: {
      50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8',
      500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b',
    },
  },
  Emerald: {
    swatch: '#10b981',
    shades: {
      50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
      500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22',
    },
  },
  Rose: {
    swatch: '#f43f5e',
    shades: {
      50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185',
      500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519',
    },
  },
  Amber: {
    swatch: '#f59e0b',
    shades: {
      50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
      500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03',
    },
  },
  Sky: {
    swatch: '#0ea5e9',
    shades: {
      50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8',
      500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e', 950: '#082f49',
    },
  },
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('bix-theme')
    return saved || 'dark'
  })

  const [accentColor, setAccentColor] = useState(() => {
    const saved = localStorage.getItem('bix-accent')
    return saved && ACCENT_PALETTES[saved] ? saved : 'Indigo'
  })

  useEffect(() => {
    localStorage.setItem('bix-theme', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    localStorage.setItem('bix-accent', accentColor)
    const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.Indigo
    Object.entries(palette.shades).forEach(([shade, hex]) => {
      document.documentElement.style.setProperty(`--color-primary-${shade}`, hex)
    })
  }, [accentColor])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
