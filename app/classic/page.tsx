import { StrokesGainedGame } from "../components/strokes-gained-game";

export const metadata = {
  title: "Classic - Strokes Game",
  description:
    "Draft PGA Tour player seasons into strokes gained categories, then simulate a premium schedule.",
};

export default function ClassicPage() {
  return <StrokesGainedGame initialVariant="classic" />;
}
