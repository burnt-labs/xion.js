---
"@burnt-labs/abstraxion-backend": minor
"@burnt-labs/abstraxion-core": minor
"@burnt-labs/tailwind-config": patch
---

# Backend adaptation improvements

Core changes:

- Added gas price configuration to the AbstraxionAuth's getSigner method

Backend changes:

- Added comprehensive error handling system with custom error classes
- Enhanced session key management with improved validation and refresh logic
- Added audit logging capabilities for security and compliance
- Improved state management with automatic cleanup using node-cache
- Added encryption service integration for secure session key storage
- Enhanced database adapter interface with audit event support
- Added configuration validation with proper error messages
- Added session key expiry and refresh threshold management
- Enhanced security with proper error propagation and logging
