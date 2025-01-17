import type { Metadata } from "next";
import "@/styles/global.css";

export const metadata: Metadata = {
  title: "01-Displayer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
