FROM python:3.12-slim
WORKDIR /srv
COPY analyzer/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY analyzer/app ./app
COPY contract/ingredient-aliases.json ./contract/ingredient-aliases.json
ENV ALIASES_PATH=/srv/contract/ingredient-aliases.json
USER nobody
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
