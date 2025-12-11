#!/usr/bin/env python3

"""
Example script demonstrating multi-month CSV processing

This script shows how to use the enhanced agent to:
1. Process multiple months of bank statements
2. Identify consistent outgoings and income across months
3. Generate comprehensive summaries using ALL data
"""

from agent_logic import BankStatementAgent


def main():
    """
    Example of processing multiple months of bank statements
    """
    # Initialize the agent
    agent = BankStatementAgent()
    
    print("=" * 80)
    print("MULTI-MONTH BANK STATEMENT ANALYSIS")
    print("=" * 80)
    print()
    
    # Example: Load multiple CSV files
    # In a real scenario, you would read actual files
    csv_files = [
        "path/to/january_statement.csv",
        "path/to/february_statement.csv",
        "path/to/march_statement.csv"
    ]
    
    # Read file contents
    file_contents = []
    
    for csv_file in csv_files:
        try:
            with open(csv_file, 'r') as f:
                file_contents.append(f.read())
        except FileNotFoundError:
            print(f"⚠️  File not found: {csv_file}")
            print("This is just an example. Please update the paths to your actual CSV files.")
            return
    
    # Process multiple months
    print("\n📊 PROCESSING MULTIPLE MONTHS\n")
    
    consistent_outgoings, consistent_income, all_purchases, stats = agent.process_multiple_csv_files(
        file_contents,
        use_ai_analysis=False
    )
    
    # Display statistics
    print("\n" + "=" * 80)
    print("FINANCIAL STATISTICS")
    print("=" * 80)
    print()
    print(f"Analysis Period: {stats['num_months']} months")
    print()
    print("CONSISTENT OUTGOINGS (Bills & Direct Debits):")
    print(f"  - Total: £{stats['total_outgoings']:.2f}")
    print(f"  - Average per Month: £{stats['avg_monthly_outgoings']:.2f}")
    print(f"  - Number of Consistent Transactions: {stats['num_outgoing_transactions']}")
    print()
    print("CONSISTENT INCOME:")
    print(f"  - Total: £{stats['total_income']:.2f}")
    print(f"  - Average per Month: £{stats['avg_monthly_income']:.2f}")
    print(f"  - Number of Consistent Sources: {stats['num_income_transactions']}")
    print()
    print("PURCHASES (Card Purchases & Debits):")
    print(f"  - Total: £{stats['total_purchases']:.2f}")
    print(f"  - Average per Month: £{stats['avg_monthly_purchases']:.2f}")
    print(f"  - Total Transactions: {stats['num_purchase_transactions']}")
    print()
    print("OVERALL:")
    print(f"  - Total Spent: £{stats['total_spent']:.2f}")
    print(f"  - Net Position: £{stats['net_position']:.2f}")
    print()
    
    # Display top consistent outgoings
    print("\n" + "=" * 80)
    print("TOP CONSISTENT OUTGOINGS")
    print("=" * 80)
    print()
    
    sorted_outgoings = sorted(consistent_outgoings, key=lambda x: x['amount'], reverse=True)[:10]
    
    for outgoing in sorted_outgoings:
        print(f"£{outgoing['amount']:.2f} - {outgoing['merchant']}")
        print(f"  Appeared {outgoing['occurrence_count']}x across {outgoing['months_present']} months")
        print()
    
    # Generate AI summaries
    print("\n" + "=" * 80)
    print("AI ANALYSIS - OUTGOINGS")
    print("=" * 80)
    print()
    
    spending_summary = agent.get_spending_summary(consistent_outgoings, stats)
    
    print("\n" + "=" * 80)
    print("AI ANALYSIS - INCOME")
    print("=" * 80)
    print()
    
    income_summary = agent.get_income_summary(consistent_income, stats)
    
    print("\n" + "=" * 80)
    print("AI ANALYSIS - PURCHASES")
    print("=" * 80)
    print()
    
    purchases_summary = agent.get_purchases_summary(all_purchases, stats)
    
    print("\n" + "=" * 80)
    print("COMPREHENSIVE FINANCIAL SUMMARY")
    print("=" * 80)
    print()
    
    comprehensive_summary = agent.get_comprehensive_summary(
        consistent_outgoings,
        consistent_income,
        all_purchases,
        stats
    )


if __name__ == "__main__":
    main()

