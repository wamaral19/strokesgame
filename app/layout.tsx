import type { Metadata } from "next";
import { Gemunu_Libre } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const switzer = localFont({
  variable: "--font-switzer",
  display: "swap",
  src: [
    {
      path: "./fonts/Switzer-Variable.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/Switzer-VariableItalic.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
});

const gemunuLibre = Gemunu_Libre({
  variable: "--font-gemunu",
  display: "swap",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Strokes Game - Build a golfer, win the FedEx Cup",
  description:
    "Draft PGA Tour player seasons into strokes gained categories, then simulate a premium schedule.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${switzer.variable} ${gemunuLibre.variable}`}>
      <body>{children}</body>
    </html>
  );
}
