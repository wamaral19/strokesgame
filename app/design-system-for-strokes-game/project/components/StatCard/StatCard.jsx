import React from 'react';

/**
 * SG category card — positive (green) or negative (red) tinted.
 * Shows category abbreviation, large SG value, and avg comparison line.
 */
export function StatCard({ category, value, avgLine, style = {} }) {
  const isPositive = typeof value === 'number' ? value >= 0 : String(value).startsWith('+');
  const textColor = isPositive ? 'var(--text-positive)' : 'var(--text-negative)';
  const bgColor = isPositive ? 'var(--bg-positive)' : 'var(--bg-negative)';
  const borderColor = isPositive ? 'var(--color-green-700)' : 'var(--color-red-100)';
  const formatted = typeof value === 'number'
    ? (value >= 0 ? '+' + value.toFixed(2) : value.toFixed(2))
    : value;

  return React.createElement('div', {
    style: {
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)',
      padding: 'var(--pad-card)',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      ...style,
    },
  },
    React.createElement('div', {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--text-2xs)',
        fontWeight: 'var(--weight-semibold)',
        letterSpacing: 'var(--tracking-label)',
        textTransform: 'uppercase',
        color: textColor,
        opacity: 0.75,
      },
    }, category),
    React.createElement('div', {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--text-3xl)',
        fontWeight: 'var(--weight-bold)',
        letterSpacing: 'var(--tracking-tight)',
        color: textColor,
        lineHeight: 1,
      },
    }, formatted),
    avgLine && React.createElement('div', {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--text-xs)',
        color: textColor,
        opacity: 0.7,
      },
    }, avgLine)
  );
}
