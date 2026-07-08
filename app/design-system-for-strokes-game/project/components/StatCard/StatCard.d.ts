export interface StatCardProps {
  /** Short category code e.g. 'PUTT', 'ARG', 'APP', 'OTT' */
  category: string;
  /** Numeric SG value or pre-formatted string '+2.28' / '-0.08' */
  value: number | string;
  /** Secondary line e.g. 'AVG +0.36 · -0.13'. Optional. */
  avgLine?: string;
  style?: React.CSSProperties;
}
