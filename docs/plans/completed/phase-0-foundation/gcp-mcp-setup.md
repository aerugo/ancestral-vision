# GCP & MCP Setup for Autonomous AI Agent Operations

**Status**: Draft
**Created**: 2026-01-12
**Parent Plan**: [development-plan.md](development-plan.md)

---

## Overview

This document outlines the manual setup required on Google Cloud Platform to enable AI agents to deploy, test, and manage Ancestral Vision infrastructure autonomously via MCP (Model Context Protocol) servers.

**Goal**: After completing this setup, AI agents can:
- Deploy to Cloud Run
- Manage Cloud SQL databases
- Read/write to Cloud Storage
- Manage secrets in Secret Manager
- Run Cloud Build pipelines
- Monitor logs and errors

---

## Prerequisites

Before starting, ensure you have:

- [ ] Google Cloud account with billing enabled
- [ ] `gcloud` CLI installed and authenticated
- [ ] Owner or Editor role on the GCP project (for initial setup)
- [ ] Claude Code with MCP support enabled

---

## Part 1: Environment Configuration File

All GCP configuration is managed through a single `.env.gcp` file. This keeps secrets out of code and makes environment switching easy.

### 1.1 Create the GCP Environment File

Create `.env.gcp` in the project root:

```bash
# .env.gcp - GCP Configuration for AI Agents
# This file is gitignored - never commit!

# =============================================================================
# GCP PROJECT CONFIGURATION
# =============================================================================

# Project IDs
GCP_PROJECT_DEV=ancestral-vision-dev
GCP_PROJECT_PROD=ancestral-vision-prod
GCP_PROJECT=${GCP_PROJECT_DEV}  # Active project (change for prod)

# Region/Zone
GCP_REGION=us-central1
GCP_ZONE=us-central1-a

# Billing (get from: gcloud billing accounts list)
GCP_BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX

# Organization ID (optional - omit for personal accounts)
# GCP_ORG_ID=123456789

# =============================================================================
# SERVICE ACCOUNT
# =============================================================================

# AI Agent service account
GCP_SA_NAME=ai-agent
GCP_SA_EMAIL=${GCP_SA_NAME}@${GCP_PROJECT}.iam.gserviceaccount.com
GCP_SA_KEY_PATH=${HOME}/.config/gcloud/ancestral-vision-ai-agent.json

# =============================================================================
# CLOUD SQL
# =============================================================================

GCP_SQL_INSTANCE=ancestral-vision-db
GCP_SQL_DATABASE=ancestral_vision
GCP_SQL_USER=ancestral
GCP_SQL_PASSWORD=  # Set after creating instance
GCP_SQL_CONNECTION=${GCP_PROJECT}:${GCP_REGION}:${GCP_SQL_INSTANCE}

# =============================================================================
# CLOUD STORAGE
# =============================================================================

GCP_BUCKET_MEDIA=${GCP_PROJECT}-media
GCP_BUCKET_TEMP=${GCP_PROJECT}-temp
GCP_BUCKET_BACKUPS=${GCP_PROJECT}-backups

# =============================================================================
# ARTIFACT REGISTRY
# =============================================================================

GCP_ARTIFACT_REPO=ancestral-vision
GCP_ARTIFACT_LOCATION=${GCP_REGION}
GCP_DOCKER_REGISTRY=${GCP_ARTIFACT_LOCATION}-docker.pkg.dev/${GCP_PROJECT}/${GCP_ARTIFACT_REPO}

# =============================================================================
# CLOUD RUN
# =============================================================================

GCP_RUN_SERVICE=ancestral-vision-api
GCP_RUN_MIN_INSTANCES=1
GCP_RUN_MAX_INSTANCES=100
GCP_RUN_MEMORY=1Gi
GCP_RUN_CPU=1

# =============================================================================
# FIREBASE
# =============================================================================

FIREBASE_PROJECT_ID=${GCP_PROJECT}
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099

# Firebase Admin SDK (set after downloading from Firebase Console)
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Firebase Client SDK (public - can be in code)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${FIREBASE_PROJECT_ID}.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${FIREBASE_PROJECT_ID}.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# =============================================================================
# DATABASE URL (constructed)
# =============================================================================

# Local development (Docker)
DATABASE_URL_LOCAL=postgresql://${GCP_SQL_USER}:${GCP_SQL_PASSWORD}@localhost:5432/${GCP_SQL_DATABASE}

# Cloud SQL (via Unix socket for Cloud Run)
DATABASE_URL_CLOUDSQL=postgresql://${GCP_SQL_USER}:${GCP_SQL_PASSWORD}@/${GCP_SQL_DATABASE}?host=/cloudsql/${GCP_SQL_CONNECTION}

# Active DATABASE_URL
DATABASE_URL=${DATABASE_URL_LOCAL}
```

