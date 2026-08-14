export function getInitialTheme(): boolean {
  const saved = localStorage.getItem('scq_theme')
  if (saved) return saved !== 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
}

export function applyTheme(isDark: boolean) {
  document.body.classList.toggle('dark-theme', isDark)
}

export function persistTheme(isDark: boolean) {
  localStorage.setItem('scq_theme', isDark ? 'dark' : 'light')
}
