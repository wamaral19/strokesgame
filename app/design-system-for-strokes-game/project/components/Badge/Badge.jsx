import React from 'react';

/**
 * Tournament-type badge. Renders PLAYOFF / SIGNATURE / REGULAR
 * (or any custom label) in a small outlined chip.
 */
export function Badge({ label, style = {} }) {
  return React.createElement('span', {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-2xs)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius-sm)',
      padding: '3px 7px',
      whiteSpace: 'nowrap',
      lineHeight: 1,
      display: 'inline-block',
      background: 'transparent',
      ...style,
    },
  }, label);
}
