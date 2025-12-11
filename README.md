# Budget Agent

AI-powered bank statement processing and financial analysis system using Google Gemini.

## Features

- CSV import (single or multi-month) with raw storage preserved
- Smart categorization into outgoings, income, and purchases with day-of-month tracking
- Recurring detection, duplicate outgoing clean-up, and transaction-type overrides
- Balance and overdraft tracking with snapshots
- Full-dataset AI summaries powered by Google Gemini
- REST API ready for any frontend (dashboard provided in `ui/`)

## Quick Start

### 1. Installation

```bash
cd agent
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configuration

Create a `.env` file:

```bash
cp env.example .env
```

Edit `.env` and add your Google API key. Optional values shown with defaults:

```
GOOGLE_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
DB_PATH=budget_agent.db
API_HOST=0.0.0.0
API_PORT=8000
```

### 3. Run the Server

```bash
python run_server.py
```

The API will be available at `http://localhost:8000`

### 4. Upload CSV

```bash
curl -X POST http://localhost:8000/upload-statement \
  -F "file=@your_statement.csv"
```

## Database Schema

### Raw Transactions
Stores unprocessed CSV data with full dates:
- `transaction_date` (full date from CSV)
- `transaction_number`, `account`, `amount`, `subcategory`, `memo`

### Processed Transactions
Categorized and stored with day-of-month:
- **Outgoings**: Bills, direct debits, standing orders
- **Income**: Salary, credits, refunds
- **Purchases**: Card purchases, debits

All store `day_of_month` (1-31) instead of full date for easier recurring transaction predictions.

### Balance & Overdraft
Track account balances and overdraft limits over time with timestamps.

## Key Changes

⚠️ **Breaking Change**: Database schema has changed.

**If upgrading from a previous version:**
1. Delete old database: `rm budget_agent.db`
2. Restart server (new schema will be created)
3. Re-upload your CSV files

**What's Different:**
- Processed transactions now use `day_of_month` instead of `transaction_date`
- New `raw_transactions` table stores complete CSV data
- New `balances` and `overdrafts` tables for tracking

## Documentation

- **API_ENDPOINTS.md** - Complete API reference with all endpoints and examples

## Example Usage

### Upload CSV
```python
import requests

with open('statement.csv', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/upload-statement',
        files={'file': f}
    )
print(response.json())
```

### Get Outgoings (with day of month)
```python
response = requests.get('http://localhost:8000/outgoings')
outgoings = response.json()

for o in outgoings:
    print(f"Day {o['day_of_month']}: £{o['amount']} to {o['merchant']}")
```

### Add Balance
```python
balance_data = {
    "name": "Current Account",
    "amount": 1250.75,
    "recorded_at": "2024-11-26T10:30:00Z"
}

response = requests.post('http://localhost:8000/balance', json=balance_data)
```

### Get Raw Transactions by Month
```python
response = requests.get('http://localhost:8000/raw-transactions/month/2024/11')
november_transactions = response.json()
```

## Tech Stack

- **Backend**: FastAPI
- **Database**: SQLite with SQLAlchemy ORM
- **AI**: Google Gemini (gemini-2.0-flash-exp)
- **Python**: 3.8+

## Project Structure

```
budget-agent/
├── agent/
│   ├── agent_logic/       # CSV processing and AI logic
│   ├── api/               # FastAPI endpoints
│   ├── db/                # Database models and operations
│   └── run_server.py      # Server entry point
├── ui/                    # React frontend (separate)
└── docs/                  # Sample CSV files
```

## License

MIT





