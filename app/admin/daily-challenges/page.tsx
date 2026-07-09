"use client";

import { useMemo, useState } from "react";
import rawSeasons from "../../lib/data/player-seasons.json";
import type { DailyChallenge, DailyChallengeItem, DailyChallengeMedia } from "../../lib/game/daily-challenge";
import type { PlayerSeason } from "../../lib/game/types";

type AdminItem = {
  playerId: string;
  mediaKind: "text" | "image" | "video";
  title: string;
  body: string;
  alt: string;
  file?: File;
};

const ADMIN_KEY = process.env.NEXT_PUBLIC_DAILY_ADMIN_KEY ?? "strokes-admin";
const SEASONS = rawSeasons as PlayerSeason[];

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function fileNameFor(file: File) {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "";
  return `${slug(file.name)}${extension ? `.${extension.toLowerCase()}` : ""}`;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function defaultItems(players: { playerId: string; player: string }[]): AdminItem[] {
  return Array.from({ length: 4 }).map((_, index) => ({
    playerId: players[index]?.playerId ?? "",
    mediaKind: "text",
    title: "",
    body: "",
    alt: "",
  }));
}

function mediaForItem(date: string, item: AdminItem): DailyChallengeMedia {
  if (item.file) {
    const kind = item.file.type.startsWith("video/") ? "video" : "image";
    return {
      kind,
      title: item.title.trim() || item.file.name,
      src: `/daily-challenges/${date}/${fileNameFor(item.file)}`,
      alt: item.alt.trim() || item.title.trim() || item.file.name,
      body: item.body.trim() || undefined,
    };
  }

  return {
    kind: "text",
    title: item.title.trim() || "Untitled clue",
    body: item.body.trim() || "Add clue copy here.",
  };
}

function buildChallenge(date: string, title: string, items: AdminItem[]): DailyChallenge {
  return {
    id: `daily-${date}`,
    date,
    title: title.trim() || "Daily Challenge",
    items: items.map((item, index) => ({
      id: `${date}-clue-${index + 1}-${slug(item.title || item.playerId || `player-${index + 1}`)}`,
      playerId: item.playerId,
      media: mediaForItem(date, item),
    })),
  };
}

async function writeTextFile(directory: any, name: string, contents: string) {
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(contents);
  await writable.close();
}

async function readSchedule(directory: any) {
  try {
    const handle = await directory.getFileHandle("schedule.json", { create: true });
    const file = await handle.getFile();
    const text = await file.text();
    if (!text.trim()) return [];
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function DailyChallengeAdminPage() {
  const players = useMemo(() => {
    return Array.from(
      SEASONS.reduce((map, season) => map.set(season.playerId, season.player), new Map<string, string>()),
      ([playerId, player]) => ({ playerId, player }),
    ).sort((a, b) => a.player.localeCompare(b.player));
  }, []);

  const [keyInput, setKeyInput] = useState("");
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("strokes-daily-admin-unlocked") === "true";
  });
  const [date, setDate] = useState(todayInputValue());
  const [title, setTitle] = useState("Daily Challenge");
  const [items, setItems] = useState<AdminItem[]>(() => defaultItems(players));
  const [message, setMessage] = useState("");

  const challenge = useMemo(() => buildChallenge(date, title, items), [date, items, title]);
  const challengeJson = useMemo(() => JSON.stringify(challenge, null, 2), [challenge]);

  const updateItem = (index: number, next: Partial<AdminItem>) => {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...next } : item)),
    );
  };

  const unlock = () => {
    if (keyInput !== ADMIN_KEY) {
      setMessage("Wrong admin key.");
      return;
    }
    window.localStorage.setItem("strokes-daily-admin-unlocked", "true");
    setUnlocked(true);
    setMessage("");
  };

  const copyJson = async () => {
    await navigator.clipboard.writeText(challengeJson);
    setMessage("Challenge JSON copied.");
  };

  const downloadJson = () => {
    const blob = new Blob([challengeJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${challenge.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Challenge JSON downloaded.");
  };

  const saveToFolder = async () => {
    const picker = (window as any).showDirectoryPicker;
    if (!picker) {
      setMessage("This browser cannot write to a folder. Copy the JSON instead.");
      return;
    }

    const directory = await picker({ mode: "readwrite" });
    const dateDirectory = await directory.getDirectoryHandle(date, { create: true });

    for (const item of items) {
      if (!item.file) continue;
      const handle = await dateDirectory.getFileHandle(fileNameFor(item.file), { create: true });
      const writable = await handle.createWritable();
      await writable.write(item.file);
      await writable.close();
    }

    const existing = await readSchedule(directory);
    const next = [
      ...existing.filter((entry: DailyChallenge) => entry?.date !== challenge.date),
      challenge,
    ].sort((a: DailyChallenge, b: DailyChallenge) => a.date.localeCompare(b.date));

    await writeTextFile(directory, "schedule.json", `${JSON.stringify(next, null, 2)}\n`);
    setMessage("Saved. Rebuild/deploy the site for the schedule change to go live.");
  };

  if (!unlocked) {
    return (
      <main className="page-shell">
        <section className="admin-shell admin-shell--gate">
          <span className="eyebrow">Daily Admin</span>
          <h1>Enter admin key</h1>
          <div className="admin-gate">
            <input
              type="password"
              value={keyInput}
              onChange={(event) => setKeyInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") unlock();
              }}
            />
            <button type="button" className="primary-button" onClick={unlock}>
              Unlock
            </button>
          </div>
          {message ? <p className="admin-message">{message}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="admin-shell">
        <div className="admin-head">
          <div>
            <span className="eyebrow">Daily Admin</span>
            <h1>Schedule a challenge</h1>
          </div>
          <div className="admin-actions">
            <button type="button" className="ghost-button" onClick={copyJson}>
              Copy JSON
            </button>
            <button type="button" className="ghost-button" onClick={downloadJson}>
              Download JSON
            </button>
            <button type="button" className="primary-button" onClick={saveToFolder}>
              Save To Folder
            </button>
          </div>
        </div>

        <div className="admin-fields">
          <label>
            <span>Date</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
        </div>

        <div className="admin-card-grid">
          {items.map((item, index) => (
            <div className="admin-card" key={index}>
              <span className="eyebrow">Clue {index + 1}</span>
              <label>
                <span>Player</span>
                <select
                  value={item.playerId}
                  onChange={(event) => updateItem(index, { playerId: event.target.value })}
                >
                  {players.map((player) => (
                    <option value={player.playerId} key={player.playerId}>
                      {player.player}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Clue title</span>
                <input
                  value={item.title}
                  onChange={(event) => updateItem(index, { title: event.target.value })}
                />
              </label>
              <label>
                <span>Text / caption</span>
                <textarea
                  value={item.body}
                  onChange={(event) => updateItem(index, { body: event.target.value })}
                />
              </label>
              <label>
                <span>Alt text</span>
                <input
                  value={item.alt}
                  onChange={(event) => updateItem(index, { alt: event.target.value })}
                />
              </label>
              <label
                className="admin-drop"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (!file) return;
                  updateItem(index, {
                    file,
                    mediaKind: file.type.startsWith("video/") ? "video" : "image",
                  });
                }}
              >
                <span>{item.file ? item.file.name : "Drop or choose media"}</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    updateItem(index, {
                      file,
                      mediaKind: file?.type.startsWith("video/") ? "video" : file ? "image" : "text",
                    });
                  }}
                />
              </label>
            </div>
          ))}
        </div>

        <div className="admin-preview">
          <span className="eyebrow">Manifest Entry</span>
          <pre>{challengeJson}</pre>
        </div>

        {message ? <p className="admin-message">{message}</p> : null}
      </section>
    </main>
  );
}