### 1.2 Add to .gitignore

Ensure `.env.gcp` is never committed:

```bash
echo ".env.gcp" >> .gitignore
echo ".env.gcp.local" >> .gitignore
```

### 1.3 Create Helper Script

Create `scripts/gcp-env.sh` to load environment variables:

```bash
#!/bin/bash
# scripts/gcp-env.sh - Load GCP environment variables

set -a  # Export all variables

# Load .env.gcp if it exists
if [ -f ".env.gcp" ]; then
    source .env.gcp
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
```

Make it executable:

```bash
chmod +x scripts/gcp-env.sh
```

### 1.4 Create Example File for Git

Create `.env.gcp.example` (this one IS committed):

```bash
# .env.gcp.example - Template for GCP configuration
# Copy to .env.gcp and fill in your values

# Project IDs
GCP_PROJECT_DEV=your-project-dev
GCP_PROJECT_PROD=your-project-prod
GCP_PROJECT=${GCP_PROJECT_DEV}

# Region
GCP_REGION=us-central1
GCP_ZONE=us-central1-a

# Billing Account (from: gcloud billing accounts list)
GCP_BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX

# Service Account
GCP_SA_NAME=ai-agent
GCP_SA_EMAIL=${GCP_SA_NAME}@${GCP_PROJECT}.iam.gserviceaccount.com
GCP_SA_KEY_PATH=${HOME}/.config/gcloud/ancestral-vision-ai-agent.json

# Cloud SQL
GCP_SQL_INSTANCE=ancestral-vision-db
GCP_SQL_DATABASE=ancestral_vision
GCP_SQL_USER=ancestral
GCP_SQL_PASSWORD=CHANGE_ME

# Cloud Storage
GCP_BUCKET_MEDIA=${GCP_PROJECT}-media
GCP_BUCKET_TEMP=${GCP_PROJECT}-temp

# Artifact Registry
GCP_ARTIFACT_REPO=ancestral-vision
GCP_DOCKER_REGISTRY=${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/${GCP_ARTIFACT_REPO}

# Cloud Run
GCP_RUN_SERVICE=ancestral-vision-api

# Firebase (fill after creating Firebase project)
FIREBASE_PROJECT_ID=${GCP_PROJECT}
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Database URLs
DATABASE_URL_LOCAL=postgresql://${GCP_SQL_USER}:${GCP_SQL_PASSWORD}@localhost:5432/${GCP_SQL_DATABASE}
DATABASE_URL=${DATABASE_URL_LOCAL}
```

---

## Part 2: GCP Project Setup

### 2.1 Load Environment and Create Projects

```bash
# Load environment variables
source scripts/gcp-env.sh

# Create development project
gcloud projects create $GCP_PROJECT_DEV \
  --name="Ancestral Vision Dev"

# Create production project
gcloud projects create $GCP_PROJECT_PROD \
  --name="Ancestral Vision Prod"

# Set default project
gcloud config set project $GCP_PROJECT
```

### 2.2 Enable Billing

