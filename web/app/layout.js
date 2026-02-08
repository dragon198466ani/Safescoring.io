import { Inter } from "next/font/google";
import { getSEOTags } from "@/libs/seo";
import ClientLayout from "@/components/LayoutClient";
import config from "@/config";
import "./globals.css";

const font = Inter({ subsets: ["latin"] });

export const viewport = {
	themeColor: config.colors.main,
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
};

// SEO tags + PWA metadata
export const metadata = {
	...getSEOTags(),
	manifest: "/manifest.json",
	appleWebApp: {
		capable: true,
		statusBarStyle: "black-translucent",
		title: config.appName,
	},
	formatDetection: {
		telephone: false,
	},
};

export default function RootLayout({ children }) {
	return (
		<html
			lang="en"
			data-theme={config.colors.theme}
			className={font.className}
		>
			<head>
				{/* PWA: Apple Touch Icon */}
				<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
				{/* Preconnect to critical origins */}
				<link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
				{/* DNS prefetch for external services */}
				<link rel="dns-prefetch" href="https://supabase.co" />
				<link rel="dns-prefetch" href="https://api.stripe.com" />
				{/* RSS Feed */}
				<link rel="alternate" type="application/rss+xml" title="SafeScoring Blog" href="/blog/rss.xml" />
			</head>
			<body>
				{/* ClientLayout contains all the client wrappers (Crisp chat support, toast messages, tooltips, etc.) */}
				<ClientLayout>{children}</ClientLayout>
				{/* Service Worker Registration */}
				<script
					dangerouslySetInnerHTML={{
						__html: `
							if ('serviceWorker' in navigator) {
								window.addEventListener('load', function() {
									navigator.serviceWorker.register('/sw.js').catch(function(err) {
										console.log('SW registration failed:', err);
									});
								});
							}
						`,
					}}
				/>
			</body>
		</html>
	);
}
