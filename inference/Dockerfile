# Build with GPU support (default):
#   docker build --build-arg VARIANT=gpu -t magic-layers-inference .
#
# Build CPU-only (no NVIDIA GPU / nvidia-container-toolkit available):
#   docker build --build-arg VARIANT=cpu --build-arg BASE_IMAGE=python:3.11-slim -t magic-layers-inference .

ARG BASE_IMAGE=nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04
FROM ${BASE_IMAGE}

ARG VARIANT=gpu
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1

# The CUDA base image doesn't ship Python; the python:slim base already has it.
RUN if ! command -v python3 >/dev/null 2>&1; then \
      apt-get update && apt-get install -y --no-install-recommends \
        python3.11 python3-pip python3.11-venv && \
      ln -sf /usr/bin/python3.11 /usr/bin/python3; \
    fi

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 curl \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /app

COPY requirements.txt requirements-torch-cpu.txt requirements-torch-gpu.txt ./

RUN pip3 install --no-cache-dir --upgrade pip && \
    if [ "$VARIANT" = "gpu" ]; then \
      pip3 install --no-cache-dir -r requirements-torch-gpu.txt; \
    else \
      pip3 install --no-cache-dir -r requirements-torch-cpu.txt; \
    fi && \
    pip3 install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=20 --start-period=120s \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
