# Test script for new features

import os
from datetime import datetime, date
from db import Database

# Set up test database
os.environ['DB_PATH'] = 'test_budget_agent.db'
db = Database(db_path='test_budget_agent.db')

print("✅ Database initialized with new schema")

# Test 1: Add raw transactions
print("\n--- Test 1: Raw Transactions ---")
raw_transaction = db.add_raw_transaction({
    'transaction_number': '123456',
    'transaction_date': date(2024, 11, 15),
    'account': 'Current Account',
    'amount': 50.00,
    'subcategory': 'Direct Debit',
    'memo': 'Test Payment'
})
print(f"✅ Added raw transaction: {raw_transaction}")

# Test getting all raw transactions
raw_transactions = db.get_all_raw_transactions()
print(f"✅ Retrieved {len(raw_transactions)} raw transaction(s)")

# Test getting by date range
raw_by_range = db.get_raw_transactions_by_date_range(date(2024, 11, 1), date(2024, 11, 30))
print(f"✅ Retrieved {len(raw_by_range)} raw transaction(s) by date range")

# Test getting by month
raw_by_month = db.get_raw_transactions_by_month(2024, 11)
print(f"✅ Retrieved {len(raw_by_month)} raw transaction(s) by month")

# Test 2: Add outgoing with day_of_month
print("\n--- Test 2: Outgoing with Day of Month ---")
outgoing = db.add_outgoing({
    'transaction_number': '123456',
    'day_of_month': 15,
    'account': 'Current Account',
    'amount': 50.00,
    'subcategory': 'Direct Debit',
    'memo': 'Test Payment',
    'merchant': 'Test Merchant'
})
print(f"✅ Added outgoing: {outgoing}")

# Test 3: Add income with day_of_month
print("\n--- Test 3: Income with Day of Month ---")
income = db.add_income({
    'transaction_number': '789012',
    'day_of_month': 25,
    'account': 'Current Account',
    'amount': 2500.00,
    'subcategory': 'Counter Credit',
    'memo': 'Salary',
    'source': 'Employer'
})
print(f"✅ Added income: {income}")

# Test 4: Add purchase with day_of_month
print("\n--- Test 4: Purchase with Day of Month ---")
purchase = db.add_purchase({
    'transaction_number': '345678',
    'day_of_month': 10,
    'account': 'Current Account',
    'amount': 25.50,
    'subcategory': 'Card Purchase',
    'memo': 'Supermarket',
    'merchant': 'Tesco'
})
print(f"✅ Added purchase: {purchase}")

# Test 5: Balance management
print("\n--- Test 5: Balance Management ---")
balance = db.add_balance(
    name='Current Account',
    amount=1250.75,
    recorded_at=datetime.utcnow()
)
print(f"✅ Added balance: {balance}")

all_balances = db.get_all_balances()
print(f"✅ Retrieved {len(all_balances)} balance(s)")

latest_balance = db.get_latest_balance()
print(f"✅ Latest balance: {latest_balance}")

# Test 6: Overdraft management
print("\n--- Test 6: Overdraft Management ---")
overdraft = db.add_overdraft(
    amount=1000.00,
    recorded_at=datetime.utcnow()
)
print(f"✅ Added overdraft: {overdraft}")

all_overdrafts = db.get_all_overdrafts()
print(f"✅ Retrieved {len(all_overdrafts)} overdraft(s)")

latest_overdraft = db.get_latest_overdraft()
print(f"✅ Latest overdraft: {latest_overdraft}")

# Clean up test database
import sqlite3
conn = sqlite3.connect('test_budget_agent.db')
cursor = conn.cursor()

# Show table schemas
print("\n--- Database Schema ---")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

for table in tables:
    table_name = table[0]
    print(f"\n{table_name}:")
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")

conn.close()

print("\n✅ All tests passed!")
print("Note: Test database saved as 'test_budget_agent.db'")





