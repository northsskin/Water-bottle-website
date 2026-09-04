const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    thermometer: (
      <>
        <path d="M10 13.6V4.5a2 2 0 1 1 4 0v9.1a4.5 4.5 0 1 1-4 0Z" />
        <path d="M12 8.5v6" />
      </>
    ),
    cap: (
      <>
        <path d="M8 9h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" />
        <path d="M9.5 9V6.5A2.5 2.5 0 0 1 12 4a2.5 2.5 0 0 1 2.5 2.5V9" />
        <path d="M6 12.5h12M6 15.5h12" />
      </>
    ),
    drop: (
      <>
        <path d="M12 3.5s5.5 5.6 5.5 9.4a5.5 5.5 0 0 1-11 0C6.5 9.1 12 3.5 12 3.5Z" />
        <path d="M9.4 13.6a2.6 2.6 0 0 0 2.6 2.6" />
      </>
    ),
    leaf: (
      <>
        <path d="M4.5 19.5c0-8 5-13 15-13 0 10-5.4 13.6-11 13.6a4 4 0 0 1-4-.6Z" />
        <path d="M8 16c2.2-3.4 4.7-5.6 8-7" />
      </>
    ),
    arrow: <path d="M5 12h13m-5-5 5 5-5 5" />,
    check: <path d="m5 12.5 4.5 4.5L19 7" />,
  }

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      {paths[name] ?? null}
    </svg>
  )
}

export function Social({ name, className = 'h-4 w-4' }) {
  const paths = {
    instagram: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="17" cy="7" r="0.8" fill="currentColor" stroke="none" />
      </>
    ),
    x: <path d="M4.5 4.5 19.5 19.5M19.5 4.5 4.5 19.5" />,
    youtube: (
      <>
        <rect x="2.8" y="5.8" width="18.4" height="12.4" rx="4" />
        <path d="m10.4 9.6 4.8 2.4-4.8 2.4z" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      {paths[name] ?? null}
    </svg>
  )
}
