export interface FinishRowProps {
  /** Finish position string e.g. 'T5', 'T3', 'T2' */
  finish: string;
  /** Tournament full name */
  tournament: string;
  /** Optional badge label e.g. 'PLAYOFF', 'SIGNATURE', 'REGULAR' */
  badgeLabel?: string;
  style?: React.CSSProperties;
}
