# Stage 1: Build Frontend (Next.js)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/rekoviu
COPY rekoviu/package*.json ./
RUN npm ci
COPY rekoviu/ ./
RUN npm run build
# output: "export" will generate the static files in /app/rekoviu/out

# Stage 2: Build Backend (FastAPI) and serve
FROM python:3.11-slim
WORKDIR /app

# Install dependencies
COPY rekov/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY rekov/ ./

# Copy compiled frontend from Stage 1 into frontend_out directory
COPY --from=frontend-builder /app/rekoviu/out ./frontend_out

# Expose port 7860 which is the default for Hugging Face Spaces
EXPOSE 7860

# Run FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
