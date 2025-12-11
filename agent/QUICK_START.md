# Quick Start

Quick commands to activate the virtual environment and start the API.

## 1) Enter the project

```bash
cd /Users/andywilliamson/Code/Repositories\ For\ Demos/budget-agent/agent
```

## 2) Create and activate the virtual environment

```bash
python -m venv venv
```

Mac/Linux:

```bash
source venv/bin/activate
```

Windows:

```bash
venv\Scripts\activate
```

## 3) Install dependencies

```bash
pip install -r requirements.txt
```

## 4) Configure environment

```bash
cp .env.example .env
```

Edit `.env` to add your Google API key and any overrides for host, port, or database path.

## 5) Run the API

```bash
python run_server.py
```

Or run directly with uvicorn:

```bash
python -m uvicorn agent.api.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000 (docs at http://localhost:8000/docs).

## 6) Deactivate when finished

```bash
deactivate
```

