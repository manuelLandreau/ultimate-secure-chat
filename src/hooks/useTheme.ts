import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Vérifier les préférences stockées
    const savedTheme = localStorage.getItem('theme') as Theme | null
    
    // Vérifier les préférences système
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    return savedTheme || (prefersDark ? 'dark' : 'light')
  })

  useEffect(() => {
    // Mettre à jour le DOM
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    
    // Sauvegarder le thème
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark'
  }
} 