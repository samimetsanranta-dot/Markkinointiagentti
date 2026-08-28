import "./globals.css";

export const metadata = {
  title: "Markkinointiagentti",
  description: "Selkeä työkalu markkinointisisällön suunnitteluun.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fi">
      <body>{children}</body>
    </html>
  );
}
