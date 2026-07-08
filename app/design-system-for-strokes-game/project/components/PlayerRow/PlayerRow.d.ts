export interface PlayerRowProps {
  /** SG category label e.g. 'SG: PUTTING', 'SG: APPROACH' */
  category: string;
  playerName: string;
  /** Season year e.g. 2026. Optional — omit for All Time picks. */
  year?: number | string;
  /** Numeric SG value or pre-formatted string */
  sgValue: number | string;
  style?: React.CSSProperties;
}
