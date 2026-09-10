# Stage 1: Build Frontend (Next.js Static Export)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/rekoviu
COPY rekoviu/package*.json ./
RUN npm ci
COPY rekoviu/ ./
RUN npm run build

# Stage 2: Production Backend (FastAPI + Static UI)
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install backend dependencies
COPY rekov/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY rekov/ ./

# Copy CSV database data
COPY data/ ./data/

# Copy compiled frontend from Stage 1 into frontend_out directory
COPY --from=frontend-builder /app/rekoviu/out ./frontend_out

# Default port (Render sets $PORT dynamically)
EXPOSE 10000

# Run FastAPI serving API and static frontend UI
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
