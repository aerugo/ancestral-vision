#!/bin/bash
# scripts/gcp-env.sh - Load GCP environment variables

set -a  # Export all variables

# Load .env.gcp if it exists
if [ -f ".env.gcp" ]; then
    source .env.gcp
    echo "Loaded GCP configuration from .env.gcp"
elif [ -f "$(dirname "$0")/../.env.gcp" ]; then
    source "$(dirname "$0")/../.env.gcp"
    echo "Loaded GCP configuration from .env.gcp"
else
    echo "Error: .env.gcp not found. Copy from .env.gcp.example and configure."
    exit 1
fi

set +a

# Verify required variables
required_vars=(
    "GCP_PROJECT"
    "GCP_REGION"
    "GCP_SA_KEY_PATH"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: Required variable $var is not set"
        exit 1
    fi
done

echo "GCP Project: $GCP_PROJECT"
echo "GCP Region: $GCP_REGION"