```bash
source scripts/gcp-env.sh

# Link billing to both projects
gcloud billing projects link $GCP_PROJECT_DEV \
  --billing-account=$GCP_BILLING_ACCOUNT

gcloud billing projects link $GCP_PROJECT_PROD \
  --billing-account=$GCP_BILLING_ACCOUNT
```

### 2.3 Enable Required APIs

```bash
source scripts/gcp-env.sh

gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  sql-component.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  serviceusage.googleapis.com \
  --project=$GCP_PROJECT
```

---

## Part 3: Service Account for AI Agents

### 3.1 Create Service Account

```bash
source scripts/gcp-env.sh

# Create service account
gcloud iam service-accounts create $GCP_SA_NAME \
  --display-name="AI Agent Service Account" \
  --description="Used by Claude Code MCP servers for autonomous operations" \
  --project=$GCP_PROJECT
```

### 3.2 Grant Permissions

```bash
source scripts/gcp-env.sh

# Cloud Run - deploy and manage
gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member="serviceAccount:$GCP_SA_EMAIL" \
  --role="roles/run.developer"

# Cloud Build - trigger and view
gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member="serviceAccount:$GCP_SA_EMAIL" \
  --role="roles/cloudbuild.builds.editor"

# Artifact Registry - push/pull images
gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member="serviceAccount:$GCP_SA_EMAIL" \
  --role="roles/artifactregistry.writer"

# Cloud SQL - client access (NOT admin)
gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member="serviceAccount:$GCP_SA_EMAIL" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member="serviceAccount:$GCP_SA_EMAIL" \
  --role="roles/cloudsql.instanceUser"

# Secret Manager - read only
gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member="serviceAccount:$GCP_SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

# Cloud Storage - object read/write
gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member="serviceAccount:$GCP_SA_EMAIL" \
  --role="roles/storage.objectUser"

# Logging - read logs
gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member="serviceAccount:$GCP_SA_EMAIL" \
  --role="roles/logging.viewer"

# Monitoring - read metrics
gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member="serviceAccount:$GCP_SA_EMAIL" \
  --role="roles/monitoring.viewer"
```

### 3.3 Create and Download Key

```bash
source scripts/gcp-env.sh

# Create key file
gcloud iam service-accounts keys create $GCP_SA_KEY_PATH \
  --iam-account=$GCP_SA_EMAIL

# Secure the key
chmod 600 $GCP_SA_KEY_PATH

echo "Service account key saved to: $GCP_SA_KEY_PATH"
```

---

## Part 4: Infrastructure Bootstrap

### 4.1 Create Artifact Registry

```bash
source scripts/gcp-env.sh

gcloud artifacts repositories create $GCP_ARTIFACT_REPO \
  --repository-format=docker \
  --location=$GCP_ARTIFACT_LOCATION \
  --description="Docker images for Ancestral Vision" \
  --project=$GCP_PROJECT
```

### 4.2 Create Cloud SQL Instance

```bash
source scripts/gcp-env.sh

# Generate secure password
GCP_SQL_PASSWORD=$(openssl rand -base64 24)
echo "Generated SQL password: $GCP_SQL_PASSWORD"
echo "Update GCP_SQL_PASSWORD in .env.gcp with this value!"

# Create instance
gcloud sql instances create $GCP_SQL_INSTANCE \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=$GCP_REGION \
  --storage-auto-increase \
  --storage-size=10GB \
  --backup-start-time=03:00 \
  --availability-type=zonal \
  --project=$GCP_PROJECT

# Create database
gcloud sql databases create $GCP_SQL_DATABASE \
  --instance=$GCP_SQL_INSTANCE \
  --project=$GCP_PROJECT

# Create user
gcloud sql users create $GCP_SQL_USER \
  --instance=$GCP_SQL_INSTANCE \
  --password="$GCP_SQL_PASSWORD" \
  --project=$GCP_PROJECT
```

