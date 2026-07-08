import React from 'react';

/**
 * A single SG-category player pick row.
 * Shows the category eyebrow, player name + year, and numeric SG value.
 * Used in the "current picks" grid (2-column layout managed by parent).
 */
export function PlayerRow({ category, playerName, year, sgValue, style = {} }) {
  const isPositive = typeof sgValue === 'number' ? sgValue >= 0 : String(sgValue).startsWith('+');
  const valColor = isPositive ? 'var(--text-positive)' : 'var(--text-negative)';
  const formatted = typeof sgValue === 'number'
    ? (sgValue >= 0 ? '+' + sgValue.toFixed(2) : sgValue.toFixed(2))
    : sgValue;

  return React.createElement('div', {
    style: {
      padding: 'var(--pad-row)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      ...style,
    },
  },
    React.createElement('div', null,
      React.createElement('div', {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-2xs)',
          fontWeight: 'var(--weight-semibold)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          marginBottom: '3px',
        },
      }, category),
      React.createElement('div', {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-base)',
          fontWeight: 'var(--weight-medium)',
          color: 'var(--text-primary)',
        },
      }, year ? `${playerName}, ${year}` : playerName)
    ),
    React.createElement('div', {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--text-base)',
        fontWeight: 'var(--weight-semibold)',
        color: valColor,
        whiteSpace: 'nowrap',
      },
    }, formatted)
  );
}
