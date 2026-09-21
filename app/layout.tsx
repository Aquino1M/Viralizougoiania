import type { Metadata } from "next";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants";

export const metadata: Metadata={
  title:{default:SITE_NAME,template:`%s | ${SITE_NAME}`},
  description:SITE_DESCRIPTION,
  icons:{icon:"/favicon.svg"},
  openGraph:{siteName:SITE_NAME,type:"website",locale:"pt_BR",title:SITE_NAME,description:SITE_DESCRIPTION},
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
