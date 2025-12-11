#!/bin/bash
# Load test environment configuration from JSON
# Usage: source .github/scripts/load-test-config.sh <environment>
#
# This script loads configuration from .github/config/test-environments.json
# and sets environment variables for the specified environment.
#
# Public values come from the JSON file.
# Sensitive values (marked with GITHUB_SECRET_) must be set via GitHub secrets.

set -e

ENVIRONMENT="${1:-testnet}"
CONFIG_FILE="${GITHUB_WORKSPACE:-.}/.github/config/test-environments.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Configuration file not found: $CONFIG_FILE"
    exit 1
fi

echo "📝 Loading test configuration for environment: $ENVIRONMENT"

# Helper function to extract value from JSON
get_config() {
    local path=$1
    local default=$2
    local value=$(jq -r "$path // \"$default\"" "$CONFIG_FILE")
    echo "$value"
}

# Load ALL environment configurations (both testnet and mainnet)
# This ensures both sets of values are always available regardless of which environment is selected

# Load testnet configuration
export XION_TESTNET_CHAIN_ID=$(get_config ".environments.testnet.chainId" "")
export XION_TESTNET_RPC_URL=$(get_config ".environments.testnet.rpcUrl" "")
export XION_TESTNET_REST_URL=$(get_config ".environments.testnet.restUrl" "")
export XION_TESTNET_GAS_PRICE=$(get_config ".environments.testnet.gasPrice" "0.001uxion")
export XION_TESTNET_GAS_ADJUSTMENT=$(get_config ".environments.testnet.gasAdjustment" "1.6")
export XION_TESTNET_TREASURY_ADDRESS=$(get_config ".environments.testnet.treasuryAddress" "")
export XION_TESTNET_ADDRESS_PREFIX=$(get_config ".environments.testnet.addressPrefix" "xion")
export XION_TESTNET_FEE_GRANTER=$(get_config ".environments.testnet.feeGranter" "")
TESTNET_AA_API_LIVE_URL=$(get_config ".environments.testnet.aaApiUrl.liveUrl" "")
export XION_TESTNET_AA_API_URL="${TESTNET_AA_API_LIVE_URL}"

# Load mainnet configuration
export XION_MAINNET_CHAIN_ID=$(get_config ".environments.mainnet.chainId" "")
export XION_MAINNET_RPC_URL=$(get_config ".environments.mainnet.rpcUrl" "")
export XION_MAINNET_REST_URL=$(get_config ".environments.mainnet.restUrl" "")
export XION_MAINNET_GAS_PRICE=$(get_config ".environments.mainnet.gasPrice" "0.001uxion")
export XION_MAINNET_GAS_ADJUSTMENT=$(get_config ".environments.mainnet.gasAdjustment" "1.6")
export XION_MAINNET_TREASURY_ADDRESS=$(get_config ".environments.mainnet.treasuryAddress" "")
export XION_MAINNET_ADDRESS_PREFIX=$(get_config ".environments.mainnet.addressPrefix" "xion")
export XION_MAINNET_FEE_GRANTER=$(get_config ".environments.mainnet.feeGranter" "")

# Set generic variables based on selected environment for backward compatibility
ENV_PREFIX="environments.$ENVIRONMENT"
export XION_CHAIN_ID=$(get_config ".$ENV_PREFIX.chainId" "")
export XION_RPC_URL=$(get_config ".$ENV_PREFIX.rpcUrl" "")
export XION_REST_URL=$(get_config ".$ENV_PREFIX.restUrl" "")
export XION_GAS_PRICE=$(get_config ".$ENV_PREFIX.gasPrice" "0.001uxion")
export XION_GAS_ADJUSTMENT=$(get_config ".$ENV_PREFIX.gasAdjustment" "1.6")
export XION_TREASURY_ADDRESS=$(get_config ".$ENV_PREFIX.treasuryAddress" "")
export XION_ADDRESS_PREFIX=$(get_config ".$ENV_PREFIX.addressPrefix" "xion")
export XION_FEE_GRANTER=$(get_config ".$ENV_PREFIX.feeGranter" "")

# Handle AA-API URL (can be string or object)
AA_API_LIVE_URL=$(get_config ".$ENV_PREFIX.aaApiUrl.liveUrl" "")
AA_API_SIMPLE_URL=$(get_config ".$ENV_PREFIX.aaApiUrl" "")

if [ -n "$AA_API_LIVE_URL" ]; then
    export XION_AA_API_URL="$AA_API_LIVE_URL"
    export XION_AA_API_DEV_SERVER_PORT=$(get_config ".$ENV_PREFIX.aaApiUrl.devServerPort" "8787")
else
    export XION_AA_API_URL="$AA_API_SIMPLE_URL"
    export XION_AA_API_DEV_SERVER_PORT="8787"
fi

