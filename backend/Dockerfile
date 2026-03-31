FROM python:3.11-slim

WORKDIR /app

# Copy requirement files and install dependencies
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the application port
EXPOSE 8080

# Run Uvicorn bound to 0.0.0.0 and port 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
