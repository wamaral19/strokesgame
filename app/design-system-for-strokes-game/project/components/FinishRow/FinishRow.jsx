import React from 'react';

/**
 * A single notable finish row — finish position, tournament name, badge.
 * The left green accent and finish position are always green-700.
 */
export function FinishRow({ finish, tournament, badgeLabel, style = {} }) {
  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      padding: 'var(--pad-row)',
      gap: '20px',
      borderBottom: '1px solid var(--border-default)',
      borderLeft: '3px solid var(--color-green-700)',
      ...style,
    },
  },
    React.createElement('div', {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--text-base)',
        fontWeight: 'var(--weight-bold)',
        color: 'var(--text-positive)',
        minWidth: '32px',
      },
    }, finish),
    React.createElement('div', {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--text-base)',
        fontWeight: 'var(--weight-medium)',
        color: 'var(--text-primary)',
        flex: 1,
      },
    }, tournament),
    badgeLabel && React.createElement('span', {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--text-2xs)',
        fontWeight: 'var(--weight-semibold)',
        letterSpacing: 'var(--tracking-label)',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-sm)',
        padding: '3px 8px',
        whiteSpace: 'nowrap',
      },
    }, badgeLabel)
  );
}
