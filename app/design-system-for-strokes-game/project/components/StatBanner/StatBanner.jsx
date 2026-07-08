import React from 'react';

/**
 * Dark-green banner with up to 4 stat cells (eyebrow + value).
 * Used as the top-of-screen summary strip.
 */
export function StatBanner({ cells = [] }) {
  return React.createElement('div', {
    style: {
      background: 'var(--bg-banner)',
      display: 'grid',
      gridTemplateColumns: cells.map(() => '1fr').join(' '),
    },
  }, ...cells.map((cell, i) =>
    React.createElement('div', {
      key: i,
      style: {
        padding: 'var(--pad-banner)',
        borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.12)' : 'none',
      },
    },
      React.createElement('div', {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-2xs)',
          fontWeight: 'var(--weight-semibold)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          color: 'var(--text-on-dark-dim)',
          marginBottom: '6px',
        },
      }, cell.label),
      React.createElement('div', {
        style: {
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)',
          fontWeight: 'var(--weight-bold)',
          letterSpacing: 'var(--tracking-tight)',
          color: 'var(--text-on-dark)',
          lineHeight: 'var(--leading-tight)',
        },
      }, cell.value)
    )
  ));
}