# Load test configuration
export TEST_TIMEOUT=$(get_config ".testConfig.timeout.unit" "30000")
export INTEGRATION_TEST_TIMEOUT=$(get_config ".testConfig.timeout.integration" "120000")
export NODE_ENV=$(get_config ".testConfig.nodeEnv" "test")

# Load AA-API dev server defaults (for dev-server mode)
export AA_API_CHECKSUM=$(get_config ".aaApiDevServer.defaults.checksum" "")
export AA_API_CODE_ID=$(get_config ".aaApiDevServer.defaults.codeId" "1")
export AA_API_STYTCH_API_URL=$(get_config ".aaApiDevServer.defaults.stytchApiUrl" "https://test.stytch.com")
export AA_API_DEV_SERVER_PORT=$(get_config ".aaApiDevServer.defaults.port" "8787")

echo "✅ Configuration loaded successfully"
echo ""
echo "Environment: $ENVIRONMENT"
echo "  Chain ID: $XION_CHAIN_ID"
echo "  RPC URL: $XION_RPC_URL"
echo "  AA-API URL: $XION_AA_API_URL"
echo "  Gas Price: $XION_GAS_PRICE"
echo "  Treasury: $XION_TREASURY_ADDRESS"
echo ""

# Export to GITHUB_ENV if running in GitHub Actions
if [ -n "$GITHUB_ENV" ]; then
    {
        # Generic environment variables (for backward compatibility)
        echo "XION_CHAIN_ID=$XION_CHAIN_ID"
        echo "XION_RPC_URL=$XION_RPC_URL"
        echo "XION_REST_URL=$XION_REST_URL"
        echo "XION_GAS_PRICE=$XION_GAS_PRICE"
        echo "XION_GAS_ADJUSTMENT=$XION_GAS_ADJUSTMENT"
        echo "XION_AA_API_URL=$XION_AA_API_URL"
        echo "XION_AA_API_DEV_SERVER_PORT=$XION_AA_API_DEV_SERVER_PORT"
        echo "XION_TREASURY_ADDRESS=$XION_TREASURY_ADDRESS"
        echo "XION_ADDRESS_PREFIX=$XION_ADDRESS_PREFIX"
        echo "XION_FEE_GRANTER=$XION_FEE_GRANTER"

        # Testnet-specific environment variables
        echo "XION_TESTNET_CHAIN_ID=$XION_TESTNET_CHAIN_ID"
        echo "XION_TESTNET_RPC_URL=$XION_TESTNET_RPC_URL"
        echo "XION_TESTNET_REST_URL=$XION_TESTNET_REST_URL"
        echo "XION_TESTNET_GAS_PRICE=$XION_TESTNET_GAS_PRICE"
        echo "XION_TESTNET_GAS_ADJUSTMENT=$XION_TESTNET_GAS_ADJUSTMENT"
        echo "XION_TESTNET_TREASURY_ADDRESS=$XION_TESTNET_TREASURY_ADDRESS"
        echo "XION_TESTNET_ADDRESS_PREFIX=$XION_TESTNET_ADDRESS_PREFIX"
        echo "XION_TESTNET_FEE_GRANTER=$XION_TESTNET_FEE_GRANTER"
        echo "XION_TESTNET_AA_API_URL=$XION_TESTNET_AA_API_URL"

        # Mainnet-specific environment variables
        echo "XION_MAINNET_CHAIN_ID=$XION_MAINNET_CHAIN_ID"
        echo "XION_MAINNET_RPC_URL=$XION_MAINNET_RPC_URL"
        echo "XION_MAINNET_REST_URL=$XION_MAINNET_REST_URL"
        echo "XION_MAINNET_GAS_PRICE=$XION_MAINNET_GAS_PRICE"
        echo "XION_MAINNET_GAS_ADJUSTMENT=$XION_MAINNET_GAS_ADJUSTMENT"
        echo "XION_MAINNET_TREASURY_ADDRESS=$XION_MAINNET_TREASURY_ADDRESS"
        echo "XION_MAINNET_ADDRESS_PREFIX=$XION_MAINNET_ADDRESS_PREFIX"
        echo "XION_MAINNET_FEE_GRANTER=$XION_MAINNET_FEE_GRANTER"

        # Test configuration
        echo "TEST_TIMEOUT=$TEST_TIMEOUT"
        echo "INTEGRATION_TEST_TIMEOUT=$INTEGRATION_TEST_TIMEOUT"
        echo "NODE_ENV=$NODE_ENV"

        # AA-API dev server configuration
        echo "AA_API_CHECKSUM=$AA_API_CHECKSUM"
        echo "AA_API_CODE_ID=$AA_API_CODE_ID"
        echo "AA_API_STYTCH_API_URL=$AA_API_STYTCH_API_URL"
        echo "AA_API_DEV_SERVER_PORT=$AA_API_DEV_SERVER_PORT"
    } >> "$GITHUB_ENV"
    echo "✅ Environment variables exported to GITHUB_ENV"
fi
