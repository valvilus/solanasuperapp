import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TelegramProvider } from "@/components/telegram/TelegramProvider";
import { TelegramAccessGuard } from "@/components/telegram/TelegramAccessGuard";
import { AuthProvider } from "../contexts/AuthContext";
import { SolanaWalletProvider } from "@/components/wallet/WalletProvider";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { NotificationDisplay } from "@/components/notifications/NotificationDisplay";
import NoSSR from "@/components/common/NoSSR";
import { MainPageSkeleton } from "@/components/ui/MainPageSkeleton";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Solana SuperApp | Telegram Mini App",
  description: "Полнофункциональное Solana приложение для Telegram с кошельком, NFT, DAO и обучением",
  keywords: "Solana, Telegram, кошелек, NFT, DAO, криптовалюта, блокчейн",
  authors: [{ name: "Solana SuperApp Team" }],
  manifest: "/manifest.json",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#9945FF',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <head>
        <script 
          src="https://telegram.org/js/telegram-web-app.js"
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        {/* ПОЛНОСТЬЮ ОТКЛЮЧАЕМ SSR ДЛЯ TELEGRAM MINI APP */}
        <NoSSR fallback={<MainPageSkeleton />}>
          <TelegramAccessGuard fallback={<MainPageSkeleton />}>
            <TelegramProvider>
              <AuthProvider>
                <NotificationProvider>
                  <SolanaWalletProvider>
                    {children}
                    {/* Глобальный дисплей уведомлений */}
                    <NotificationDisplay />
                  </SolanaWalletProvider>
                </NotificationProvider>
              </AuthProvider>
            </TelegramProvider>
          </TelegramAccessGuard>
        </NoSSR>
      </body>
    </html>
  );
}
