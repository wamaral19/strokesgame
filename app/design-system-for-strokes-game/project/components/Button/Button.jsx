import React from 'react';

/**
 * Pill button — primary (black fill) or secondary (outline).
 * All labels are rendered ALL CAPS via CSS.
 */
export function Button({ label, variant = 'primary', onClick, disabled = false, style = {} }) {
  const base = {
    fontFamily: 'var(--font-ui)',
    fontSize: 'var(--text-2xs)',
    fontWeight: 'var(--weight-bold)',
    letterSpacing: 'var(--tracking-label)',
    textTransform: 'uppercase',
    borderRadius: 'var(--radius-pill)',
    padding: '10px 22px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-block',
    whiteSpace: 'nowrap',
    opacity: disabled ? 0.45 : 1,
    transition: 'opacity 120ms ease',
    lineHeight: 1,
  };

  const variants = {
    primary: {
      background: 'var(--btn-primary-bg)',
      color: 'var(--btn-primary-text)',
      border: 'none',
    },
    secondary: {
      background: 'transparent',
      color: 'var(--btn-secondary-text)',
      border: '1.5px solid var(--btn-secondary-border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: 'none',
      padding: '10px 12px',
    },
  };

  return React.createElement('button', {
    style: { ...base, ...variants[variant], ...style },
    onClick,
    disabled,
    onMouseEnter: e => { if (!disabled) e.currentTarget.style.opacity = '0.78'; },
    onMouseLeave: e => { if (!disabled) e.currentTarget.style.opacity = '1'; },
  }, label);
}
