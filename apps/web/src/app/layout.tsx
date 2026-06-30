import type { Metadata } from 'next';
import './globals.css';
import { FeedbackProvider } from '../components/feedback';

export const metadata: Metadata = {
  title: 'CredMaster',
  description: 'Plataforma de gestão de crédito',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}
