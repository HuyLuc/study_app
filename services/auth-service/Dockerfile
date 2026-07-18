FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install shared library
COPY shared /shared
RUN pip install --no-cache-dir /shared

COPY services/auth-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/auth-service/alembic.ini ./
COPY services/auth-service/alembic ./alembic
COPY services/auth-service/app ./app

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
