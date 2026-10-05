FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt /app/requirements.txt
COPY ai/requirements.txt /app/ai-requirements.txt
RUN pip install --no-cache-dir -r requirements.txt -r ai-requirements.txt
COPY backend /app/backend
COPY database /app/database
COPY ai /app/ai
RUN useradd --uid 10001 --create-home resqgrid
USER resqgrid
ENV PYTHONPATH=/app/backend:/app/ai/src PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
