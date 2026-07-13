import { StrokesGainedGame } from "../components/strokes-gained-game";

export const metadata = {
  title: "Daily Challenge - Strokes Game",
  description:
    "Read the clues, build today's mystery golfer into strokes gained categories, and see how you rank.",
};

export default function DailyPage() {
  return <StrokesGainedGame initialVariant="daily" />;
}
