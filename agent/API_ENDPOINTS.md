# Budget Agent API Endpoints

## Base URL
`http://localhost:8000`

---

## Health Check

### GET `/`
Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "message": "Budget Agent API is running",
  "version": "1.0.0"
}
```

---

## CSV Upload Endpoints

### POST `/upload-statement`
Upload and process a single bank statement CSV file.

**Parameters:**
- `file`: CSV file (multipart/form-data)
- `use_ai_analysis`: Boolean (optional, default: false)

**Response:**
```json
{
  "success": true,
  "message": "Successfully processed statement.csv",
  "outgoings_added": 10,
  "income_added": 2,
  "purchases_added": 45
}
```

### POST `/upload-multi-month`
Upload and process multiple months of bank statements.

**Parameters:**
- `files`: Array of CSV files (multipart/form-data)
- `use_ai_analysis`: Boolean (optional, default: false)

**Response:**
```json
{
  "success": true,
  "message": "Successfully processed 3 month(s) of data",
  "outgoings_added": 25,
  "income_added": 6,
  "purchases_added": 120,
  "is_multi_month": true,
  "num_months": 3,
  "consistent_outgoings": 25,
  "consistent_income": 6
}
```

---

## Raw Transaction Endpoints

### GET `/raw-transactions`
Get all raw transactions from uploaded CSV files.

**Query Parameters:**
- `limit`: Integer (optional) - Limit number of results

**Response:**
```json
[
  {
    "id": 1,
    "transaction_number": "123456",
    "transaction_date": "2024-11-15",
    "account": "Current Account",
    "amount": 50.00,
    "subcategory": "Direct Debit",
    "memo": "Test Payment",
    "created_at": "2024-11-26T10:30:00"
  }
]
```

### GET `/raw-transactions/date-range`
Get raw transactions within a specific date range.

**Query Parameters:**
- `start_date`: String (YYYY-MM-DD format, required)
- `end_date`: String (YYYY-MM-DD format, required)

**Example:**
```
GET /raw-transactions/date-range?start_date=2024-11-01&end_date=2024-11-30
```

**Response:** Same format as `/raw-transactions`

### GET `/raw-transactions/month/{year}/{month}`
Get raw transactions for a specific month.

**Path Parameters:**
- `year`: Integer (e.g., 2024)
- `month`: Integer (1-12)

**Example:**
```
GET /raw-transactions/month/2024/11
```

**Response:** Same format as `/raw-transactions`

### GET `/raw-transactions/available-months`
Get all available months that have raw transaction data.

**Response:**
```json
[
  {
    "year": 2024,
    "month": 11
  },
  {
    "year": 2024,
    "month": 10
  }
]
```

**Note:** Results are sorted in descending order (most recent first).

### PATCH `/raw-transactions/{transaction_id}/override-type`
Update a raw transaction's `override_subcategory` to change how it is treated downstream.

**Request Body:**
```json
{
  "override_subcategory": "Card Purchase"
}
```

**Response:** Updated raw transaction (same shape as `/raw-transactions`).

---

## Processed Transaction Endpoints

### GET `/outgoings`
Get all outgoing transactions (bills, direct debits, standing orders).

**Query Parameters:**
- `limit`: Integer (optional) - Limit number of results
- `merchant`: String (optional) - Filter by merchant name

**Response:**
```json
[
  {
    "id": 1,
    "day_of_month": 15,
    "amount": 50.00,
    "merchant": "British Gas",
    "memo": "Gas Bill",
    "subcategory": "Direct Debit",
    "account": "Current Account"
  }
]
```

### POST `/outgoings`
Add a scheduled/recurring outgoing manually.

**Request Body:**
```json
{
  "day_of_month": 15,
  "amount": 50.00,
  "merchant": "British Gas",
  "memo": "Gas Bill",
  "subcategory": "Direct Debit",
  "account": "Current Account"
}
```

### PATCH `/outgoings/{id}`
Update a scheduled outgoing. Include only fields you want to change.

### DELETE `/outgoings/{id}`
Delete a scheduled outgoing by id.

### POST `/outgoings/remove-duplicates`
Remove duplicate/cheaper outgoings grouped by merchant/memo. Returns removed entries and a count.

### GET `/income`
Get all income transactions.

**Query Parameters:**
- `limit`: Integer (optional) - Limit number of results
- `source`: String (optional) - Filter by income source

**Response:**
```json
[
  {
    "id": 1,
    "day_of_month": 25,
    "amount": 2500.00,
    "source": "Employer Name",
    "memo": "Salary",
    "subcategory": "Counter Credit",
    "account": "Current Account"
  }
]
```

### GET `/purchases`
Get all purchase transactions (card purchases, debits).

**Query Parameters:**
- `limit`: Integer (optional) - Limit number of results
- `merchant`: String (optional) - Filter by merchant name

**Response:**
```json
[
  {
    "id": 1,
    "day_of_month": 10,
    "amount": 25.50,
    "merchant": "Tesco",
    "memo": "Supermarket purchase",
    "subcategory": "Card Purchase",
    "account": "Current Account"
  }
]
```

---

## Balance Management Endpoints

### POST `/balance`
Add a new balance record.

**Request Body:**
```json
{
  "name": "Current Account",
  "amount": 1250.75,
  "recorded_at": "2024-11-26T10:30:00Z"
}
```

**Notes:**
- `name`: Required - Account name or description
- `amount`: Required - Balance amount in GBP
- `recorded_at`: Optional - Datetime when balance was recorded (defaults to now if omitted)

**Response:**
```json
{
  "id": 1,
  "name": "Current Account",
  "amount": 1250.75,
  "recorded_at": "2024-11-26T10:30:00",
  "created_at": "2024-11-26T10:30:00"
}
```

### GET `/balance`
Get all balance records.

**Query Parameters:**
- `limit`: Integer (optional) - Limit number of results

**Response:**
```json
[
  {
    "id": 1,
    "name": "Current Account",
    "amount": 1250.75,
    "recorded_at": "2024-11-26T10:30:00",
    "created_at": "2024-11-26T10:30:00"
  }
]
```

### GET `/balance/latest`
Get the most recent balance record.

**Response:**
```json
{
  "id": 1,
  "name": "Current Account",
  "amount": 1250.75,
  "recorded_at": "2024-11-26T10:30:00",
  "created_at": "2024-11-26T10:30:00"
}
```

**Note:** Returns `null` if no balance records exist.

---

## Overdraft Management Endpoints

### POST `/overdraft`
Add a new overdraft limit record.

**Request Body:**
```json
{
  "amount": 1000.00,
  "recorded_at": "2024-11-26T10:30:00Z"
}
```

**Notes:**
- `amount`: Required - Overdraft limit in GBP
- `recorded_at`: Optional - Datetime when overdraft was set (defaults to now if omitted)

**Response:**
```json
{
  "id": 1,
  "amount": 1000.00,
  "recorded_at": "2024-11-26T10:30:00",
  "created_at": "2024-11-26T10:30:00"
}
```

### GET `/overdraft`
Get all overdraft records.

**Query Parameters:**
- `limit`: Integer (optional) - Limit number of results

**Response:**
```json
[
  {
    "id": 1,
    "amount": 1000.00,
    "recorded_at": "2024-11-26T10:30:00",
    "created_at": "2024-11-26T10:30:00"
  }
]
```

### GET `/overdraft/latest`
Get the most recent overdraft record.

**Response:**
```json
{
  "id": 1,
  "amount": 1000.00,
  "recorded_at": "2024-11-26T10:30:00",
  "created_at": "2024-11-26T10:30:00"
}
```

**Note:** Returns `null` if no overdraft records exist.

---

## Summary Endpoints (AI-Generated)

### GET `/summary/spending`
Get AI-generated summary of outgoing transactions.

**Response:**
```json
{
  "summary": "AI-generated spending analysis...",
  "total_amount": 1250.50,
  "transaction_count": 15
}
```

### GET `/summary/income`
Get AI-generated summary of income transactions.

**Response:** Same format as `/summary/spending`

### GET `/summary/purchases`
Get AI-generated summary of purchase transactions.

**Response:** Same format as `/summary/spending`

### GET `/summary/comprehensive`
Get comprehensive AI-generated financial summary.

**Response:**
```json
{
  "summary": "Comprehensive financial analysis...",
  "total_amount": 3500.75,
  "transaction_count": 65,
  "statistics": {
    "num_months": 1,
    "total_outgoings": 1250.50,
    "total_income": 5000.00,
    "total_purchases": 2250.25,
    "total_spent": 3500.75,
    "net_position": 1499.25
  }
}
```

---

## Statistics Endpoint

### GET `/stats`
Get overall transaction statistics.

**Response:**
```json
{
  "total_outgoings": 1250.50,
  "total_purchases": 2250.25,
  "total_expenses": 3500.75,
  "total_income": 5000.00,
  "net": 1499.25,
  "outgoing_count": 15,
  "purchase_count": 45,
  "income_count": 3
}
```

---

## Utility Endpoints

### DELETE `/clear-data`
Clear all transaction data from the database.

**Warning:** This is destructive and cannot be undone!

**Response:**
```json
{
  "success": true,
  "message": "All data cleared successfully"
}
```

---

## Key Changes in New Version

### 1. Day of Month Instead of Full Date
Processed transactions (outgoings, income, purchases) now store `day_of_month` (1-31) instead of full date.

**Old Response:**
```json
{
  "transaction_date": "2024-11-15"
}
```

**New Response:**
```json
{
  "day_of_month": 15
}
```

### 2. Raw Transactions Table
All CSV data is now stored in a separate `raw_transactions` table with full dates preserved.

### 3. Balance & Overdraft Tracking
New endpoints for managing balance snapshots and overdraft limits.

---

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

