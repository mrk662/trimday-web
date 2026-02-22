import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// Fixed path: Looking inside the current 'app' folder
import Footer from "./components/Footer"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "TrimDay | Professional Barber Management",
  description: "Secure booking and management for the modern UK barber shop.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <main className="flex-grow">
          {children}
        </main>

        {/* This will now find the file correctly */}
        <Footer />
      </body>
    </html>
  );
}