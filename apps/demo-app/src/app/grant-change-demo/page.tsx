"use client";
import { useState, useEffect } from "react";
import {
	useAbstraxionAccount,
	useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import Link from "next/link";
import { GrantChangeNotification } from "../../components/GrantChangeNotification";
import { treasuryConfig } from "../layout";

export default function GrantChangeDemoPage(): JSX.Element {
	const {
		data: account,
		login,
		logout,
		isConnecting,
		isConnected,
		grantsChanged,
	} = useAbstraxionAccount();

	const { client } = useAbstraxionSigningClient();
	const [notifications, setNotifications] = useState<string[]>([]);

	// Monitor grant changes and log them
	useEffect(() => {
		if (grantsChanged) {
			const timestamp = new Date().toLocaleTimeString();
			setNotifications((prev) => [
				...prev,
				`${timestamp}: Grant changes detected!`,
			]);
		}
	}, [grantsChanged]);

	const addNotification = (message: string) => {
		const timestamp = new Date().toLocaleTimeString();
		setNotifications((prev) => [...prev, `${timestamp}: ${message}`]);
	};

	const clearNotifications = () => {
		setNotifications([]);
	};

	const handleLogin = async () => {
		try {
			addNotification("Attempting to login...");
			await login();
			addNotification("Login successful!");
		} catch (error) {
			addNotification(`Login failed: ${error}`);
		}
	};

	const handleLogout = () => {
		addNotification("Logging out...");
		logout();
		addNotification("Logged out successfully!");
	};

	return (
		<main className="m-auto flex min-h-screen max-w-4xl flex-col gap-6 p-4">
			<div className="text-center">
				<h1 className="text-3xl font-bold tracking-tighter text-white">
					Grant Change Demo
				</h1>
				<p className="mt-2 text-gray-400">
					This page demonstrates the auto logout feature when grant changes are
					detected.
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				{/* Connection Status */}
				<div className="rounded-lg border border-white/20 bg-gray-900/50 p-6">
					<h2 className="mb-4 text-xl font-semibold text-white">
						Connection Status
					</h2>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-gray-300">Connected:</span>
							<span
								className={`font-semibold ${
									isConnected ? "text-green-400" : "text-red-400"
								}`}
							>
								{isConnected ? "Yes" : "No"}
							</span>
						</div>

						<div className="flex items-center justify-between">
							<span className="text-gray-300">autoLogoutOnGrantChange:</span>
							<span
								className={`font-semibold ${
									treasuryConfig.autoLogoutOnGrantChange
										? "text-green-400"
										: "text-red-400"
								}`}
							>
								{treasuryConfig.autoLogoutOnGrantChange ? "Yes" : "No"}
							</span>
						</div>

						<div className="flex items-center justify-between">
							<span className="text-gray-300">Grants Changed:</span>
							<span
								className={`font-semibold ${
									grantsChanged ? "text-yellow-400" : "text-green-400"
								}`}
							>
								{grantsChanged ? "Yes" : "No"}
							</span>
						</div>

						<div className="flex items-center justify-between">
							<span className="text-gray-300">Client:</span>
							<span
								className={`font-semibold ${
									client ? "text-green-400" : "text-gray-400"
								}`}
							>
								{client ? "Connected" : "Not connected"}
							</span>
						</div>

						{account.bech32Address && (
							<div className="mt-4 rounded bg-gray-800 p-3">
								<p className="text-xs text-gray-400">Wallet:</p>
								<p className="break-all text-sm text-white">
									{account.bech32Address}
								</p>
							</div>
						)}

						{account.bech32Address && (
							<div className="mt-4 rounded bg-gray-800 p-3">
								<p className="text-xs text-gray-400">Treasury:</p>
								<p className="break-all text-sm text-white">
									{treasuryConfig.treasury || "Not set"}
								</p>
							</div>
						)}
					</div>

					<div className="mt-6 space-y-2">
						{!isConnected && (
							<Button
								fullWidth
								onClick={handleLogin}
								disabled={isConnecting}
								structure="base"
							>
								{isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
							</Button>
						)}

						{isConnected && (
							<Button fullWidth onClick={handleLogout} structure="outlined">
								DISCONNECT
							</Button>
						)}
					</div>
				</div>

				{/* Feature Information */}
				<div className="rounded-lg border border-white/20 bg-gray-900/50 p-6">
					<h2 className="mb-4 text-xl font-semibold text-white">
						Feature Information
					</h2>

					<div className="space-y-4 text-sm">
						<div className="rounded bg-blue-500/10 p-3">
							<h3 className="font-semibold text-blue-300">Auto Logout</h3>
							<p className="text-blue-200">
								When enabled, users are automatically logged out if grant
								changes are detected at startup.
							</p>
						</div>

						<div className="rounded bg-green-500/10 p-3">
							<h3 className="font-semibold text-green-300">Grant Monitoring</h3>
							<p className="text-green-200">
								The system checks for grant changes when the app starts,
								comparing current grants with treasury configuration.
							</p>
						</div>

						<div className="rounded bg-yellow-500/10 p-3">
							<h3 className="font-semibold text-yellow-300">
								Developer Control
							</h3>
							<p className="text-yellow-200">
								Developers can access the `grantsChanged` property to implement
								custom handling and user notifications.
							</p>
						</div>

						<div className="rounded bg-purple-500/10 p-3">
							<h3 className="font-semibold text-purple-300">Configuration</h3>
							<p className="text-purple-200">
								Set `enableLogoutOnGrantChange: true` in your provider config to
								enable automatic logout.
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Activity Log */}
			<div className="rounded-lg border border-white/20 bg-gray-900/50 p-6">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-xl font-semibold text-white">Activity Log</h2>
					<Button onClick={clearNotifications} structure="outlined">
						Clear Log
					</Button>
				</div>

				<div className="max-h-48 overflow-y-auto rounded bg-gray-800 p-4">
					{notifications.length === 0 ? (
						<p className="text-gray-400">No activity yet...</p>
					) : (
						<div className="space-y-1">
							{notifications.map((notification, index) => (
								<div key={index} className="font-mono text-sm text-gray-300">
									{notification}
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Code Example */}
			<div className="rounded-lg border border-white/20 bg-gray-900/50 p-6">
				<h2 className="mb-4 text-xl font-semibold text-white">
					Implementation Example
				</h2>

				<div className="rounded bg-gray-800 p-4">
					<pre className="text-sm text-gray-300">
						<code>{`// Enable auto logout in provider config
const config = {
  treasury: "xion1...",
  enableLogoutOnGrantChange: true
};

// Use in components
const { grantsChanged, isConnected } = useAbstraxionAccount();

useEffect(() => {
  if (grantsChanged && !isConnected) {
    // Handle grant changes with custom UX
    showNotification("Permissions updated. Please reconnect.");
  }
}, [grantsChanged, isConnected]);`}</code>
					</pre>
				</div>
			</div>

			<div className="text-center">
				<Link
					href="/"
					className="inline-block text-sm text-gray-400 underline hover:text-gray-300"
				>
					← Back to examples
				</Link>
			</div>

			{/* Grant Change Notification */}
			<GrantChangeNotification
				onReconnect={() => addNotification("Reconnected via notification")}
				onDismiss={() => addNotification("Notification dismissed")}
			/>
		</main>
	);
}
