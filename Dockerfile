# Stage 1: Build Frontend (Next.js)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/rekoviu
COPY rekoviu/package*.json ./
RUN npm ci
COPY rekoviu/ ./
# Bake the relative API path so the static export calls the same host
ENV NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Production Unified Image (FastAPI serves Next.js)
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install backend requirements
COPY rekov/requirements.txt ./rekov/
RUN pip install --no-cache-dir -r rekov/requirements.txt
COPY rekov/ ./rekov/

# Copy static frontend export (out/)
COPY --from=frontend-builder /app/rekoviu/out ./rekoviu/out

# Copy system data and modules
COPY data/ ./data/
COPY base/ ./base/
COPY huggfaceonnx/ ./huggfaceonnx/
COPY language/ ./language/
COPY ritmo/ ./ritmo/
COPY main.py logger.py interface.py rekov_credits.py ./

# Run FastAPI directly on the PORT provided by Render
# The backend will serve the frontend from /app/rekoviu/out
CMD uvicorn rekov.main:app --host 0.0.0.0 --port ${PORT:-10000}

