import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sandbox Coding Agent",
  description: "A coding agent running entirely inside a Vercel Sandbox",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        margin: 0,
        padding: '20px',
        backgroundColor: '#0a0a0a',
        color: '#ededed',
        minHeight: '100vh'
      }}>
        {children}
      </body>
    </html>
  );
}
