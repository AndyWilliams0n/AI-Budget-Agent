# Database models for bank statement processing

from sqlalchemy import Column, Integer, String, Float, Date, DateTime, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

Base = declarative_base()


class RawTransaction(Base):
    """
    Model for storing raw transaction data from CSV files before processing
    """
    __tablename__ = 'raw_transactions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_number = Column(String, nullable=True)
    transaction_date = Column(Date, nullable=False)
    account = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    subcategory = Column(String, nullable=True)
    override_subcategory = Column(String, nullable=True)
    memo = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<RawTransaction(id={self.id}, date={self.transaction_date}, amount={self.amount})>"


class Outgoing(Base):
    """
    Model for tracking outgoing payments (Direct Debits and other expenses)
    """
    __tablename__ = 'outgoings'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_number = Column(String, nullable=True)
    day_of_month = Column(Integer, nullable=False)
    account = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    subcategory = Column(String, nullable=True)
    memo = Column(String, nullable=True)
    merchant = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Outgoing(id={self.id}, day={self.day_of_month}, amount={self.amount}, merchant={self.merchant})>"


class Income(Base):
    """
    Model for tracking income transactions
    """
    __tablename__ = 'income'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_number = Column(String, nullable=True)
    day_of_month = Column(Integer, nullable=False)
    account = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    subcategory = Column(String, nullable=True)
    memo = Column(String, nullable=True)
    source = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Income(id={self.id}, day={self.day_of_month}, amount={self.amount}, source={self.source})>"


class Purchase(Base):
    """
    Model for tracking purchase transactions (Card Purchases and Debits)
    """
    __tablename__ = 'purchases'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_number = Column(String, nullable=True)
    day_of_month = Column(Integer, nullable=False)
    account = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    subcategory = Column(String, nullable=True)
    memo = Column(String, nullable=True)
    merchant = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Purchase(id={self.id}, day={self.day_of_month}, amount={self.amount}, merchant={self.merchant})>"


class Balance(Base):
    """
    Model for storing current balance snapshots
    """
    __tablename__ = 'balances'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    recorded_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Balance(id={self.id}, name={self.name}, amount={self.amount}, recorded_at={self.recorded_at})>"


class Overdraft(Base):
    """
    Model for storing overdraft limit values
    """
    __tablename__ = 'overdrafts'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    amount = Column(Float, nullable=False)
    recorded_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Overdraft(id={self.id}, amount={self.amount}, recorded_at={self.recorded_at})>"

