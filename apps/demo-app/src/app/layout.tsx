"use client";
import "./globals.css";
import { Inter } from "next/font/google";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";

const inter = Inter({ subsets: ["latin"] });

// Example XION seat contract
const currentTreasury =
	"xion12724lueegeee65l5ekdq5p2wtz7euevdl0vyxv7h75ls4pt0qkasvg7tca";
// const curentTreasury = "xion1y0pks85yaxagmre5c5l8sr5unlt4874e5x9x4q3c0puqut9xmg9qnflwp8";

const legacyConfig = {
	contracts: [
		// Usually, you would have a list of different contracts here
		currentTreasury,
		{
			address: currentTreasury,
			amounts: [{ denom: "uxion", amount: "1000000" }],
		},
	],
	stake: true,
	bank: [
		{
			denom: "uxion",
			amount: "1000000",
		},
	],
	// Optional params to activate mainnet config
	// rpcUrl: "https://rpc.xion-mainnet-1.burnt.com:443",
	// restUrl: "https://api.xion-mainnet-1.burnt.com:443",
};

export const treasuryConfig = {
	treasury: currentTreasury, // Example XION treasury instance for instantiating smart contracts
	gasPrice: "0.001uxion", // If you feel the need to change the gasPrice when connecting to signer, set this value. Please stick to the string format seen in example
	autoLogoutOnGrantChange: true, // Disable auto logout to allow custom handling
	// Optional params to activate mainnet config
	// rpcUrl: "https://rpc.xion-mainnet-1.burnt.com:443",
	// restUrl: "https://api.xion-mainnet-1.burnt.com:443",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}): JSX.Element {
	return (
		<html lang="en">
			<body className={inter.className}>
				<AbstraxionProvider config={treasuryConfig}>
					{children}
				</AbstraxionProvider>
			</body>
		</html>
	);
}
