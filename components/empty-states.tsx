"use client";

export function EmptyComet() {
  return (
    <svg viewBox="0 0 200 90" className="mx-auto w-40" aria-hidden>
      <defs>
        <linearGradient id="empty-comet" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FCDB64" />
          <stop offset="100%" stopColor="#BC8330" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform="rotate(-18 100 45)">
        <rect x="20" y="42" width="120" height="4" rx="2" fill="url(#empty-comet)" opacity="0.8" />
        <circle cx="140" cy="44" r="7" fill="#FCDB64" opacity="0.9" />
      </g>
      <circle cx="40" cy="20" r="2" fill="#E6FFC9" opacity="0.5" />
      <circle cx="170" cy="25" r="1.5" fill="#A6D95F" opacity="0.5" />
      <circle cx="150" cy="70" r="1.5" fill="#E6FFC9" opacity="0.4" />
    </svg>
  );
}

export function EmptyCity() {
  return (
    <svg viewBox="0 0 220 80" className="mx-auto w-44" aria-hidden>
      <circle cx="180" cy="22" r="10" fill="#FCDB64" opacity="0.5" />
      <path
        d="M0 80 V56 H30 V44 H60 V62 H95 V38 H125 V58 H160 V48 H190 V66 H220 V80 Z"
        fill="#041A19"
        stroke="#BC8330"
        strokeWidth="1"
        opacity="0.9"
      />
      <circle cx="35" cy="18" r="1.5" fill="#E6FFC9" opacity="0.5" />
      <circle cx="120" cy="14" r="2" fill="#E6FFC9" opacity="0.4" />
    </svg>
  );
}

export function EmptyConstellation() {
  return (
    <svg viewBox="0 0 220 80" className="mx-auto w-44" aria-hidden>
      <polyline
        points="20,60 60,35 100,50 140,25 180,40"
        fill="none"
        stroke="#BC8330"
        strokeWidth="0.8"
        opacity="0.5"
      />
      <circle cx="20" cy="60" r="2.5" fill="#E6FFC9" opacity="0.7" />
      <circle cx="60" cy="35" r="2" fill="#E6FFC9" opacity="0.6" />
      <circle cx="100" cy="50" r="2.5" fill="#E6FFC9" opacity="0.7" />
      <circle cx="140" cy="25" r="2" fill="#E6FFC9" opacity="0.6" />
      <circle cx="180" cy="40" r="2.5" fill="#E6FFC9" opacity="0.7" />
      <circle cx="200" cy="15" r="1.5" fill="#A6D95F" opacity="0.5" />
    </svg>
  );
}
