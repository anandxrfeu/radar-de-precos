import { useEffect, useMemo, useRef, useState } from 'react'
import { Settings, ExternalLink, AlertCircle, X } from 'lucide-react'
import { t, useI18n } from './i18n/i18n'
import LangPicker from './components/LangPicker'


const CITIES = [
  { code: 'SP',  name: 'São Paulo',       short: 'São Paulo' },
  { code: 'RIO', name: 'Rio de Janeiro',  short: 'Rio' },
  { code: 'BH',  name: 'Belo Horizonte',  short: 'BH' },
  { code: 'CWB', name: 'Curitiba',        short: 'CWB' },
  { code: 'POA', name: 'Porto Alegre',    short: 'POA' },
  { code: 'SSA', name: 'Salvador',        short: 'SSA' },
  { code: 'REC', name: 'Recife',          short: 'REC' },
  { code: 'BSB', name: 'Brasília',        short: 'BSB' },
]

// Sidebar width (desktop)
const SIDEBAR_REM = 22
const SIDEBAR_CSS = `${SIDEBAR_REM}rem`

// Live SerpAPI locations for Brazil cities
const CITY_LOCATION = {
  SP:  'São Paulo, State of São Paulo, Brazil',
  RIO: 'Rio de Janeiro, State of Rio de Janeiro, Brazil',
  BH:  'Belo Horizonte, State of Minas Gerais, Brazil',
  CWB: 'Curitiba, State of Paraná, Brazil',
  POA: 'Porto Alegre, State of Rio Grande do Sul, Brazil',
  SSA: 'Salvador, State of Bahia, Brazil',
  REC: 'Recife, State of Pernambuco, Brazil',
  BSB: 'Brasília, Federal District, Brazil',
}

function formatBRL(value) {
  if (value == null || Number.isNaN(value)) return '—'
  try {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  } catch {
    return `R$ ${Math.round(value)}`
  }
}

function parseBRLString(str = '') {
  // e.g., "R$ 183,38 agora" -> 183.38
  const cleaned = String(str).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function faviconFor(urlStr) {
  try {
    const u = new URL(urlStr)
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=16`
  } catch {
    return `https://www.google.com/s2/favicons?domain=example.com&sz=16`
  }
}

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : initialValue
  })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)) }, [key, value])
  return [value, setValue]
}

function nowTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// === LIVE: fetch Shopping results from SerpAPI directly (env var required) ===
async function fetchCityOffers(productName, cityCode, apiKey) {
  // small UX jitter so loaders are visible
  await new Promise(r => setTimeout(r, 120 + Math.random() * 420))

  const params = new URLSearchParams({
    engine: 'google_shopping',
    q: productName,
    location: CITY_LOCATION[cityCode] || 'Brazil',
    hl: 'pt',
    gl: 'br',
    google_domain: 'google.com.br',
    //api_key: import.meta.env.VITE_SERPAPI_KEY
    api_key: apiKey
  })

  const res = await fetch(`/serpapi/search.json?${params}`);
  if (!res.ok) return null
  const json = await res.json()

  const rows = json?.shopping_results ?? []
  const offers = rows.map(r => {
    const price = r.extracted_price ?? parseBRLString(r.price)
    const merchant = r.source || r.store || '—'
    const url = r.product_link || r.link || '#'
    return (typeof price === 'number') ? { price, merchant, url, shipping: r.delivery || '' } : null
  }).filter(Boolean).sort((a, b) => a.price - b.price)

  if (!offers.length) return null
  return {
    cheapest: offers[0],
    offers: offers.slice(0, 5),
    time: nowTime(),
    mismatch: false
  }
}

