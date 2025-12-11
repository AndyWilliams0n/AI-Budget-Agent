# Google ADK Agent for processing bank statements

import difflib
import google.generativeai as genai
from typing import Dict, List, Tuple, Optional
import os
from collections import defaultdict
from datetime import datetime

from .csv_processor import BankStatementProcessor


# ANSI color codes for terminal output
class Colors:
    GREY = '\033[90m'
    YELLOW = '\033[93m'
    RESET = '\033[0m'


class BankStatementAgent:
    """
    Google ADK Agent for intelligent bank statement processing
    """
    
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        """
        Initialize the agent
        
        Args:
            api_key: Google API key (defaults to GOOGLE_API_KEY env variable)
            model_name: Gemini model name (defaults to GEMINI_MODEL env variable or 'gemini-2.5-flash')
        """
        self.api_key = api_key or os.getenv('GOOGLE_API_KEY')
        
        if not self.api_key:
            raise ValueError("Google API key is required. Set GOOGLE_API_KEY environment variable or pass api_key parameter.")
        
        # Configure the Google Generative AI
        genai.configure(api_key=self.api_key)
        
        # Initialize the model with configurable model name
        self.model_name = model_name or os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        self.model = genai.GenerativeModel(self.model_name)
        
        print(f"{Colors.GREY}🚀 Agent initialized with model: {self.model_name}{Colors.RESET}")
        
        # Initialize CSV processor
        self.csv_processor = BankStatementProcessor()
    
    def analyze_transaction(self, transaction: Dict) -> Dict:
        """
        Use AI to analyze and enhance transaction data
        
        Args:
            transaction: Transaction dictionary
            
        Returns:
            Enhanced transaction with AI insights
        """
        prompt = f"""
        Analyze this bank transaction and provide insights:
        
        Date: {transaction.get('transaction_date')}
        Amount: £{transaction.get('amount')}
        Category: {transaction.get('subcategory')}
        Description: {transaction.get('memo')}
        
        Please provide:
        1. A clear category (e.g., Groceries, Utilities, Entertainment, Salary, etc.)
        2. Whether this is a recurring payment
        3. Any insights about the merchant or transaction
        
        Respond in a structured format:
        Category: [category]
        Recurring: [Yes/No]
        Insights: [brief insights]
        """
        
        print(f"{Colors.GREY}🤔 Thinking: Analyzing transaction - {transaction.get('memo')} (£{transaction.get('amount')}){Colors.RESET}")
        
        try:
            response = self.model.generate_content(prompt)
            transaction['ai_analysis'] = response.text
            
            print(f"{Colors.YELLOW}💡 Response: {response.text}{Colors.RESET}\n")
            
            return transaction
            
        except Exception as e:
            print(f"Error analyzing transaction: {e}")
            transaction['ai_analysis'] = "Analysis unavailable"
            
            return transaction
    
    def process_csv_file(self, file_content: str, use_ai_analysis: bool = False, existing_outgoings: Optional[List[Dict]] = None) -> Tuple[List[Dict], List[Dict], List[Dict]]:
        """
        Process a bank statement CSV file
        
        Args:
            file_content: String content of the CSV file
            use_ai_analysis: Whether to use AI analysis on transactions
            existing_outgoings: Existing outgoing transactions (from DB) used to prevent duplicates
            
        Returns:
            Tuple of (outgoings, income, purchases) lists
        """
        existing_outgoings = existing_outgoings or []
        
        # Parse and categorize transactions
        outgoings, income, purchases = self.csv_processor.process_statement(file_content)
        
        # Remove duplicates against existing and in-batch outgoings
        outgoings = self._filter_outgoing_duplicates(outgoings, existing_outgoings)
        
        # Optionally enhance with AI analysis
        if use_ai_analysis:
            outgoings = [self.analyze_transaction(t) for t in outgoings]
            income = [self.analyze_transaction(t) for t in income]
            purchases = [self.analyze_transaction(t) for t in purchases]
        
        return outgoings, income, purchases
    
    def process_multiple_csv_files(self, file_contents: List[str], use_ai_analysis: bool = False, existing_outgoings: Optional[List[Dict]] = None) -> Tuple[List[Dict], List[Dict], List[Dict], Dict]:
        """
        Process multiple months of bank statement CSV files
        
        Args:
            file_contents: List of CSV file contents
            use_ai_analysis: Whether to use AI analysis on transactions
            existing_outgoings: Existing outgoing transactions (from DB) used to prevent duplicates
            
        Returns:
            Tuple of (consistent_outgoings, consistent_income, all_purchases, statistics)
        """
        num_months = len(file_contents)
        seen_outgoings = list(existing_outgoings or [])
        
        print(f"{Colors.GREY}📊 Processing {num_months} month(s) of data...{Colors.RESET}")
        
        all_outgoings = []
        all_income = []
        all_purchases = []
        
        # Process each file
        for idx, file_content in enumerate(file_contents):
            print(f"{Colors.GREY}📄 Processing month {idx + 1}/{num_months}...{Colors.RESET}")
            
            outgoings, income, purchases = self.process_csv_file(file_content, use_ai_analysis=False, existing_outgoings=seen_outgoings)
            all_outgoings.extend(outgoings)
            all_income.extend(income)
            all_purchases.extend(purchases)
            seen_outgoings.extend(outgoings)
        
        # If only one month, return all transactions
        if num_months == 1:
            stats = self._calculate_statistics(all_outgoings, all_income, all_purchases, num_months)
            
            return all_outgoings, all_income, all_purchases, stats
        
        # Find consistent transactions across months
        print(f"{Colors.GREY}🔍 Identifying consistent transactions across {num_months} months...{Colors.RESET}")
        
        consistent_outgoings = self._find_consistent_transactions(all_outgoings, num_months, 'merchant')
        consistent_income = self._find_consistent_transactions(all_income, num_months, 'source')
        
        # Calculate statistics
        stats = self._calculate_statistics(consistent_outgoings, consistent_income, all_purchases, num_months)
        
        print(f"{Colors.GREY}✅ Found {len(consistent_outgoings)} consistent outgoings and {len(consistent_income)} consistent income sources{Colors.RESET}")
        
        return consistent_outgoings, consistent_income, all_purchases, stats
    
    def _filter_outgoing_duplicates(self, new_outgoings: List[Dict], known_outgoings: List[Dict]) -> List[Dict]:
        """
        Filter out outgoing transactions that already exist based on similarity
        """
        unique_outgoings = []
        seen_outgoings = list(known_outgoings)
        
        for candidate in new_outgoings:
            if not any(self._is_duplicate_outgoing(candidate, existing) for existing in seen_outgoings):
                unique_outgoings.append(candidate)
                seen_outgoings.append(candidate)
        
        return unique_outgoings
    
    def _is_duplicate_outgoing(self, candidate: Dict, existing: Dict, day_tolerance: int = 3, amount_tolerance: float = 0.07, name_similarity: float = 0.85) -> bool:
        """
        Determine if an outgoing transaction is a duplicate of an existing one
        """
        candidate_name = (candidate.get('merchant') or candidate.get('memo') or '').lower().strip()
        existing_name = (existing.get('merchant') or existing.get('memo') or '').lower().strip()
        
        if not candidate_name or not existing_name:
            return False
        
        name_ratio = difflib.SequenceMatcher(None, candidate_name, existing_name).ratio()
        
        if name_ratio < name_similarity:
            return False
        
        candidate_date = candidate.get('transaction_date')
        existing_date = existing.get('transaction_date')
        candidate_dom = candidate.get('day_of_month')
        existing_dom = existing.get('day_of_month')
        days_apart = None
        
        if candidate_date and existing_date:
            days_apart = abs((candidate_date - existing_date).days)
        
        if days_apart is None and candidate_dom is not None and existing_dom is not None:
            days_apart = abs(candidate_dom - existing_dom)
        
        candidate_amount = candidate.get('amount')
        existing_amount = existing.get('amount')
        amounts_close = False
        
        if candidate_amount is not None and existing_amount is not None:
            candidate_abs = abs(candidate_amount)
            existing_abs = abs(existing_amount)
            diff = abs(candidate_abs - existing_abs)
            amounts_close = diff <= max(1, amount_tolerance * max(candidate_abs, existing_abs))
        
        day_is_close = days_apart is not None and days_apart <= day_tolerance
        
        return name_ratio >= name_similarity and (day_is_close or amounts_close)
    
    def _find_consistent_transactions(self, transactions: List[Dict], num_months: int, key_field: str) -> List[Dict]:
        """
        Find transactions that appear consistently across months
        
        Args:
            transactions: List of transactions
            num_months: Number of months to check consistency against
            key_field: Field to use for grouping (merchant or source)
            
        Returns:
            List of consistent transactions with average amounts
        """
        # Group transactions by merchant/source and month
        grouped = defaultdict(lambda: defaultdict(list))
        
        for transaction in transactions:
            key = transaction.get(key_field, '').lower().strip()
            month_key = transaction['transaction_date'].strftime('%Y-%m')
            
            if key:
                grouped[key][month_key].append(transaction)
        
        # Find transactions that appear in majority of months (at least 70% or all if only 2-3 months)
        threshold = num_months if num_months <= 3 else max(2, int(num_months * 0.7))
        
        consistent_transactions = []
        
        for key, months_data in grouped.items():
            num_months_present = len(months_data)
            
            if num_months_present >= threshold:
                # Calculate average amount for this consistent transaction
                all_amounts = []
                sample_transaction = None
                
                for month_transactions in months_data.values():
                    for t in month_transactions:
                        all_amounts.append(t['amount'])
                        
                        if sample_transaction is None:
                            sample_transaction = t.copy()
                
                # Create representative transaction with average amount
                if sample_transaction:
                    avg_amount = sum(all_amounts) / len(all_amounts)
                    
                    sample_transaction['amount'] = avg_amount
                    sample_transaction['occurrence_count'] = len(all_amounts)
                    sample_transaction['months_present'] = num_months_present
                    sample_transaction['is_consistent'] = True
                    
                    consistent_transactions.append(sample_transaction)
        
        return consistent_transactions
    
    def _calculate_statistics(self, outgoings: List[Dict], income: List[Dict], purchases: List[Dict], num_months: int) -> Dict:
        """
        Calculate spending and income statistics
        
        Args:
            outgoings: List of outgoing transactions
            income: List of income transactions
            purchases: List of purchase transactions
            num_months: Number of months of data
            
        Returns:
            Dictionary of statistics
        """
        total_outgoings = sum(t.get('amount', 0) for t in outgoings)
        total_income = sum(t.get('amount', 0) for t in income)
        total_purchases = sum(t.get('amount', 0) for t in purchases)
        total_spent = total_outgoings + total_purchases
        net_position = total_income - total_spent
        
        stats = {
            'num_months': num_months,
            'total_outgoings': total_outgoings,
            'total_income': total_income,
            'total_purchases': total_purchases,
            'total_spent': total_spent,
            'net_position': net_position,
            'avg_monthly_outgoings': total_outgoings / num_months if num_months > 0 else 0,
            'avg_monthly_income': total_income / num_months if num_months > 0 else 0,
            'avg_monthly_purchases': total_purchases / num_months if num_months > 0 else 0,
            'avg_monthly_spent': total_spent / num_months if num_months > 0 else 0,
            'num_outgoing_transactions': len(outgoings),
            'num_income_transactions': len(income),
            'num_purchase_transactions': len(purchases)
        }
        
        return stats
    
    def get_spending_summary(self, outgoings: List[Dict], stats: Optional[Dict] = None) -> str:
        """
        Generate a spending summary using AI (for regular bills/outgoings)
        
        Args:
            outgoings: List of outgoing transactions
            stats: Optional statistics dictionary from multi-month processing
            
        Returns:
            AI-generated summary
        """
        if not outgoings:
            return "No outgoing transactions to analyze."
        
        total = sum(t.get('amount', 0) for t in outgoings)
        
        # Include ALL transactions, not just a sample
        transaction_list = "\n".join([
            f"- £{t.get('amount'):.2f} on day {t.get('day_of_month', 'unknown')} to {t.get('merchant', 'Unknown')}" +
            (f" (appears {t.get('occurrence_count', 1)}x across {t.get('months_present', 1)} months)" if t.get('is_consistent') else "")
            for t in sorted(outgoings, key=lambda x: x.get('amount', 0), reverse=True)
        ])
        
        multi_month_context = ""
        
        if stats and stats.get('num_months', 1) > 1:
            multi_month_context = f"""
        
        Multi-Month Analysis ({stats['num_months']} months):
        - Average Monthly Outgoings: £{stats['avg_monthly_outgoings']:.2f}
        - These are CONSISTENT transactions appearing across multiple months
        """
        
        prompt = f"""
        Analyze these bank outgoings (bills, direct debits, standing orders) and provide a summary:
        
        Total Spending: £{total:.2f}
        Number of Transactions: {len(outgoings)}
        {multi_month_context}
        
        All Transactions:
        {transaction_list}
        
        Please provide:
        1. Key spending patterns
        2. Largest expense categories
        3. Any recommendations for budgeting
        {" 4. Reliability of these consistent outgoings for budgeting" if stats and stats.get('num_months', 1) > 1 else ""}
        
        Keep the response concise and actionable.
        """
        
        print(f"{Colors.GREY}🤔 Thinking: Generating spending summary for {len(outgoings)} transactions (£{total:.2f} total){Colors.RESET}")
        
        try:
            response = self.model.generate_content(prompt)
            
            print(f"{Colors.YELLOW}💡 Response:\n{response.text}{Colors.RESET}\n")
            
            return response.text
            
        except Exception as e:
            return f"Error generating summary: {e}"
    
    def get_purchases_summary(self, purchases: List[Dict], stats: Optional[Dict] = None) -> str:
        """
        Generate a purchases summary using AI (for card purchases and debits)
        
        Args:
            purchases: List of purchase transactions
            stats: Optional statistics dictionary from multi-month processing
            
        Returns:
            AI-generated summary
        """
        if not purchases:
            return "No purchase transactions to analyze."
        
        total = sum(t.get('amount', 0) for t in purchases)
        
        # Include ALL transactions, not just a sample
        transaction_list = "\n".join([
            f"- £{t.get('amount'):.2f} on day {t.get('day_of_month', 'unknown')} at {t.get('merchant', 'Unknown')}"
            for t in sorted(purchases, key=lambda x: x.get('amount', 0), reverse=True)
        ])
        
        multi_month_context = ""
        
        if stats and stats.get('num_months', 1) > 1:
            multi_month_context = f"""
        
        Multi-Month Analysis ({stats['num_months']} months):
        - Average Monthly Purchases: £{stats['avg_monthly_purchases']:.2f}
        - Total Purchase Transactions: {stats['num_purchase_transactions']}
        """
        
        prompt = f"""
        Analyze these purchase transactions (card purchases, debits) and provide a summary:
        
        Total Spending: £{total:.2f}
        Number of Transactions: {len(purchases)}
        {multi_month_context}
        
        All Transactions:
        {transaction_list}
        
        Please provide:
        1. Most frequent shopping categories
        2. Spending patterns
        3. Recommendations for reducing discretionary spending
        {" 4. Month-over-month trends if applicable" if stats and stats.get('num_months', 1) > 1 else ""}
        
        Keep the response concise and actionable.
        """
        
        print(f"{Colors.GREY}🤔 Thinking: Generating purchases summary for {len(purchases)} transactions (£{total:.2f} total){Colors.RESET}")
        
        try:
            response = self.model.generate_content(prompt)
            
            print(f"{Colors.YELLOW}💡 Response:\n{response.text}{Colors.RESET}\n")
            
            return response.text
            
        except Exception as e:
            return f"Error generating summary: {e}"
    
    def get_income_summary(self, income: List[Dict], stats: Optional[Dict] = None) -> str:
        """
        Generate an income summary using AI
        
        Args:
            income: List of income transactions
            stats: Optional statistics dictionary from multi-month processing
            
        Returns:
            AI-generated summary
        """
        if not income:
            return "No income transactions to analyze."
        
        total = sum(t.get('amount', 0) for t in income)
        
        # Include ALL transactions
        transaction_list = "\n".join([
            f"- £{t.get('amount'):.2f} on day {t.get('day_of_month', 'unknown')} from {t.get('source', 'Unknown')}" +
            (f" (appears {t.get('occurrence_count', 1)}x across {t.get('months_present', 1)} months)" if t.get('is_consistent') else "")
            for t in sorted(income, key=lambda x: x.get('amount', 0), reverse=True)
        ])
        
        multi_month_context = ""
        
        if stats and stats.get('num_months', 1) > 1:
            multi_month_context = f"""
        
        Multi-Month Analysis ({stats['num_months']} months):
        - Average Monthly Income: £{stats['avg_monthly_income']:.2f}
        - These are CONSISTENT income sources appearing across multiple months
        """
        
        prompt = f"""
        Analyze these income transactions and provide a summary:
        
        Total Income: £{total:.2f}
        Number of Transactions: {len(income)}
        {multi_month_context}
        
        All Transactions:
        {transaction_list}
        
        Please provide:
        1. Main sources of income
        2. Income patterns
        3. Any observations
        {" 4. Reliability and consistency of income sources" if stats and stats.get('num_months', 1) > 1 else ""}
        
        Keep the response concise.
        """
        
        print(f"{Colors.GREY}🤔 Thinking: Generating income summary for {len(income)} transactions (£{total:.2f} total){Colors.RESET}")
        
        try:
            response = self.model.generate_content(prompt)
            
            print(f"{Colors.YELLOW}💡 Response:\n{response.text}{Colors.RESET}\n")
            
            return response.text
            
        except Exception as e:
            return f"Error generating summary: {e}"
    
    def get_comprehensive_summary(self, outgoings: List[Dict], income: List[Dict], purchases: List[Dict], stats: Dict) -> str:
        """
        Generate a comprehensive financial summary using AI
        
        Args:
            outgoings: List of outgoing transactions
            income: List of income transactions
            purchases: List of purchase transactions
            stats: Statistics dictionary
            
        Returns:
            AI-generated comprehensive summary
        """
        is_multi_month = stats.get('num_months', 1) > 1
        
        prompt = f"""
        Provide a comprehensive financial summary based on {stats['num_months']} month(s) of bank data:
        
        INCOME:
        - Total: £{stats['total_income']:.2f}
        - Average Monthly: £{stats['avg_monthly_income']:.2f}
        - Transactions: {stats['num_income_transactions']} {' (consistent across months)' if is_multi_month else ''}
        
        OUTGOINGS (Bills & Direct Debits):
        - Total: £{stats['total_outgoings']:.2f}
        - Average Monthly: £{stats['avg_monthly_outgoings']:.2f}
        - Transactions: {stats['num_outgoing_transactions']} {' (consistent across months)' if is_multi_month else ''}
        
        PURCHASES (Discretionary Spending):
        - Total: £{stats['total_purchases']:.2f}
        - Average Monthly: £{stats['avg_monthly_purchases']:.2f}
        - Transactions: {stats['num_purchase_transactions']}
        
        OVERALL:
        - Total Spent: £{stats['total_spent']:.2f}
        - Average Monthly Spending: £{stats['avg_monthly_spent']:.2f}
        - Net Position: £{stats['net_position']:.2f}
        
        Please provide:
        1. Overall financial health assessment
        2. Key insights about spending vs income
        3. Budget recommendations
        4. Areas for potential savings
        {' 5. Comments on consistency and predictability of finances' if is_multi_month else ''}
        
        Keep the response actionable and insightful.
        """
        
        print(f"{Colors.GREY}🤔 Thinking: Generating comprehensive financial summary...{Colors.RESET}")
        
        try:
            response = self.model.generate_content(prompt)
            
            print(f"{Colors.YELLOW}💡 Response:\n{response.text}{Colors.RESET}\n")
            
            return response.text
            
        except Exception as e:
            return f"Error generating summary: {e}"

