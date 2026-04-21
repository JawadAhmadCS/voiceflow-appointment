import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Appointments — Voiceflow",
  description: "View bookings from your Voiceflow agent",
};

const globalCss = `
:root{--bg:#f4f6f9;--text:#0f172a;--accent:#0d9488}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text);line-height:1.5}
a{color:var(--accent)}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
        {children}
      </body>
    </html>
  );
}
