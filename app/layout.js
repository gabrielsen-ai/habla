import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  weight: ['400', '600', '700', '800', '900'],
  subsets: ["latin"],
  variable: "--font-nunito",
  display: 'swap',
});

export const metadata = {
  title: "Habla",
  description: "Simple frontend for Habla",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={nunito.className}>
        {children}
      </body>
    </html>
  );
}
