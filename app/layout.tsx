import type { Metadata } from "next";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trench Forecast",
  description: "Live ASCII visualization of the Solana memecoin trenches",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#000", overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