**Important**: Update `.env.gcp` with the generated `GCP_SQL_PASSWORD`.

### 4.3 Create Cloud Storage Buckets

```bash
source scripts/gcp-env.sh

# Media bucket
gcloud storage buckets create gs://$GCP_BUCKET_MEDIA \
  --location=us \
  --uniform-bucket-level-access \
  --project=$GCP_PROJECT

# Temp bucket with auto-delete
gcloud storage buckets create gs://$GCP_BUCKET_TEMP \
  --location=us \
  --uniform-bucket-level-access \
  --project=$GCP_PROJECT

# Set lifecycle policy on temp bucket (delete after 1 day)
cat > /tmp/lifecycle.json << 'EOF'
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 1}
    }
  ]
}
EOF

gcloud storage buckets update gs://$GCP_BUCKET_TEMP \
  --lifecycle-file=/tmp/lifecycle.json
```

### 4.4 Create Secrets in Secret Manager

```bash
source scripts/gcp-env.sh

# Reload to get updated password
source scripts/gcp-env.sh

# Database URL
echo -n "postgresql://${GCP_SQL_USER}:${GCP_SQL_PASSWORD}@/${GCP_SQL_DATABASE}?host=/cloudsql/${GCP_SQL_CONNECTION}" | \
  gcloud secrets create DATABASE_URL --data-file=- --project=$GCP_PROJECT

# Firebase placeholders (update after Firebase setup)
echo -n "$FIREBASE_PROJECT_ID" | \
  gcloud secrets create FIREBASE_ADMIN_PROJECT_ID --data-file=- --project=$GCP_PROJECT

echo -n "placeholder@example.com" | \
  gcloud secrets create FIREBASE_ADMIN_CLIENT_EMAIL --data-file=- --project=$GCP_PROJECT

echo -n "REPLACE_AFTER_FIREBASE_SETUP" | \
  gcloud secrets create FIREBASE_ADMIN_PRIVATE_KEY --data-file=- --project=$GCP_PROJECT

# Grant AI agent access to secrets
for secret in DATABASE_URL FIREBASE_ADMIN_PROJECT_ID FIREBASE_ADMIN_CLIENT_EMAIL FIREBASE_ADMIN_PRIVATE_KEY; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:$GCP_SA_EMAIL" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$GCP_PROJECT
done
```

---

## Part 5: MCP Server Configuration

### 5.1 MCP Configuration Using .env.gcp

The MCP servers read from the same `.env.gcp` file. Create `.claude/mcp-servers.json`:

```json
{
  "mcpServers": {
    "gcp": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-gcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "${GCP_SA_KEY_PATH}",
        "CLOUDSDK_CORE_PROJECT": "${GCP_PROJECT}",
        "GCP_REGION": "${GCP_REGION}"
      },
      "envFile": ".env.gcp"
    },
    "gcp-sql": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-cloudsql"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "${GCP_SA_KEY_PATH}",
        "CLOUDSQL_INSTANCE": "${GCP_SQL_CONNECTION}",
        "CLOUDSQL_DATABASE": "${GCP_SQL_DATABASE}",
        "CLOUDSQL_USER": "${GCP_SQL_USER}"
      },
      "envFile": ".env.gcp"
    },
    "gcp-storage": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-gcs"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "${GCP_SA_KEY_PATH}",
        "GCS_BUCKETS": "${GCP_BUCKET_MEDIA},${GCP_BUCKET_TEMP}"
      },
      "envFile": ".env.gcp"
    },
    "gcp-secrets": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-secretmanager"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "${GCP_SA_KEY_PATH}",
        "CLOUDSDK_CORE_PROJECT": "${GCP_PROJECT}"
      },
      "envFile": ".env.gcp"
    },
    "gcp-build": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-cloudbuild"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "${GCP_SA_KEY_PATH}",
        "CLOUDSDK_CORE_PROJECT": "${GCP_PROJECT}"
      },
      "envFile": ".env.gcp"
    }
  }
}
```

