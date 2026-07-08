export interface StatBannerCell {
  /** ALL CAPS eyebrow label */
  label: string;
  /** Formatted display value e.g. 'No. 27', '$7,216,000', '0' */
  value: string;
}

export interface StatBannerProps {
  /** Up to 4 stat cells displayed in equal columns */
  cells: StatBannerCell[];
}