export default function App() {
  const headerRef = useRef(null)
  const shellRef = useRef(null)

  const [productsText, setProductsText] = useLocalStorage('cpb.products', '')
  const [selectedCities, setSelectedCities] = useLocalStorage('cpb.cities', CITIES.map(c => c.code))
  const [apiKey, setApiKey] = useLocalStorage('cpb.serpapiKey', '')
  const [showSettings, setShowSettings] = useState(false)
  const [results, setResults] = useState({})
  const [hasRequested, setHasRequested] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [lastUpdated, setLastUpdated] = useState('')
  const [popover, setPopover] = useState({ open: false, product: null, city: null, pos: { x: 0, y: 0 } })

  const products = useMemo(() => productsText.split('\n').map(s => s.trim()).filter(Boolean), [productsText])
  const selectedSet = useMemo(() => new Set(selectedCities), [selectedCities])
  const { lang } = useI18n() // causes re-render when language changes

  const hasSelection = selectedRows.length > 0

  // when products are cleared, go back to the empty state
  useEffect(() => {
    if (products.length === 0) setHasRequested(false)
  }, [products.length])

  // Keep CSS vars in sync: header height, container left/right, sidebar width
  useEffect(() => {
    const setVars = () => {
      const headerH = headerRef.current?.offsetHeight ?? 0
      document.documentElement.style.setProperty('--app-header-h', `${headerH}px`)
      document.documentElement.style.setProperty('--stack-gap', '16px')

      const rect = shellRef.current?.getBoundingClientRect()
      const left = (rect?.left ?? 0) + window.scrollX
      const right = Math.max(0, window.innerWidth - ((rect?.right ?? 0) + window.scrollX))

      document.documentElement.style.setProperty('--shell-left', `${left}px`)
      document.documentElement.style.setProperty('--shell-right', `${right}px`)
      document.documentElement.style.setProperty('--sidebar-w', SIDEBAR_CSS)
    }

    setVars()
    const ro = new ResizeObserver(setVars)
    if (headerRef.current) ro.observe(headerRef.current)
    if (shellRef.current) ro.observe(shellRef.current)
    window.addEventListener('resize', setVars)
    return () => { ro.disconnect(); window.removeEventListener('resize', setVars) }
  }, [])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setPopover(p => ({ ...p, open: false })) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function toggleCity(code) {
    setSelectedCities(prev => {
      const s = new Set(prev)
      if (s.has(code)) s.delete(code); else s.add(code)
      return Array.from(s)
    })
  }
  function selectAllCities() {
    if (selectedCities.length === CITIES.length) setSelectedCities([])
    else setSelectedCities(CITIES.map(c => c.code))
  }


  async function getPrices({ onlyProducts = null } = {}) {

    if (!apiKey) { setHasRequested(false); setError(true); return }
    setError(false); setLoading(true); setHasRequested(true)
    const targetProducts = onlyProducts ? products.filter(p => onlyProducts.includes(p)) : products
    const next = {}
    products.forEach(p => {
      next[p] = {}
      CITIES.forEach(c => { if (selectedSet.has(c.code)) next[p][c.code] = null })
    })
    setResults(next)
    try {
      const tasks = []
      for (const p of targetProducts) {
        for (const c of CITIES) {
          if (!selectedSet.has(c.code)) continue
          tasks.push(fetchCityOffers(p, c.code, apiKey).then(res => { next[p] ||= {}; next[p][c.code] = res }))
        }
      }
      await Promise.all(tasks)
      setResults({ ...next }); setLastUpdated(nowTime())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  function openPopover(product, city, rect) {
    const pad = 12, vw = window.innerWidth, popW = Math.min(vw * 0.92, 420)
    const x = Math.min(Math.max(rect.left + rect.width / 2 - popW / 2, pad), vw - popW - pad)
    const y = rect.bottom + 8 + window.scrollY
    setPopover({ open: true, product, city, pos: { x, y } })
  }

  const Loader = () => (
    <div className="mt-6">
      <div className="overflow-x-auto">
        <div className="min-w-[900px] space-y-3">
          <div className="h-8 bg-slate-100 animate-pulse" />
          <div className="h-16 bg-slate-100 animate-pulse" />
          <div className="h-16 bg-slate-100 animate-pulse" />
          <div className="h-16 bg-slate-100 animate-pulse" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="bg-white text-slate-900 min-h-screen">
      {/* App shell */}
      <div ref={shellRef} className="app-shell mx-auto max-w-[120rem] px-4 sm:px-6 lg:px-8 pb-24 md:pb-0">

        {/* Sticky header */}


        <header ref={headerRef} className="sticky top-0 z-40 bg-white/70 backdrop-blur">
  <div className="flex items-center justify-between py-4 md:py-5 gap-4">
    {/* Brand + title */}
    <a href="/" className="flex items-center gap-3 min-w-0">
      {/* Logo: uses GIF when motion is allowed, SVG when reduced motion is set */}
      <picture className="shrink-0">
        <source srcSet="/brand/radar-mark.svg" media="(prefers-reduced-motion: reduce)" />
        <img
          src="/brand/radar-radar.gif"
          alt="Radar de Preços"
          className="h-13 w-13 md:h-14 md:w-14 rounded-xl"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      </picture>

      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight truncate">
          {t('app.title')}
        </h1>
        <p className="mt-1 text-sm md:text-base text-slate-500 truncate">
          {t('app.subtitle')}
        </p>
      </div>
    </a>

    {/* Right actions — desktop only */}
    <div className="hidden md:flex items-center gap-2">
      <LangPicker />
              <button
                onClick={() => setShowSettings(true)}
                className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 bg-white"
                aria-label={t('settings.title')}
              >
                <Settings className="w-5 h-5" />
                <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${apiKey ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </button>
    </div>
  </div>
</header>

{/* Mobile actions — shown under the header, before the steps */}
<div className="md:hidden flex justify-end gap-2 mt-2">
  {/* reuse the exact same controls */}
   <LangPicker />
              <button
                onClick={() => setShowSettings(true)}
                className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 bg-white"
                aria-label={t('settings.title')}
              >
                <Settings className="w-5 h-5" />
                <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${apiKey ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </button>
</div>




        {/* Mobile controls (stacked) */}
<div className="md:hidden mt-4 space-y-4 bg-slate-50 border border-slate-200 p-4">
  <section>
    <div className="text-xs font-semibold tracking-widest text-slate-600">{t('steps.step1')}</div>
    <h2 className="text-base font-semibold mt-1">{t('steps.addProducts')}</h2>
    <textarea
      rows={2}
      value={productsText}
      onChange={e => setProductsText(e.target.value)}
      className="mt-3 w-full border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 bg-white px-4 py-3 text-[15px] leading-6 placeholder-slate-400"
      placeholder={`iPhone 16 128GB\nGalaxy S21 128GB`}
    />
  </section>

  <section>
    <div className="text-xs font-semibold tracking-widest text-slate-600">{t('steps.step2')}</div>
    <h2 className="text-base font-semibold mt-1">{t('steps.chooseCities')}</h2>
    <div className="mt-3 flex items-center justify-between">
      <span className="text-sm text-slate-700">{t('steps.citiesLabel')}</span>
      <button
        onClick={selectAllCities}
        className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2"
      >
        {t('steps.selectAll')}
      </button>
    </div>
    <div className="mt-2 flex flex-wrap gap-2">
      {CITIES.map(city => {
        const selected = selectedSet.has(city.code)
        return (
          <button
            key={city.code}
            type="button"
            onClick={() => toggleCity(city.code)}
            aria-pressed={selected}
            className={`px-3 py-1.5 text-sm rounded-md border ${
              selected
                ? 'bg-blue-50 text-[#1e3a8a] border-blue-200'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            {city.name}
          </button>
        )
      })}
    </div>
  </section>

  <div className="pt-1">
    <button
      onClick={() => getPrices()}
      className="block mx-auto w-full text-base font-medium px-4 py-2.5 rounded-lg bg-[#2563eb] text-white hover:bg-[#1e55c7] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
    >
      {t('buttons.getPrices')}
    </button>
  </div>
</div>



        {/* Main content (desktop): same layout you had, with CITY as sticky first column and products as columns */}
        <main className="mt-[var(--stack-gap,16px)] md:ml-[var(--sidebar-w)] md:pl-8">

          {error && (
            <div className="mb-4 flex items-start justify-between gap-4 border border-red-200 bg-red-50 text-red-800 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div className="text-sm">
                  <div className="font-medium">{t('error.title')}</div>
                  <div className="text-red-700/80">{t('error.body')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setError(false); getPrices() }} className="border border-red-200 bg-white text-red-700 px-3 py-1.5 text-sm hover:border-red-300 hover:text-red-900">{t('error.tryAgain')}</button>
                <button onClick={() => setError(false)} className="p-2 hover:bg-red-100" aria-label="Dismiss error">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}


          {/* Key hint */}
          {!apiKey && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-2 text-sm">
              {t('key.hint')}
            </div>
          )}

        {apiKey && !hasRequested && (<div className="mb-3 rounded-lg border border-blue-200 text-center bg-blue-50 text-blue-900 px-4 py-2 text-sm">
              {t('empty.hint')}
            </div>)}

        {hasRequested && loading && <Loader />}
        {hasRequested && !loading && products.length > 0 && (

          <>
            {hasRequested && (
            <div className="mb-2 text-sm text-slate-600" aria-live="polite">
                {lastUpdated ? t('table.lastUpdated', { time: lastUpdated }) : t('table.lastUpdated', { time: '—' })}
                <span className="text-xs text-slate-400">{t('table.localeBadge')}</span>
            </div>
            )}

            {/* desktop table */}
              <div className="relative overflow-x-auto hidden md:block">
                {/* left scrim (scoped to the table body) */}
                <div
                   className="hidden md:block pointer-events-none absolute z-20 bg-white"
                  style={{ left: 0, top: '48px', bottom: 0, width: '220px' }}
                />


                 <table className="inline-table w-auto border-separate border-spacing-0">
                  <thead className="sticky top-0 z-40">
                    <tr>
                      <th className="sticky left-0 z-30 bg-slate-50 px-4 py-3 w-[220px] min-w-[220px] max-w-[220px] text-left text-[13px] font-bold text-slate-600 uppercase tracking-wide">
                         {t('table.city')}
                      </th>
                        {products.map((p) => (
                          <th
                            key={p}
                            title={p}
                            className="bg-slate-50 px-4 py-3 min-w-[220px] max-w-[320px] truncate text-left text-[13px] font-bold text-slate-600 uppercase tracking-wide"
                          >
                          {p}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="align-top">
                    {CITIES.filter(c => selectedSet.has(c.code)).map((city, rowIdx) => (
                      <tr
                        key={city.code}
                        className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50 rounded-xs'}
                        >
                        {/* sticky City cell */}
                        <td className="align-top px-4 py-3 sticky left-0 bg-inherit z-20 w-[220px] min-w-[220px] max-w-[220px]">
                          <div className="text-sm font-medium text-slate-900">{city.name}</div>
                        </td>

                        {/* Product columns */}
                        {products.map((product) => {
                          const cell = results?.[product]?.[city.code]
                          if (!cell) {
                            return (
                              <td key={product} className="align-top px-4 py-3">
                                <div className="h-14 flex items-center">
                                  <div className="inline-flex items-center gap-2 text-slate-400">
                                    <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></span>
                                    <span className="text-sm">{t('table.loading')}</span>
                                  </div>
                                </div>
                              </td>
                            )
                          }
                          if (cell === null) {
                            return (
                              <td key={product} className="align-top px-4 py-3">
                                <div className="text-sm text-slate-400">{t('table.noResult')}</div>
                              </td>
                            )
                          }
                          return (
                            <td key={product} className="align-top px-4 py-3">
                              <CellContent
                                city={city}
                                product={product}
                                cell={cell}
                                onOpen={(rect) => openPopover(product, city.code, rect)}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>


            {/* mobile cards */}
            <ResultsMobile
              products={products}
              selectedSet={selectedSet}
              results={results}
              openPopover={openPopover}
            />




            </>
          )}
        </main>

        {/* Mobile footer (bottom of the page on mobile) */}
<div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-50/95 backdrop-blur border-slate-200 pb-2" role="contentinfo">
  <div className="mx-auto max-w-[120rem] px-4 sm:px-6 lg:px-8 py-2 text-center text-[12px] text-slate-500 pb-[env(safe-area-inset-bottom)]">
    {t('footer.text')}
  </div>
</div>


      </div>


      {/* FIXED SIDEBAR (desktop only) */}
        <aside
          className="hidden md:block fixed z-30 bg-slate-50 overflow-auto"
          style={{
            left: 'var(--shell-left, 0px)',
            top: 'calc(var(--app-header-h, 0px) + var(--stack-gap, 16px))',
            bottom: 0,
            width: 'var(--sidebar-w, 22rem)',
          }}
        >
          <div className="pl-4 sm:pl-6 lg:pl-8 pr-6 py-5 flex flex-col h-full">
            {/* STEP 1 */}
            <section>
              <div className="text-xs font-semibold tracking-widest text-slate-600">{t('steps.step1')}</div>
              <h2 className="text-base font-semibold mt-1">{t('steps.addProducts')}</h2>
              <textarea
                rows={6}
                value={productsText}
                onChange={e => setProductsText(e.target.value)}
                className="mt-3 w-full border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 bg-white px-4 py-3 text-[15px] leading-6 placeholder-slate-400"
                placeholder={`iPhone 16 128GB\nGalaxy S21 128GB`}
              />
            </section>

            {/* STEP 2 */}
            <section className="mt-6">
              <div className="text-xs font-semibold tracking-widest text-slate-600">{t('steps.step2')}</div>
              <h2 className="text-base font-semibold mt-1">{t('steps.chooseCities')}</h2>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-slate-700">{t('steps.citiesLabel')}</span>
                <button onClick={selectAllCities} className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2">
                  {t('steps.selectAll')}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {CITIES.map(city => {
                  const selected = selectedSet.has(city.code)
                  return (
                    <button
                      key={city.code}
                      type="button"
                      onClick={() => toggleCity(city.code)}
                      aria-pressed={selected}
                      className={`px-3 py-2 text-sm rounded-md border ${
                        selected ? 'bg-blue-50 text-[#1e3a8a] border-blue-200' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {city.name}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* ACTION */}
            <div className="pt-6">
              <button
                onClick={() => getPrices()}
                disabled={loading || products.length === 0 || selectedSet.size === 0}
                className={`block mx-auto w-full text-base font-medium px-4 py-2.5 rounded-lg text-white focus:outline-none focus:ring-2
                  ${loading || products.length === 0 || selectedSet.size === 0
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-[#2563eb] hover:bg-[#1e55c7] focus:ring-blue-500/30'}`}
              >
                {loading ? t('buttons.loading') : t('buttons.getPrices')}
              </button>
            </div>

            {/* Sidebar footer (desktop) */}
            <div className="mt-auto sticky bottom-0 pt-3 border-slate-200 bg-slate-50 text-[12px] text-slate-500 text-center">
              {t('footer.text')}
            </div>


          </div>
        </aside>

      {showSettings && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setShowSettings(false)} />
          <SettingsModal
            initialKey={apiKey}
            onSave={(k) => { setApiKey(k.trim()); setShowSettings(false) }}
            onClose={() => setShowSettings(false)}
          />
        </>
      )}


      {/* Popover */}
      {popover.open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/10" onClick={() => setPopover(p => ({ ...p, open: false }))} />
          <div className="fixed z-50 w-[min(92vw,420px)] border border-slate-200 rounded-xl bg-white p-4" style={{ left: popover.pos.x, top: popover.pos.y }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-semibold tracking-tight text-slate-900">

                  {t('popover.title', { product: popover.product, city: CITIES.find(c => c.code===popover.city)?.name })}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{t('popover.top5')}</p>
              </div>
              <button onClick={() => setPopover(p => ({ ...p, open: false }))} className="p-2 hover:bg-slate-100" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {(results?.[popover.product]?.[popover.city]?.offers || []).map((o, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    <img src={faviconFor(o.url)} className="w-4 h-4 rounded-sm" />
                    <div className="text-sm text-slate-800 truncate" title={o.merchant}>{o.merchant}</div>
                  </div>
                  <div className="text-sm font-medium text-slate-900 font-mono tabular-nums">{formatBRL(o.price)}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CellContent({ city, product, cell, onOpen }) {
  const { cheapest } = cell
  return (
    <div className="group relative p-2 hover:bg-slate-200 rounded-xs cursor-pointer">
      <div className="text-[15px] font-semibold tracking-tight text-slate-900 font-mono tabular-nums">{formatBRL(cheapest.price)}</div>
      <div className="mt-1 flex items-center gap-1.5 min-w-0">
        <img src={faviconFor(cheapest.url)} alt="" className="w-3.5 h-3.5 rounded-sm shrink-0" />
        <span className="text-xs text-slate-600 truncate" title={cheapest.merchant}>{cheapest.merchant}</span>
        <a href={cheapest.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-slate-500 hover:text-slate-900 p-1" aria-label="Open merchant">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      <div className="mt-1 text-[11px] text-slate-400">{cell.time}</div>
      <button
        className="absolute inset-0"
        aria-label={`Open ${product} offers in ${city.name}`}
        onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
      />
    </div>
  )
}

function SettingsModal({ initialKey, onSave, onClose }) {
  const [value, setValue] = useState(initialKey || '')
  const [show, setShow] = useState(false)

  return (
    <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,520px)] rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
      <h3 className="text-lg font-semibold tracking-tight">{t('settings.title')}</h3>
      <p className="mt-1 text-sm text-slate-600">
        {t('settings.subtitle')}
      </p>

      <label className="mt-4 block text-sm font-medium text-slate-700">{t('settings.keyLabel')}</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => setValue(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          placeholder="xx_xxx..."
        />
        <button
          onClick={() => setShow(v => !v)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {show ? t('settings.hide') : t('settings.show')}
        </button>
      </div>

      <div className="mt-3 text-xs leading-5 text-slate-500">
        {t('settings.keyHelp')}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-2 rounded-lg border border-slate-200">{t('settings.cancel')}</button>
        <button
          onClick={() => onSave(value)}
          className="px-4 py-2 rounded-lg bg-[#2563eb] text-white hover:bg-[#1e55c7]"
          disabled={!value.trim()}
        >
          {t('settings.save')}
        </button>
      </div>
    </div>
  )
}

function ResultsMobile({ products, selectedSet, results, openPopover }) {
  // Show only on small screens
  return (
    <div className="md:hidden space-y-4">
      {Array.from(selectedSet).map(code => {
        const city = CITIES.find(c => c.code === code)
        if (!city) return null
        return (
          <div key={code} className="rounded-xl border border-slate-200 bg-white">
            <div className="px-4 py-2.5 text-sm font-semibold tracking-tight">{city.name}</div>
            <ul className="divide-y divide-slate-100">
              {products.map(product => {
                const cell = results?.[product]?.[code]
                return (
                  <li key={product} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] text-slate-600 truncate" title={product}>
                          {product}
                        </div>

                        {cell ? (
                          <>
                            <div className="mt-1 flex items-center gap-1.5 min-w-0">
                              <img
                                src={faviconFor(cell.cheapest.url)}
                                className="w-3.5 h-3.5 rounded-sm shrink-0"
                                alt=""
                              />
                              <span
                                className="text-xs text-slate-600 truncate"
                                title={cell.cheapest.merchant}
                              >
                                {cell.cheapest.merchant}
                              </span>
                              <button
                                className="ml-1 p-1 rounded hover:bg-slate-100 text-slate-500"
                                aria-label={t('a11y.openOffers')}
                                onClick={(e) =>
                                  openPopover(product, code, e.currentTarget.getBoundingClientRect())
                                }
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-400">{cell.time}</div>
                          </>
                        ) : (
                          <div className="mt-1 text-sm text-slate-400">No result</div>
                        )}
                      </div>

                      <div className="shrink-0 text-[15px] font-semibold font-mono tabular-nums">
                        {cell ? formatBRL(cell.cheapest.price) : '—'}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
