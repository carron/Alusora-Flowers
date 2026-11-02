FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends tzdata && rm -rf /var/lib/apt/lists/*
COPY app.py ./
COPY web ./web
RUN mkdir -p /data
ENV HOST=0.0.0.0 PORT=8080 ALUSORA_DB_PATH=/data/alusora.sqlite3
VOLUME ["/data"]
EXPOSE 8080
CMD ["python", "-u", "app.py"]
