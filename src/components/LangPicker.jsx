// src/components/LangPicker.jsx
import { useEffect, useRef, useState } from 'react'
import { Globe } from 'lucide-react'
import { useI18n, setLang, getLang, t } from '../i18n/i18n'

export default function LangPicker() {
  const { lang } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const label = lang === 'pt-BR' ? 'PT' : 'EN'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-300"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{label}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden z-50"
        >
          <li>
            <button
              role="option"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${getLang()==='pt-BR' ? 'bg-slate-50' : ''}`}
              onClick={() => { setLang('pt-BR'); setOpen(false) }}
            >
              {t('lang.pt')}
            </button>
          </li>
          <li>
            <button
              role="option"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${getLang()==='en-US' ? 'bg-slate-50' : ''}`}
              onClick={() => { setLang('en-US'); setOpen(false) }}
            >
              {t('lang.en')}
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
