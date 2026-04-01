FROM python:3.11-slim

# System deps (add only if needed)
RUN apt-get update && apt-get install -y \
    curl \
    && apt-get clean

# Workdir
WORKDIR /app

# Copy requirements first (cache optimization)
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy full backend
COPY . .

# Azure expects PORT env
ENV PORT=8000

EXPOSE 8000

# Start FastAPI
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]