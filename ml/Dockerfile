# Use an official Python runtime, slim version
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Set environment variables to prevent Python from writing .pyc files and to ensure output is not buffered
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy requirements if available, else install fastapi and uvicorn directly
COPY requirements.txt* ./
RUN if [ -f "requirements.txt" ]; then pip install --no-cache-dir -r requirements.txt; else pip install --no-cache-dir fastapi uvicorn; fi

# Copy the rest of the application
COPY . .

# Expose the port Uvicorn runs on
EXPOSE 8000

# Run Uvicorn with hot reload enabled
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
