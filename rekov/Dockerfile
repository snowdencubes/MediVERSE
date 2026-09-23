# Stage 1: Build Frontend (Next.js)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/rekoviu
COPY rekoviu/package*.json ./
RUN npm ci
COPY rekoviu/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Production Unified Image (FastAPI + Next.js UI)
FROM python:3.11-slim
WORKDIR /app

# Install Node.js for Next.js runtime
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=3000

# Copy and install backend requirements
COPY rekov/requirements.txt ./rekov/
RUN pip install --no-cache-dir -r rekov/requirements.txt
COPY rekov/ ./rekov/

# Copy compiled frontend
COPY rekoviu/package*.json ./rekoviu/
COPY --from=frontend-builder /app/rekoviu/.next ./rekoviu/.next
COPY --from=frontend-builder /app/rekoviu/public ./rekoviu/public
COPY --from=frontend-builder /app/rekoviu/node_modules ./rekoviu/node_modules
COPY rekoviu/ ./rekoviu/

# Copy system launcher and data
COPY data/ ./data/
COPY main.py logger.py ./

EXPOSE 3000
EXPOSE 4040

# Run unified launcher (starts frontend on 3000 and backend on 4040)
CMD ["python", "main.py"]

