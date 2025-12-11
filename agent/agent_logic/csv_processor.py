# CSV processing utilities for bank statements

import csv
from datetime import datetime
from typing import List, Dict, Tuple
from io import StringIO
import re


class BankStatementProcessor:
    """
    Processes Barclays bank statement CSV files
    """
    
    def __init__(self):
        # Categories for regular outgoing payments (bills, subscriptions)
        self.outgoing_categories = [
            'Direct Debit',
            'Bill Payment',
            'Standing Order',
            'Credit Payment'
        ]
        
        # Categories for purchases (shopping, retail)
        self.purchase_categories = [
            'Debit',
            'Card Purchase'
        ]
        
        # Categories that indicate income
        self.income_categories = [
            'Counter Credit',
            'Unpaid'  # Unpaid/refund transactions are typically returns
        ]
        
        # Minimum amount threshold for likely salary/income (£1000+)
        self.large_income_threshold = 1000.0
    
    def parse_csv_file(self, file_content: str) -> List[Dict]:
        """
        Parse CSV file content and return list of transactions
        
        Args:
            file_content: String content of CSV file
            
        Returns:
            List of transaction dictionaries
        """
        transactions = []
        csv_file = StringIO(file_content)
        reader = csv.DictReader(csv_file)
        
        for row in reader:
            # Skip empty rows
            if not row.get('Date') or not row.get('Amount'):
                continue
            
            transaction = self._parse_transaction_row(row)
            
            if transaction:
                transactions.append(transaction)
        
        return transactions
    
    def _parse_transaction_row(self, row: Dict) -> Dict:
        """
        Parse a single transaction row
        
        Args:
            row: Dictionary representing a CSV row
            
        Returns:
            Parsed transaction dictionary
        """
        try:
            # Parse date (format: DD/MM/YYYY)
            date_str = row['Date'].strip()
            transaction_date = datetime.strptime(date_str, '%d/%m/%Y').date()
            
            # Parse amount
            amount = float(row['Amount'].strip())
            
            # Extract merchant/source from memo
            memo = row.get('Memo', '').strip()
            merchant_or_source = self._extract_merchant_name(memo)
            
            transaction = {
                'transaction_number': row.get('Number', '').strip() or None,
                'transaction_date': transaction_date,
                'account': row.get('Account', '').strip(),
                'amount': abs(amount),  # Store as positive value
                'subcategory': row.get('Subcategory', '').strip(),
                'memo': memo
            }
            
            return transaction
            
        except (ValueError, KeyError) as e:
            print(f"Error parsing row: {e}")
            return None
    
    def _extract_merchant_name(self, memo: str) -> str:
        """
        Extract merchant or source name from memo field
        
        Args:
            memo: Memo field from transaction
            
        Returns:
            Cleaned merchant/source name
        """
        if not memo:
            return ""
        
        # Remove common suffixes and patterns
        memo = re.sub(r'\s+ON\s+\d{2}\s+\w{3}.*$', '', memo)
        memo = re.sub(r'\s+AMOUNT IN.*$', '', memo, flags=re.IGNORECASE)
        memo = re.sub(r'\s+[A-Z]{3}$', '', memo)  # Remove currency codes
        
        # Trim and clean
        merchant = memo.strip()
        
        return merchant
    
    def categorize_transactions(self, transactions: List[Dict]) -> Tuple[List[Dict], List[Dict], List[Dict]]:
        """
        Categorize transactions into outgoings, income, and purchases
        
        Uses subcategory data intelligently:
        - Direct Debit, Bill Payment, Standing Order -> Outgoings
        - Card Purchase, Debit -> Purchases
        - Counter Credit with large amounts (£1000+) -> Income (likely salary)
        - Counter Credit with smaller amounts -> Income
        
        Args:
            transactions: List of parsed transactions
            
        Returns:
            Tuple of (outgoings_list, income_list, purchases_list)
        """
        outgoings = []
        income = []
        purchases = []
        
        for transaction in transactions:
            subcategory = transaction.get('subcategory', '')
            amount = transaction.get('amount', 0)
            memo = transaction.get('memo', '')
            transaction_date = transaction.get('transaction_date')
            
            # Extract day of month from transaction date
            day_of_month = transaction_date.day if transaction_date else 1
            
            # Determine transaction type based on subcategory
            if subcategory in self.outgoing_categories:
                # Regular outgoings (Direct Debits, Bill Payments, etc.)
                merchant = self._extract_merchant_name(memo)
                outgoing = transaction.copy()
                outgoing['merchant'] = merchant
                outgoing['day_of_month'] = day_of_month
                outgoings.append(outgoing)
                
            elif subcategory in self.purchase_categories:
                # Purchases (Card Purchases, Debits)
                merchant = self._extract_merchant_name(memo)
                purchase = transaction.copy()
                purchase['merchant'] = merchant
                purchase['day_of_month'] = day_of_month
                purchases.append(purchase)
                
            elif subcategory in self.income_categories:
                # Income (Counter Credits, Unpaid/Refunds)
                source = self._extract_merchant_name(memo)
                income_transaction = transaction.copy()
                income_transaction['source'] = source
                income_transaction['day_of_month'] = day_of_month
                income.append(income_transaction)
        
        return outgoings, income, purchases
    
    def process_statement(self, file_content: str) -> Tuple[List[Dict], List[Dict], List[Dict]]:
        """
        Process a complete bank statement file
        
        Args:
            file_content: String content of CSV file
            
        Returns:
            Tuple of (outgoings_list, income_list, purchases_list)
        """
        transactions = self.parse_csv_file(file_content)
        outgoings, income, purchases = self.categorize_transactions(transactions)
        
        return outgoings, income, purchases

