# Database connection and operations

from sqlalchemy import create_engine, and_, extract
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
from typing import List, Optional
from datetime import datetime, date
import os

from .models import Base, RawTransaction, Outgoing, Income, Purchase, Balance, Overdraft


class Database:
    """
    Database manager for handling SQLite operations
    """
    
    def __init__(self, db_path: str = "budget_agent.db"):
        """
        Initialize database connection
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self.engine = create_engine(f'sqlite:///{db_path}', echo=False)
        self.SessionLocal = sessionmaker(
            autocommit=False, 
            autoflush=False, 
            bind=self.engine,
            expire_on_commit=False
        )
        
        # Create tables if they don't exist
        Base.metadata.create_all(bind=self.engine)
    
    @contextmanager
    def get_session(self) -> Session:
        """
        Context manager for database sessions
        """
        session = self.SessionLocal()
        
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def add_outgoing(self, transaction_data: dict) -> Outgoing:
        """
        Add an outgoing transaction to the database
        
        Args:
            transaction_data: Dictionary containing transaction details
            
        Returns:
            Created Outgoing object
        """
        with self.get_session() as session:
            outgoing = Outgoing(**transaction_data)
            session.add(outgoing)
            session.flush()
            session.refresh(outgoing)
            
            return outgoing
    
    def add_income(self, transaction_data: dict) -> Income:
        """
        Add an income transaction to the database
        
        Args:
            transaction_data: Dictionary containing transaction details
            
        Returns:
            Created Income object
        """
        with self.get_session() as session:
            income = Income(**transaction_data)
            session.add(income)
            session.flush()
            session.refresh(income)
            
            return income
    
    def bulk_add_outgoings(self, transactions: List[dict]) -> int:
        """
        Add multiple outgoing transactions in bulk
        
        Args:
            transactions: List of transaction dictionaries
            
        Returns:
            Number of transactions added
        """
        with self.get_session() as session:
            for transaction_data in transactions:
                outgoing = Outgoing(**transaction_data)
                session.add(outgoing)
            
            return len(transactions)
    
    def bulk_add_income(self, transactions: List[dict]) -> int:
        """
        Add multiple income transactions in bulk
        
        Args:
            transactions: List of transaction dictionaries
            
        Returns:
            Number of transactions added
        """
        with self.get_session() as session:
            for transaction_data in transactions:
                income = Income(**transaction_data)
                session.add(income)
            
            return len(transactions)
    
    def add_purchase(self, transaction_data: dict) -> Purchase:
        """
        Add a purchase transaction to the database
        
        Args:
            transaction_data: Dictionary containing transaction details
            
        Returns:
            Created Purchase object
        """
        with self.get_session() as session:
            purchase = Purchase(**transaction_data)
            session.add(purchase)
            session.flush()
            session.refresh(purchase)
            
            return purchase
    
    def bulk_add_purchases(self, transactions: List[dict]) -> int:
        """
        Add multiple purchase transactions in bulk
        
        Args:
            transactions: List of transaction dictionaries
            
        Returns:
            Number of transactions added
        """
        with self.get_session() as session:
            for transaction_data in transactions:
                purchase = Purchase(**transaction_data)
                session.add(purchase)
            
            return len(transactions)
    
    def get_all_outgoings(self, limit: Optional[int] = None) -> List[Outgoing]:
        """
        Retrieve all outgoing transactions
        
        Args:
            limit: Optional limit on number of results
            
        Returns:
            List of Outgoing objects
        """
        with self.get_session() as session:
            query = session.query(Outgoing).order_by(Outgoing.day_of_month.desc())
            
            if limit:
                query = query.limit(limit)
            
            return query.all()
    
    def get_all_income(self, limit: Optional[int] = None) -> List[Income]:
        """
        Retrieve all income transactions
        
        Args:
            limit: Optional limit on number of results
            
        Returns:
            List of Income objects
        """
        with self.get_session() as session:
            query = session.query(Income).order_by(Income.day_of_month.desc())
            
            if limit:
                query = query.limit(limit)
            
            return query.all()
    
    def get_outgoings_by_merchant(self, merchant: str) -> List[Outgoing]:
        """
        Get outgoings filtered by merchant name
        
        Args:
            merchant: Merchant name to filter by
            
        Returns:
            List of matching Outgoing objects
        """
        with self.get_session() as session:
            return session.query(Outgoing).filter(
                Outgoing.merchant.ilike(f'%{merchant}%')
            ).order_by(Outgoing.day_of_month.desc()).all()
    
    def delete_outgoing(self, outgoing_id: int) -> bool:
        """
        Delete an outgoing transaction by ID
        
        Args:
            outgoing_id: ID of the outgoing to delete
            
        Returns:
            True if deleted, False if not found
        """
        with self.get_session() as session:
            outgoing = session.query(Outgoing).filter(Outgoing.id == outgoing_id).first()
            
            if outgoing:
                session.delete(outgoing)

                return True

            return False
    
    def update_outgoing(self, outgoing_id: int, update_data: dict) -> Optional[Outgoing]:
        """
        Update an outgoing transaction
        
        Args:
            outgoing_id: ID of the outgoing to update
            update_data: Dictionary containing fields to update
            
        Returns:
            Updated Outgoing object or None if not found
        """
        with self.get_session() as session:
            outgoing = session.query(Outgoing).filter(Outgoing.id == outgoing_id).first()
            
            if outgoing:
                if 'day_of_month' in update_data:
                    outgoing.day_of_month = update_data['day_of_month']
                
                if 'amount' in update_data:
                    outgoing.amount = update_data['amount']
                
                if 'merchant' in update_data:
                    outgoing.merchant = update_data['merchant']
                
                if 'memo' in update_data:
                    outgoing.memo = update_data['memo']
                
                if 'subcategory' in update_data:
                    outgoing.subcategory = update_data['subcategory']
                
                session.flush()
                session.refresh(outgoing)
                
                return outgoing
            
            return None
    
    def get_income_by_source(self, source: str) -> List[Income]:
        """
        Get income filtered by source
        
        Args:
            source: Source name to filter by
            
        Returns:
            List of matching Income objects
        """
        with self.get_session() as session:
            return session.query(Income).filter(
                Income.source.ilike(f'%{source}%')
            ).order_by(Income.day_of_month.desc()).all()
    
    def get_all_purchases(self, limit: Optional[int] = None) -> List[Purchase]:
        """
        Retrieve all purchase transactions
        
        Args:
            limit: Optional limit on number of results
            
        Returns:
            List of Purchase objects
        """
        with self.get_session() as session:
            query = session.query(Purchase).order_by(Purchase.day_of_month.desc())
            
            if limit:
                query = query.limit(limit)
            
            return query.all()
    
    def get_purchases_by_merchant(self, merchant: str) -> List[Purchase]:
        """
        Get purchases filtered by merchant name
        
        Args:
            merchant: Merchant name to filter by
            
        Returns:
            List of matching Purchase objects
        """
        with self.get_session() as session:
            return session.query(Purchase).filter(
                Purchase.merchant.ilike(f'%{merchant}%')
            ).order_by(Purchase.day_of_month.desc()).all()
    
    def clear_all_data(self):
        """
        Clear all data from outgoings, income, and purchases tables (use with caution)
        """
        with self.get_session() as session:
            session.query(Outgoing).delete()
            session.query(Income).delete()
            session.query(Purchase).delete()
    
    # Raw Transaction methods
    
    def add_raw_transaction(self, transaction_data: dict) -> RawTransaction:
        """
        Add a raw transaction to the database
        
        Args:
            transaction_data: Dictionary containing raw transaction details
            
        Returns:
            Created RawTransaction object
        """
        with self.get_session() as session:
            raw_transaction = RawTransaction(**transaction_data)
            session.add(raw_transaction)
            session.flush()
            session.refresh(raw_transaction)
            
            return raw_transaction
    
    def bulk_add_raw_transactions(self, transactions: List[dict]) -> int:
        """
        Add multiple raw transactions in bulk
        
        Args:
            transactions: List of raw transaction dictionaries
            
        Returns:
            Number of transactions added
        """
        with self.get_session() as session:
            for transaction_data in transactions:
                raw_transaction = RawTransaction(**transaction_data)
                session.add(raw_transaction)
            
            return len(transactions)
    
    def get_all_raw_transactions(self, limit: Optional[int] = None) -> List[RawTransaction]:
        """
        Retrieve all raw transactions
        
        Args:
            limit: Optional limit on number of results
            
        Returns:
            List of RawTransaction objects
        """
        with self.get_session() as session:
            query = session.query(RawTransaction).order_by(RawTransaction.transaction_date.desc())
            
            if limit:
                query = query.limit(limit)
            
            return query.all()
    
    def get_raw_transactions_by_date_range(self, start_date: date, end_date: date) -> List[RawTransaction]:
        """
        Get raw transactions within a date range
        
        Args:
            start_date: Start date for the range
            end_date: End date for the range
            
        Returns:
            List of matching RawTransaction objects
        """
        with self.get_session() as session:
            return session.query(RawTransaction).filter(
                and_(
                    RawTransaction.transaction_date >= start_date,
                    RawTransaction.transaction_date <= end_date
                )
            ).order_by(RawTransaction.transaction_date.desc()).all()
    
    def get_raw_transactions_by_month(self, year: int, month: int) -> List[RawTransaction]:
        """
        Get raw transactions for a specific month
        
        Args:
            year: Year (e.g., 2024)
            month: Month (1-12)
            
        Returns:
            List of matching RawTransaction objects
        """
        with self.get_session() as session:
            return session.query(RawTransaction).filter(
                and_(
                    extract('year', RawTransaction.transaction_date) == year,
                    extract('month', RawTransaction.transaction_date) == month
                )
            ).order_by(RawTransaction.transaction_date.desc()).all()
    
    def get_available_months(self) -> List[dict]:
        """
        Get all distinct year-month combinations from raw transactions
        
        Returns:
            List of dictionaries containing year and month, sorted in descending order
        """
        with self.get_session() as session:
            # Query distinct year and month from raw transactions
            results = session.query(
                extract('year', RawTransaction.transaction_date).label('year'),
                extract('month', RawTransaction.transaction_date).label('month')
            ).distinct().order_by(
                extract('year', RawTransaction.transaction_date).desc(),
                extract('month', RawTransaction.transaction_date).desc()
            ).all()
            
            return [{'year': int(row.year), 'month': int(row.month)} for row in results]
    
    def update_transaction_override_subcategory(self, transaction_id: int, override_subcategory: str) -> Optional[RawTransaction]:
        """
        Update the override subcategory for a raw transaction
        
        Args:
            transaction_id: ID of the transaction to update
            override_subcategory: New subcategory to override the original
            
        Returns:
            Updated RawTransaction object or None if not found
        """
        with self.get_session() as session:
            transaction = session.query(RawTransaction).filter(RawTransaction.id == transaction_id).first()
            
            if transaction:
                transaction.override_subcategory = override_subcategory
                session.flush()
                session.refresh(transaction)
                
                return transaction
            
            return None
    
    # Balance methods
    
    def add_balance(self, name: str, amount: float, recorded_at: Optional[datetime] = None) -> Balance:
        """
        Add a balance record
        
        Args:
            name: Name/description of the balance
            amount: Balance amount in GBP
            recorded_at: Optional datetime when balance was recorded (defaults to now)
            
        Returns:
            Created Balance object
        """
        with self.get_session() as session:
            balance = Balance(
                name=name,
                amount=amount,
                recorded_at=recorded_at or datetime.utcnow()
            )
            session.add(balance)
            session.flush()
            session.refresh(balance)
            
            return balance
    
    def get_all_balances(self, limit: Optional[int] = None) -> List[Balance]:
        """
        Retrieve all balance records
        
        Args:
            limit: Optional limit on number of results
            
        Returns:
            List of Balance objects
        """
        with self.get_session() as session:
            query = session.query(Balance).order_by(
                Balance.recorded_at.desc(),
                Balance.created_at.desc(),
                Balance.id.desc()
            )
            
            if limit:
                query = query.limit(limit)
            
            return query.all()
    
    def get_latest_balance(self) -> Optional[Balance]:
        """
        Get the most recent balance record
        
        Returns:
            Latest Balance object or None
        """
        with self.get_session() as session:
            return session.query(Balance).order_by(
                Balance.recorded_at.desc(),
                Balance.created_at.desc(),
                Balance.id.desc()
            ).first()
    
    # Overdraft methods
    
    def add_overdraft(self, amount: float, recorded_at: Optional[datetime] = None) -> Overdraft:
        """
        Add an overdraft limit record
        
        Args:
            amount: Overdraft limit amount in GBP
            recorded_at: Optional datetime when overdraft was set (defaults to now)
            
        Returns:
            Created Overdraft object
        """
        with self.get_session() as session:
            overdraft = Overdraft(
                amount=amount,
                recorded_at=recorded_at or datetime.utcnow()
            )
            session.add(overdraft)
            session.flush()
            session.refresh(overdraft)
            
            return overdraft
    
    def get_all_overdrafts(self, limit: Optional[int] = None) -> List[Overdraft]:
        """
        Retrieve all overdraft records
        
        Args:
            limit: Optional limit on number of results
            
        Returns:
            List of Overdraft objects
        """
        with self.get_session() as session:
            query = session.query(Overdraft).order_by(
                Overdraft.recorded_at.desc(),
                Overdraft.created_at.desc(),
                Overdraft.id.desc()
            )
            
            if limit:
                query = query.limit(limit)
            
            return query.all()
    
    def get_latest_overdraft(self) -> Optional[Overdraft]:
        """
        Get the most recent overdraft record
        
        Returns:
            Latest Overdraft object or None
        """
        with self.get_session() as session:
            return session.query(Overdraft).order_by(
                Overdraft.recorded_at.desc(),
                Overdraft.created_at.desc(),
                Overdraft.id.desc()
            ).first()

