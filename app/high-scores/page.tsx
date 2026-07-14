import type { Metadata } from "next";
import Link from "next/link";

import { HighScores } from "./high-scores-client";

export const metadata: Metadata = {
  title: "All Time High Scores | Strokes Game",
  description:
    "The top three season earnings in every game mode. The Daily Challenge board refreshes daily; Classic is split by game mode and mulligans.",
};

export default function HighScoresPage() {
  return (
    <main className="page-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="wordmark" href="/">
            Strokes Game
          </Link>
        </div>
      </header>

      <HighScores />
    </main>
  );
}
