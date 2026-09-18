import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Counterpart | Contract review desk",
  description:
    "A considered second look at your freelance agreement. Document-grounded information for Indian freelancers.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
