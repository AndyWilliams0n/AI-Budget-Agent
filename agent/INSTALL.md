# Installation Guide

Complete guide to installing and setting up the Budget Agent.

## Prerequisites

Before you begin, ensure you have:

- **Python 3.8 or higher** installed
  ```bash
  python --version
  # Should output: Python 3.8.x or higher
  ```

- **pip** (Python package manager)
  ```bash
  pip --version
  ```

- **A Google API Key** for Generative AI
  - Get one at: https://makersuite.google.com/app/apikey
  - It's free to start!

## Step-by-Step Installation

### Step 1: Navigate to the Agent Directory

```bash
cd /Users/andywilliamson/Code/Repositories\ For\ Demos/budget-agent/agent
```

Or wherever you've placed the project.

### Step 2: Create a Virtual Environment (Recommended)

This keeps dependencies isolated from your system Python:

```bash
# Create virtual environment
python -m venv venv

# Activate it (Mac/Linux)
source venv/bin/activate

# Activate it (Windows)
venv\Scripts\activate
```

You should see `(venv)` in your terminal prompt.

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- FastAPI (web framework)
- Uvicorn (ASGI server)
- SQLAlchemy (database ORM)
- Google Generative AI SDK
- Pandas (data processing)
- Pydantic (validation)
- python-dotenv (environment management)

### Step 4: Configure Environment Variables

```bash
# Copy the example environment file
cp env.example .env

# Open in your favorite editor
nano .env
# or
vim .env
# or
code .env
```

Edit the `.env` file and add your Google API key. You can also set the Gemini model (defaults to `gemini-2.5-flash`) and override the database path or host/port if needed:

```env
GOOGLE_API_KEY=your_actual_api_key_here
GEMINI_MODEL=gemini-2.5-flash
DB_PATH=budget_agent.db
API_HOST=0.0.0.0
API_PORT=8000
```

### Step 5: Verify Installation

Run the setup verification script:

```bash
python test_setup.py
```

You should see output like:
```
=============================================================
Budget Agent Setup Verification
=============================================================

Checking package imports...
  ✓ FastAPI
  ✓ Uvicorn
  ✓ SQLAlchemy
  ✓ Google Generative AI
  ✓ Pydantic

Checking environment variables...
  ✓ GOOGLE_API_KEY is set (length: 39)

Checking local modules...
  ✓ Database module
  ✓ Agent logic module
  ✓ API module

...

✓ All checks passed! Your setup is ready.
```

### Step 6: Run the Server

```bash
python run_server.py
```

You should see:
```
Starting Budget Agent API on 0.0.0.0:8000
API Documentation: http://localhost:8000/docs
Alternative docs: http://localhost:8000/redoc
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 7: Test the API

Open your browser and go to:
- http://localhost:8000 (health check)
- http://localhost:8000/docs (interactive API documentation)

## Alternative Installation Methods

### Using Docker

If you have Docker installed:

```bash
# Build and run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Don't forget to set `GOOGLE_API_KEY` in your `.env` file first!

### Using pip directly (without virtual environment)

```bash
pip install fastapi uvicorn sqlalchemy google-generativeai pandas pydantic python-dotenv
```

## Troubleshooting

### Issue: "Module not found" errors

**Solution**: Make sure you're in the `agent` directory and have activated your virtual environment.

```bash
# Check current directory
pwd

# Should end with: /budget-agent/agent

# Activate virtual environment if not active
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows
```

### Issue: "GOOGLE_API_KEY not configured"

**Solution**: Check your `.env` file exists and contains the API key.

```bash
# Check if .env exists
ls -la .env

# View contents (be careful not to share this!)
cat .env
```

### Issue: "Port 8000 already in use"

**Solution**: Either stop the other service using port 8000, or change the port:

```bash
# In .env file, change:
API_PORT=8001

# Then restart the server
```

### Issue: "Permission denied" when installing packages

**Solution**: Use a virtual environment or add `--user` flag:

```bash
pip install --user -r requirements.txt
```

### Issue: Python version too old

**Solution**: Upgrade Python or use pyenv to manage multiple versions:

```bash
# Check version
python --version

# If too old, install newer version or use pyenv
pyenv install 3.11
pyenv local 3.11
```

## Verification Checklist

- [ ] Python 3.8+ installed
- [ ] Virtual environment created and activated
- [ ] All dependencies installed (`pip install -r requirements.txt`)
- [ ] `.env` file created with `GOOGLE_API_KEY`
- [ ] `test_setup.py` runs successfully
- [ ] Server starts without errors
- [ ] Can access http://localhost:8000
- [ ] Can access http://localhost:8000/docs

## Next Steps

Once installation is complete:

1. **Read the Quick Start**: `QUICKSTART.md`
2. **Try the example**: `python example_usage.py`
3. **Upload a CSV**: Use the `/upload-statement` endpoint
4. **Explore the API**: Visit http://localhost:8000/docs

## Uninstallation

To completely remove the installation:

```bash
# Deactivate virtual environment
deactivate

# Remove virtual environment
rm -rf venv

# Remove database
rm budget_agent.db

# Remove .env file
rm .env
```

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review the `README.md` for detailed documentation
3. Run `python test_setup.py` to diagnose problems
4. Check the logs for error messages

## System Requirements

**Minimum**:
- Python 3.8+
- 1 GB RAM
- 100 MB disk space

**Recommended**:
- Python 3.11+
- 2 GB RAM
- 500 MB disk space (for larger databases)

## Dependencies Summary

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.115.0 | Web framework |
| uvicorn | 0.32.0 | ASGI server |
| sqlalchemy | 2.0.35 | Database ORM |
| google-generativeai | 0.8.3 | AI integration |
| pandas | 2.2.3 | Data processing |
| pydantic | 2.9.2 | Validation |
| python-dotenv | 1.0.1 | Environment management |

## Updating

To update to the latest dependencies:

```bash
pip install --upgrade -r requirements.txt
```

## Production Deployment

For production deployment, see `ARCHITECTURE.md` for options including:
- Docker deployment
- Cloud platforms (AWS, GCP, Azure)
- Using Gunicorn for production server

## License

MIT License - See project root for details.

