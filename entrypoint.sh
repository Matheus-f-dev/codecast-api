#!/bin/sh
set -e

echo "Aguardando PostgreSQL..."
until python -c "
import os, psycopg2
psycopg2.connect(os.environ['DATABASE_URL'])
" 2>/dev/null; do
  sleep 1
done

echo "PostgreSQL disponível. Aplicando migrations..."
alembic upgrade head

echo "Iniciando API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
