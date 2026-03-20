# Deployment Guide: Praxis SaaS Backend

Follow these exact steps to fully deploy the backend APIs (including Live Interview WebSockets) to Google Cloud Run.

## 1. Install Google Cloud SDK
If you don't already have the `gcloud` CLI installed, download and install it by following the [Google Cloud CLI Documentation](https://cloud.google.com/sdk/docs/install) for your OS (macOS).

## 2. Authenticate
Log in to your Google account with the CLI:
```bash
gcloud auth login
```

## 3. Create a Google Cloud Project
Create a new project `praxis-saas` (Project ID must be unique globally, so you might need to append random numbers, e.g., `praxis-saas-12345`):
```bash
gcloud projects create praxis-saas-unique-id
gcloud config set project praxis-saas-unique-id
```

## 4. Enable Required APIs (Cloud Run, Cloud Build, Artifact Registry)
Link your project to a billing account in the Google Cloud Console, and then run:
```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```
*Note: This might take a few minutes.*

## 5. Deploy to Cloud Run
Navigate to your backend directory in terminal:
```bash
cd backend
```

Deploy the backend using the easiest source-to-app command (this builds using Google Buildpacks automatically or uses the Dockerfile):
```bash
gcloud run deploy praxis-backend --source . --region us-central1 --allow-unauthenticated --memory 1Gi --timeout 3600s --min-instances 0 --max-instances 3
```
*Alternatively, if you use the `cloudbuild.yaml` setup for a native CI/CD flow in Github, just trigger logic or push to GH natively tying the cloudbuild.*

## 6. Configure Environment Variables
You must provide the production database and API keys to the newly created Cloud Run service.

Once deployed successfully, it will output a URL. Update your service with these secrets:
```bash
gcloud run services update praxis-backend \
  --region us-central1 \
  --set-env-vars "PROJECT_NAME=Praxis API" \
  --set-env-vars "SUPABASE_URL=YOUR_SUPABASE_PROD_URL" \
  --set-env-vars "SUPABASE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  --set-env-vars "SUPABASE_JWT_SECRET=YOUR_SUPABASE_JWT_SECRET" \
  --set-env-vars "POSTGRES_URL=YOUR_SUPABASE_POSTGRES_URL" \
  --set-env-vars "GEMINI_API_KEY=YOUR_GEMINI_API_KEY"
```
*(Replace the values with your actual production keys from Supabase and Google Gen AI Studio)*

## 7. Viewing Logs
You can monitor the live production logs (important for the Live Interview WebSocket errors, connection verification, etc.) directly via your terminal:

```bash
gcloud beta run services logs tail praxis-backend --region us-central1
```
Or you can navigate to the [Google Cloud Console](https://console.cloud.google.com/run), select the `praxis-backend`, and click the **Logs** tab to show the proof recording.
