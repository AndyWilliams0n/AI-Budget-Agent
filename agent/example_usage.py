#!/usr/bin/env python3
"""
Example usage of the Budget Agent

This script demonstrates how to use the agent programmatically
without the API.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path so we can import from agent package
parent_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(parent_dir))

from agent.agent_logic import BankStatementAgent
from agent.db import Database

# Load environment variables
load_dotenv()


def main():
    """
    Example of processing a bank statement programmatically
    """
    
    # Initialize database
    print("Initializing database...")
    db = Database('budget_agent.db')
    
    # Initialize agent
    print("Initializing agent...")
    
    try:
        agent = BankStatementAgent()
    except ValueError as e:
        print(f"Error: {e}")
        print("Please set GOOGLE_API_KEY in your environment or .env file")
        return
    
    # Example: Process a CSV file
    csv_file_path = '../docs/Barclays Latest Statement.csv'
    
    if not os.path.exists(csv_file_path):
        print(f"CSV file not found: {csv_file_path}")
        print("Please provide a valid CSV file path")
        return
    
    print(f"\nProcessing {csv_file_path}...")
    
    with open(csv_file_path, 'r') as f:
        FILE_CONTENT = f.read()
        
        # Process without AI analysis (faster)
        outgoings, income = agent.process_csv_file(FILE_CONTENT, use_ai_analysis=False)
    
    print(f"\nFound {len(outgoings)} outgoing transactions")
    print(f"Found {len(income)} income transactions")
    
    # Add to database
    print("\nAdding transactions to database...")
    db.bulk_add_outgoings(outgoings)
    db.bulk_add_income(income)
    
    print("Done!")
    
    # Query and display some data
    print("\n--- Recent Outgoings ---")
    recent_outgoings = db.get_all_outgoings(limit=5)
    
    for outgoing in recent_outgoings:
        print(f"{outgoing.transaction_date}: £{outgoing.amount:.2f} - {outgoing.merchant}")
    
    print("\n--- Income Transactions ---")
    all_income = db.get_all_income()
    
    for inc in all_income:
        print(f"{inc.transaction_date}: £{inc.amount:.2f} - {inc.source}")
    
    # Generate AI summary
    print("\n--- AI Spending Summary ---")
    summary = agent.get_spending_summary(outgoings[:20])  # Limit for efficiency
    print(summary)


if __name__ == "__main__":
    main()

