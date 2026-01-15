# @burnt-labs/signers

Smart account signing implementations and authenticator interfaces for XION blockchain.

> ⚠️ **INTERNAL ONLY**: This package provides utillities for the creation of the abstraxionSigningClient. If you want to use Smart accounts through Xion in your application then please use Abstraxion and the useAbstraxionSigningClient directly.

## Overview

This package provides signing implementations for XION smart accounts, supporting multiple authenticator types:

- **JWT Signer** - Email/social authentication via JWT tokens
- **Ethereum Signer** - MetaMask and other Ethereum wallets
- **Direct Signer** - Cosmos wallets (Keplr, Leap, OKX)
- **Passkey Signer** - WebAuthn/FIDO2 passkeys

it also has references to needed Crypto operations for the creation of Smart accounts.
