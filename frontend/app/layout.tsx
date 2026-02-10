import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Navbar from "./components/navbar";
import { EmotionProvider } from "./components/Emotion";
import { LanguageProvider } from "./context/LanguageContext";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduNext - Personalized Learning",
  description: "Personalized learning for Autism, ADHD & Unique Minds",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.className} antialiased`}>
        <LanguageProvider>
          <Navbar />
          <EmotionProvider>{children}</EmotionProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
