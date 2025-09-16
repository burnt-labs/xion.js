'use client';

import { useState, useEffect } from 'react';
import { Button } from '@burnt-labs/ui';
import { Input } from '@burnt-labs/ui';

interface WalletStatus {
  connected: boolean;
  sessionKeyAddress?: string;
  metaAccountAddress?: string;
  permissions?: {
    contracts?: string[];
    bank?: Array<{ denom: string; amount: string }>;
    stake?: boolean;
    treasury?: string;
    expiry?: number;
  };
  expiresAt?: number;
  state?: string;
}

export default function HomePage() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [walletStatus, setWalletStatus] = useState<WalletStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
      setIsLoggedIn(true);
      checkWalletStatus(savedUsername);
    }
  }, []);

  const handleLogin = () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    setIsLoggedIn(true);
    localStorage.setItem('username', username);
    checkWalletStatus(username);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setWalletStatus(null);
    localStorage.removeItem('username');
  };

  const checkWalletStatus = async (user: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/wallet/status?username=${encodeURIComponent(user)}`);
      const data = await response.json();
      
      if (data.success) {
        setWalletStatus(data.data);
      } else {
        setError(data.error || 'Failed to check wallet status');
      }
    } catch (err) {
      setError('Network error while checking wallet status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!username) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/wallet/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          permissions: {
            contracts: [],
            bank: [],
            stake: false,
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // In a real implementation, you would redirect to the authorization URL
        // For demo purposes, we'll just show the URL
        alert(`Authorization URL: ${data.data.authorizationUrl}`);
        // Simulate successful connection after a delay
        setTimeout(() => {
          checkWalletStatus(username);
        }, 2000);
      } else {
        setError(data.error || 'Failed to initiate wallet connection');
      }
    } catch (err) {
      setError('Network error while connecting wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!username) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/wallet/disconnect', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setWalletStatus(null);
      } else {
        setError(data.error || 'Failed to disconnect wallet');
      }
    } catch (err) {
      setError('Network error while disconnecting wallet');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const formatPermissions = (permissions?: WalletStatus['permissions']) => {
    if (!permissions) return 'None';
    
    const parts: string[] = [];
    if (permissions.contracts && permissions.contracts.length > 0) {
      parts.push(`Contracts: ${permissions.contracts.length}`);
    }
    if (permissions.bank && permissions.bank.length > 0) {
      parts.push(`Bank: ${permissions.bank.length} limits`);
    }
    if (permissions.stake) {
      parts.push('Staking enabled');
    }
    if (permissions.treasury) {
      parts.push(`Treasury: ${permissions.treasury}`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'None';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            XION Backend Session Management
          </h1>
          
          {!isLoggedIn ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full"
                />
              </div>
              <Button onClick={handleLogin} className="w-full">
                Login
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Welcome, {username}
                  </h2>
                  <p className="text-gray-600">
                    Manage your XION wallet connection
                  </p>
                </div>
                <Button onClick={handleLogout}>
                  Logout
                </Button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Wallet Connection Status
                </h3>
                
                {loading ? (
                  <p className="text-gray-600">Loading...</p>
                ) : walletStatus ? (
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700 w-32">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        walletStatus.connected 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {walletStatus.connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                    
                    {walletStatus.connected && (
                      <>
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-32">Session Key:</span>
                          <span className="font-mono text-sm text-gray-600">
                            {walletStatus.sessionKeyAddress}
                          </span>
                        </div>
                        
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-32">Meta Account:</span>
                          <span className="font-mono text-sm text-gray-600">
                            {walletStatus.metaAccountAddress}
                          </span>
                        </div>
                        
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-32">Expires:</span>
                          <span className="text-sm text-gray-600">
                            {formatTimestamp(walletStatus.expiresAt)}
                          </span>
                        </div>
                        
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-32">State:</span>
                          <span className="text-sm text-gray-600">
                            {walletStatus.state || 'N/A'}
                          </span>
                        </div>
                        
                        <div className="flex items-start">
                          <span className="font-medium text-gray-700 w-32">Permissions:</span>
                          <span className="text-sm text-gray-600">
                            {formatPermissions(walletStatus.permissions)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600">No wallet connection found</p>
                )}
              </div>

              <div className="flex space-x-4">
                <Button 
                  onClick={handleConnect} 
                  disabled={loading || walletStatus?.connected}
                  className="flex-1"
                >
                  {walletStatus?.connected ? 'Already Connected' : 'Connect Wallet'}
                </Button>
                
                <Button 
                  onClick={handleDisconnect} 
                  disabled={loading || !walletStatus?.connected}
                  className="flex-1"
                >
                  Disconnect Wallet
                </Button>
                
                <Button 
                  onClick={() => checkWalletStatus(username)} 
                  disabled={loading}
                >
                  Refresh Status
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
