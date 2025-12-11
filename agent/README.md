# Budget Agent

A Google ADK-powered agent that processes Barclays bank statement CSV files, extracts transaction information, and stores it in a SQLite database. The system provides a RESTful API for uploading statements and retrieving financial data.

## What's New

- Multi-month uploads with recurring detection
- AI summaries use full datasets, not samples
- Duplicate outgoing cleaner and transaction-type overrides
- Balance and overdraft tracking

## Features

- CSV parsing for Barclays statements
- Multi-month analysis to find recurring income/outgoings
- Smart categorization into outgoings, income, purchases
- Full-dataset AI summaries (no sample limits)
- Manual scheduled outgoings plus duplicate clean-up
- Transaction-type overrides on raw data
- Balance and overdraft tracking
- FastAPI + SQLite with clear separation of concerns

## Project Structure

```
agent/
├── db/                      # Database layer
│   ├── __init__.py
│   ├── models.py           # SQLAlchemy models (Outgoing, Income)
│   └── database.py         # Database operations
├── agent_logic/            # Agent and processing logic
│   ├── __init__.py
│   ├── agent.py            # Google ADK agent
│   └── csv_processor.py    # CSV parsing and categorization
├── api/                    # FastAPI application
│   ├── __init__.py
│   └── main.py             # API endpoints
├── __init__.py
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
└── README.md              # This file
```

## Setup

See `QUICK_START.md` for a condensed run guide. Steps below include full details.

### 1. Install Dependencies

```bash
cd agent
pip install -r requirements.txt
```

### 2. Configure Environment

Copy the `.env.example` file to `.env` and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` and add your Google API key. Optional values shown with defaults:

```
GOOGLE_API_KEY=your_actual_api_key_here
GEMINI_MODEL=gemini-2.5-flash
DB_PATH=budget_agent.db
API_HOST=0.0.0.0
API_PORT=8000
```

To get a Google API key:
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy it to your `.env` file

### 3. Run the API Server

```bash
# From the agent directory
python run_server.py
```

Or run directly with uvicorn:

```bash
python -m uvicorn agent.api.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- **Interactive API docs**: http://localhost:8000/docs
- **Alternative docs**: http://localhost:8000/redoc

### Key Endpoints

- Upload statements: `POST /upload-statement` or `POST /upload-multi-month` (CSV, optional `use_ai_analysis`)
- Processed data: `GET /outgoings`, `GET /income`, `GET /purchases`
- Manage scheduled outgoings: `POST /outgoings`, `PATCH /outgoings/{id}`, `DELETE /outgoings/{id}`, `POST /outgoings/remove-duplicates`
- Raw data utilities: `GET /raw-transactions` (with date filters), `PATCH /raw-transactions/{id}/override-type`
- Balances and overdrafts: `POST/GET /balance`, `GET /balance/latest`, `POST/GET /overdraft`, `GET /overdraft/latest`
- Summaries and stats: `GET /summary/spending|income|purchases|comprehensive`, `GET /stats`
- Maintenance: `DELETE /clear-data`

## Usage Examples

### Using cURL

**Upload a statement:**
```bash
curl -X POST "http://localhost:8000/upload-statement" \
  -F "file=@Barclays_Latest_Statement.csv" \
  -F "use_ai_analysis=false"
```

**Get all outgoings:**
```bash
curl "http://localhost:8000/outgoings"
```

**Get spending summary:**
```bash
curl "http://localhost:8000/summary/spending"
```

### Using Python

```python
import requests

# Upload a statement
with open('Barclays_Latest_Statement.csv', 'rb') as f:
    files = {'file': f}
    response = requests.post('http://localhost:8000/upload-statement', files=files)
    print(response.json())

# Get outgoings
response = requests.get('http://localhost:8000/outgoings')
outgoings = response.json()

# Get AI-powered spending summary
response = requests.get('http://localhost:8000/summary/spending')
summary = response.json()
print(summary['summary'])
```

### Using the Agent Programmatically

```python
from agent import BankStatementAgent, Database

# Initialize agent
agent = BankStatementAgent(api_key='your_google_api_key')

# Process a CSV file
with open('statement.csv', 'r') as f:
    content = f.read()
    outgoings, income = agent.process_csv_file(content)

# Initialize database
db = Database('budget_agent.db')

# Add transactions
db.bulk_add_outgoings(outgoings)
db.bulk_add_income(income)

# Query data
all_outgoings = db.get_all_outgoings()
```

## CSV Format

The agent expects Barclays bank statement CSV files with the following columns:

- `Number`: Transaction number
- `Date`: Transaction date (DD/MM/YYYY)
- `Account`: Account number
- `Amount`: Transaction amount (negative for outgoings, positive for income)
- `Subcategory`: Transaction type (e.g., Direct Debit, Card Purchase, Counter Credit)
- `Memo`: Transaction description/merchant information

## Database Schema

### Outgoings Table
- `id`: Primary key
- `transaction_number`: Transaction reference
- `transaction_date`: Date of transaction
- `account`: Account number
- `amount`: Transaction amount (positive)
- `subcategory`: Transaction category
- `memo`: Original description
- `merchant`: Extracted merchant name
- `created_at`: Record creation timestamp

### Income Table
- `id`: Primary key
- `transaction_number`: Transaction reference
- `transaction_date`: Date of transaction
- `account`: Account number
- `amount`: Transaction amount (positive)
- `subcategory`: Transaction category
- `memo`: Original description
- `source`: Extracted income source
- `created_at`: Record creation timestamp

## AI Features

The agent uses Google's Generative AI (Gemini) to provide:

1. **Transaction Analysis**: Categorizes and provides insights on individual transactions
2. **Spending Summaries**: Identifies patterns and provides budgeting recommendations
3. **Income Analysis**: Analyzes income sources and patterns

Note: AI analysis is optional and can be enabled/disabled per request to manage API costs.

## Development

### Running Tests

```bash
pytest
```

### Code Style

The project follows these conventions:
- Single-line comments using `//`
- JSDoc-style comments for APIs
- New lines between elements for readability
- Variables and constants grouped at the top of functions

## Troubleshooting

**Error: Google API key not configured**
- Ensure `GOOGLE_API_KEY` is set in your `.env` file or environment variables

**Error: Database locked**
- Make sure only one instance of the API is running
- Check file permissions on the database file

**Error: CSV parsing failed**
- Verify the CSV file matches the Barclays format
- Check for encoding issues (should be UTF-8)

## License

MIT

## Support

For issues or questions, please open an issue on the project repository.