### 5.2 Alternative: Direct gcloud CLI

If MCP servers aren't available, AI agents can use `gcloud` directly. Add to `.claude/settings.json`:

```json
{
  "env": {
    "GOOGLE_APPLICATION_CREDENTIALS": "${GCP_SA_KEY_PATH}"
  },
  "envFile": ".env.gcp"
}
```

Then activate the service account:

```bash
source scripts/gcp-env.sh

gcloud auth activate-service-account $GCP_SA_EMAIL \
  --key-file=$GCP_SA_KEY_PATH

gcloud config set project $GCP_PROJECT
gcloud config set compute/region $GCP_REGION
```

---

## Part 6: Firebase Setup

### 6.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Select existing GCP project (use value of `$GCP_PROJECT` from your `.env.gcp`)
4. Enable Google Analytics (optional)

### 6.2 Enable Authentication

1. Go to **Authentication** > **Get Started**
2. Enable **Email/Password** provider

### 6.3 Get Admin SDK Credentials

1. Go to **Project Settings** > **Service Accounts**
2. Click **Generate New Private Key**
3. Download the JSON file
4. Extract values and update `.env.gcp`:

```bash
# Parse downloaded Firebase JSON and update .env.gcp
FIREBASE_JSON=~/Downloads/firebase-adminsdk-*.json

# Extract values
FIREBASE_CLIENT_EMAIL=$(jq -r '.client_email' $FIREBASE_JSON)
FIREBASE_PRIVATE_KEY=$(jq -r '.private_key' $FIREBASE_JSON)

echo "Add these to .env.gcp:"
echo "FIREBASE_ADMIN_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL"
echo "FIREBASE_ADMIN_PRIVATE_KEY=\"$FIREBASE_PRIVATE_KEY\""

# Update secrets
source scripts/gcp-env.sh

echo -n "$FIREBASE_CLIENT_EMAIL" | \
  gcloud secrets versions add FIREBASE_ADMIN_CLIENT_EMAIL --data-file=- --project=$GCP_PROJECT

echo -n "$FIREBASE_PRIVATE_KEY" | \
  gcloud secrets versions add FIREBASE_ADMIN_PRIVATE_KEY --data-file=- --project=$GCP_PROJECT

# Delete downloaded file
rm $FIREBASE_JSON
```

### 6.4 Get Client SDK Configuration

1. Go to **Project Settings** > **General**
2. Under "Your apps", click **Add app** > **Web**
3. Register app: "Ancestral Vision Web"
4. Copy config values to `.env.gcp`:

```bash
# Add to .env.gcp:
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ancestral-vision-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ancestral-vision-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ancestral-vision-dev.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## Part 7: Cloud Build Trigger Setup

### 7.1 Connect GitHub Repository

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click **Connect Repository**
3. Select **GitHub (Cloud Build GitHub App)**
4. Authorize and select your repository

### 7.2 Create Trigger

```bash
source scripts/gcp-env.sh

gcloud builds triggers create github \
  --name="deploy-to-dev" \
  --repository="projects/${GCP_PROJECT}/locations/${GCP_REGION}/connections/github/repositories/ancestral-vision" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --project=$GCP_PROJECT
```

### 7.3 Grant Cloud Build Permissions

```bash
source scripts/gcp-env.sh

# Get Cloud Build service account
CLOUDBUILD_SA="$(gcloud projects describe $GCP_PROJECT --format='value(projectNumber)')@cloudbuild.gserviceaccount.com"

# Grant required roles
gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member="serviceAccount:$CLOUDBUILD_SA" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member="serviceAccount:$CLOUDBUILD_SA" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member="serviceAccount:$CLOUDBUILD_SA" \
  --role="roles/cloudsql.client"

