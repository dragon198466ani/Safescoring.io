import { Inter } from "next/font/google";
import { getSEOTags } from "@/libs/seo";
import ClientLayout from "@/components/LayoutClient";
import config from "@/config";
import { getNormStats } from "@/libs/norm-stats";
import "./globals.css";

const font = Inter({ subsets: ["latin"] });

export const viewport = {
	themeColor: config.colors.main,
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
	userScalable: true,
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

export default async function RootLayout({ children }) {
	const normStats = await getNormStats();

	return (
		<html
			lang="en"
			data-theme={config.colors.theme}
			className={font.className}
		>
			<head>
				{/* PWA: Apple Touch Icon */}
				<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
				{/* iOS: Splash screen for PWA standalone mode */}
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="mobile-web-app-capable" content="yes" />
				{/* Android: ensure theme-color updates with dark/light mode */}
				<meta name="theme-color" content="#6366f1" media="(prefers-color-scheme: dark)" />
				<meta name="theme-color" content="#6366f1" media="(prefers-color-scheme: light)" />
				{/* Preconnect to critical origins */}
				<link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
				{/* DNS prefetch for external services */}
				<link rel="dns-prefetch" href="https://supabase.co" />
				<link rel="dns-prefetch" href="https://api.lemonsqueezy.com" />
				<link rel="dns-prefetch" href="https://buy.moonpay.com" />
				{/* Plausible Analytics — consent-gated: injected client-side after cookie consent (RGPD Art. 5(1)(a)) */}
			</head>
			<body>
				{/* Skip to main content link for keyboard/screen reader users */}
				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-content focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium"
				>
					Skip to main content
				</a>
				{/* ClientLayout contains all the client wrappers (Crisp chat support, toast messages, tooltips, etc.) */}
				<ClientLayout normStats={normStats}><div id="main-content">{children}</div></ClientLayout>
				{/* Service Worker Registration + Referral Capture */}
				<script
					dangerouslySetInnerHTML={{
						__html: `
							if ('serviceWorker' in navigator) {
								window.addEventListener('load', function() {
									navigator.serviceWorker.register('/sw.js').catch(function(err) {
										console.error('SW registration failed:', err);
									});
								});
							}
							// Capture referral code from URL (?ref=CODE) — requires consent (ePrivacy Directive)
							try {
								var consent = localStorage.getItem('cookie-consent');
								if (consent === 'all') {
									var params = new URLSearchParams(window.location.search);
									var ref = params.get('ref');
									if (ref && ref.length >= 4 && ref.length <= 16) {
										localStorage.setItem('referral_code', ref);
										localStorage.setItem('referral_date', Date.now().toString());
									}
								}
							} catch(e) {}
						`,
					}}
				/>
			</body>
		</html>
	);
}
