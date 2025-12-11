#!/usr/bin/env python3
"""
Run the Budget Agent API server

This script starts the FastAPI server with proper configuration.
"""

import uvicorn
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path so we can import from agent package
parent_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(parent_dir))

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    HOST = os.getenv('API_HOST', '0.0.0.0')
    PORT = int(os.getenv('API_PORT', '8000'))
    
    print(f"Starting Budget Agent API on {HOST}:{PORT}")
    print(f"API Documentation: http://localhost:{PORT}/docs")
    print(f"Alternative docs: http://localhost:{PORT}/redoc")
    
    uvicorn.run(
        "agent.api.main:app",
        host=HOST,
        port=PORT,
        reload=True,
        log_level="info"
    )

