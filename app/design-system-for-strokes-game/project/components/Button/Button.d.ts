/**
 * @startingPoint section="Components" subtitle="Primary & secondary pill buttons" viewport="700x120"
 */
export interface ButtonProps {
  /** Button label — rendered ALL CAPS automatically */
  label: string;
  /** Visual style. Default: 'primary' */
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}