gcloud iam service-accounts add-iam-policy-binding $CLOUDBUILD_SA \
  --member="serviceAccount:$CLOUDBUILD_SA" \
  --role="roles/iam.serviceAccountUser" \
  --project=$GCP_PROJECT
```

---

## Part 8: Safety Guardrails

### What AI Agents CAN Do

| Operation | Allowed | Role |
|-----------|---------|------|
| Deploy to Cloud Run | Yes | `roles/run.developer` |
| View logs | Yes | `roles/logging.viewer` |
| Trigger builds | Yes | `roles/cloudbuild.builds.editor` |
| Read secrets | Yes | `roles/secretmanager.secretAccessor` |
| Connect to Cloud SQL | Yes | `roles/cloudsql.client` |
| Read/write storage | Yes | `roles/storage.objectUser` |

### What AI Agents CANNOT Do

| Operation | Blocked | Reason |
|-----------|---------|--------|
| Delete Cloud SQL instances | No role | Data protection |
| Create/delete secrets | No role | Security |
| Modify IAM | No role | Security |
| Access production | No key | Isolation |
| Billing operations | No role | Cost control |

---

## Part 9: Verification

### 9.1 Verify Environment File

```bash
source scripts/gcp-env.sh

# Should print configuration
echo "Project: $GCP_PROJECT"
echo "Region: $GCP_REGION"
echo "Service Account: $GCP_SA_EMAIL"
echo "Key Path: $GCP_SA_KEY_PATH"
```

### 9.2 Verify GCP Access

```bash
source scripts/gcp-env.sh

# Activate service account
gcloud auth activate-service-account $GCP_SA_EMAIL \
  --key-file=$GCP_SA_KEY_PATH

# Test access
gcloud projects describe $GCP_PROJECT
gcloud run services list --region=$GCP_REGION
gcloud sql instances describe $GCP_SQL_INSTANCE
gcloud storage ls gs://$GCP_BUCKET_MEDIA/
gcloud secrets versions access latest --secret=DATABASE_URL | head -c 50
```

### 9.3 Verify Firebase

1. Firebase Console shows project
2. Authentication > Email/Password enabled
3. Secrets updated with Firebase Admin credentials

---

## Part 10: Quick Reference

### Load Environment

```bash
# Always run this first
source scripts/gcp-env.sh
```

### Common Commands

```bash
# Deploy to Cloud Run
gcloud run deploy $GCP_RUN_SERVICE \
  --source . \
  --region $GCP_REGION \
  --project $GCP_PROJECT

# View logs
gcloud run services logs read $GCP_RUN_SERVICE \
  --region=$GCP_REGION \
  --project=$GCP_PROJECT \
  --limit=50

# Trigger build
gcloud builds submit --config=cloudbuild.yaml --project=$GCP_PROJECT

# Connect to database (via proxy)
cloud_sql_proxy -instances=$GCP_SQL_CONNECTION=tcp:5432

# Run migrations
DATABASE_URL=$DATABASE_URL_LOCAL npx prisma migrate deploy
```

### Switch to Production

Edit `.env.gcp`:

```bash
# Change active project
GCP_PROJECT=${GCP_PROJECT_PROD}
```

Then reload:

```bash
source scripts/gcp-env.sh
```

---

## Summary Checklist

- [ ] Created `.env.gcp` with all configuration
- [ ] Created `scripts/gcp-env.sh` helper
- [ ] Created GCP projects (dev + prod)
- [ ] Enabled required APIs
- [ ] Created AI agent service account
- [ ] Granted appropriate permissions
- [ ] Downloaded service account key
- [ ] Created Cloud SQL instance
- [ ] Created Cloud Storage buckets
- [ ] Created secrets in Secret Manager
- [ ] Set up Firebase project
- [ ] Updated Firebase credentials in `.env.gcp`
- [ ] Created Cloud Build trigger
- [ ] Verified all access works

**Total Setup Time**: ~1-2 hours

---

*Last Updated: 2026-01-12*
