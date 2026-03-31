FROM python:3.11-slim

WORKDIR /app

# Copy requirement files and install dependencies
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose default port (Railway will override via $PORT)
EXPOSE 8080

# Use Railway's dynamic $PORT env var (falls back to 8080 on other platforms)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
