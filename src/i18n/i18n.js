// src/i18n/i18n.js
import { useEffect, useState } from 'react'
import { DICTS } from './dicts'

const STORAGE_KEY = 'cpb.lang'
const DEFAULT_LANG = 'pt-BR'
let currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG
document.documentElement.lang = currentLang

const listeners = new Set()
function notify() { listeners.forEach(fn => fn(currentLang)) }

export function setLang(lang) {
  if (!DICTS[lang]) return
  currentLang = lang
  localStorage.setItem(STORAGE_KEY, lang)
  document.documentElement.lang = lang
  notify()
}
export function getLang() { return currentLang }

function interpolate(str, vars) {
  if (!vars) return str
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] ?? ''))
}

export function t(key, vars) {
  const dict = DICTS[currentLang] || {}
  const fallback = DICTS['en-US'] || {}
  const raw = dict[key] ?? fallback[key] ?? key
  return interpolate(raw, vars)
}

export function useI18n() {
  const [lang, set] = useState(currentLang)
  useEffect(() => {
    const sub = (l) => set(l)
    listeners.add(sub)
    return () => listeners.delete(sub)
  }, [])
  return { lang, t, setLang }
}
