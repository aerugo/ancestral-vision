import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ancestral Vision",
  description: "3D family tree visualization platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
