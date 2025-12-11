# FastAPI application for bank statement processing

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import datetime
import os
from pydantic import BaseModel

from ..db import Database, RawTransaction, Outgoing, Income, Purchase, Balance, Overdraft
from ..agent_logic import BankStatementAgent


# Initialize FastAPI app
app = FastAPI(
    title="Budget Agent API",
    description="API for processing bank statements and managing financial data",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
db = Database(db_path=os.getenv('DB_PATH', 'budget_agent.db'))

# Initialize agent (will be lazy-loaded)
agent = None


def get_agent() -> BankStatementAgent:
    """
    Get or initialize the bank statement agent
    """
    global agent
    
    if agent is None:
        try:
            agent = BankStatementAgent()
        except ValueError as e:
            raise HTTPException(
                status_code=500,
                detail="Google API key not configured. Set GOOGLE_API_KEY environment variable."
            )
    
    return agent


# Response models
class ProcessingResult(BaseModel):
    """Response model for file processing result"""
    success: bool
    message: str
    outgoings_added: int
    income_added: int
    purchases_added: int
    is_multi_month: bool = False
    num_months: Optional[int] = None
    consistent_outgoings: Optional[int] = None
    consistent_income: Optional[int] = None


class SummaryResponse(BaseModel):
    """Response model for AI-generated summaries"""
    summary: str
    total_amount: float
    transaction_count: int
    statistics: Optional[dict] = None


class BalanceRequest(BaseModel):
    """Request model for adding a balance"""
    name: str
    amount: float
    recorded_at: Optional[str] = None


class OverdraftRequest(BaseModel):
    """Request model for adding an overdraft"""
    amount: float
    recorded_at: Optional[str] = None


class TransactionTypeUpdateRequest(BaseModel):
    """Request model for updating transaction type override"""
    override_subcategory: str


class ScheduledOutgoingRequest(BaseModel):
    """Request model for adding a scheduled outgoing"""
    day_of_month: int
    amount: float
    merchant: str
    memo: Optional[str] = None
    subcategory: Optional[str] = "Direct Debit"
    account: str = "Scheduled Outgoing"


class ScheduledOutgoingUpdateRequest(BaseModel):
    """Request model for updating a scheduled outgoing"""
    day_of_month: Optional[int] = None
    amount: Optional[float] = None
    merchant: Optional[str] = None
    memo: Optional[str] = None
    subcategory: Optional[str] = None


@app.get("/")
async def root():
    """
    Root endpoint - health check
    """
    return {
        "status": "ok",
        "message": "Budget Agent API is running",
        "version": "1.0.0"
    }


@app.post("/upload-statement", response_model=ProcessingResult)
async def upload_statement(
    file: UploadFile = File(...),
    use_ai_analysis: bool = False
):
    """
    Upload and process a bank statement CSV file
    
    Intelligently categorizes transactions based on subcategory:
    - Direct Debit, Bill Payment, Standing Order -> Outgoings
    - Card Purchase, Debit -> Purchases
    - Counter Credit (especially large amounts £1000+) -> Income
    
    Args:
        file: CSV file to process
        use_ai_analysis: Whether to use AI analysis (slower but more detailed)
        
    Returns:
        Processing result with counts of transactions added
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported"
        )
    
    try:
        # Read file content
        content = await file.read()
        file_content = content.decode('utf-8')
        
        # Get agent and process file
        bank_agent = get_agent()
        
        # First, parse all raw transactions
        raw_transactions = bank_agent.csv_processor.parse_csv_file(file_content)
        
        # Save raw transactions to database
        raw_data = []
        
        for raw_transaction in raw_transactions:
            data = {
                'transaction_number': raw_transaction.get('transaction_number'),
                'transaction_date': raw_transaction.get('transaction_date'),
                'account': raw_transaction.get('account'),
                'amount': raw_transaction.get('amount'),
                'subcategory': raw_transaction.get('subcategory'),
                'memo': raw_transaction.get('memo')
            }
            raw_data.append(data)
        
        db.bulk_add_raw_transactions(raw_data)
        
        # Now process and categorize transactions
        outgoings, income, purchases = bank_agent.csv_processor.categorize_transactions(raw_transactions)
        
        # Prepare data for database (with day_of_month instead of transaction_date)
        outgoings_data = []
        
        for outgoing in outgoings:
            data = {
                'transaction_number': outgoing.get('transaction_number'),
                'day_of_month': outgoing.get('day_of_month'),
                'account': outgoing.get('account'),
                'amount': outgoing.get('amount'),
                'subcategory': outgoing.get('subcategory'),
                'memo': outgoing.get('memo'),
                'merchant': outgoing.get('merchant')
            }
            outgoings_data.append(data)
        
        income_data = []
        
        for inc in income:
            data = {
                'transaction_number': inc.get('transaction_number'),
                'day_of_month': inc.get('day_of_month'),
                'account': inc.get('account'),
                'amount': inc.get('amount'),
                'subcategory': inc.get('subcategory'),
                'memo': inc.get('memo'),
                'source': inc.get('source')
            }
            income_data.append(data)
        
        purchases_data = []
        
        for purchase in purchases:
            data = {
                'transaction_number': purchase.get('transaction_number'),
                'day_of_month': purchase.get('day_of_month'),
                'account': purchase.get('account'),
                'amount': purchase.get('amount'),
                'subcategory': purchase.get('subcategory'),
                'memo': purchase.get('memo'),
                'merchant': purchase.get('merchant')
            }
            purchases_data.append(data)
        
        # Add to database
        outgoings_count = db.bulk_add_outgoings(outgoings_data)
        income_count = db.bulk_add_income(income_data)
        purchases_count = db.bulk_add_purchases(purchases_data)
        
        return ProcessingResult(
            success=True,
            message=f"Successfully processed {file.filename}",
            outgoings_added=outgoings_count,
            income_added=income_count,
            purchases_added=purchases_count
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )


@app.post("/upload-multi-month", response_model=ProcessingResult)
async def upload_multi_month(
    files: List[UploadFile] = File(...),
    use_ai_analysis: bool = False
):
    """
    Upload and process multiple months of bank statement CSV files
    
    Identifies consistent transactions across months for more accurate budgeting.
    
    Args:
        files: List of CSV files to process (one per month)
        use_ai_analysis: Whether to use AI analysis (slower but more detailed)
        
    Returns:
        Processing result with counts of consistent transactions
    """
    # Validate file types
    for file in files:
        if not file.filename.endswith('.csv'):
            raise HTTPException(
                status_code=400,
                detail=f"Only CSV files are supported. Invalid file: {file.filename}"
            )
    
    try:
        # Read all file contents
        file_contents = []
        
        for file in files:
            content = await file.read()
            file_content = content.decode('utf-8')
            file_contents.append(file_content)
        
        # Get agent
        bank_agent = get_agent()
        
        # First, parse and save all raw transactions from all files
        all_raw_transactions = []
        
        for file_content in file_contents:
            raw_transactions = bank_agent.csv_processor.parse_csv_file(file_content)
            all_raw_transactions.extend(raw_transactions)
        
        # Save raw transactions to database
        raw_data = []
        
        for raw_transaction in all_raw_transactions:
            data = {
                'transaction_number': raw_transaction.get('transaction_number'),
                'transaction_date': raw_transaction.get('transaction_date'),
                'account': raw_transaction.get('account'),
                'amount': raw_transaction.get('amount'),
                'subcategory': raw_transaction.get('subcategory'),
                'memo': raw_transaction.get('memo')
            }
            raw_data.append(data)
        
        db.bulk_add_raw_transactions(raw_data)
        
        # Now process multiple months to find consistent transactions
        consistent_outgoings, consistent_income, all_purchases, stats = bank_agent.process_multiple_csv_files(
            file_contents, 
            use_ai_analysis
        )
        
        # Prepare data for database (with day_of_month)
        outgoings_data = []
        
        for outgoing in consistent_outgoings:
            # Extract day from transaction_date if available
            day_of_month = outgoing.get('transaction_date').day if outgoing.get('transaction_date') else 1
            
            data = {
                'transaction_number': outgoing.get('transaction_number'),
                'day_of_month': day_of_month,
                'account': outgoing.get('account'),
                'amount': outgoing.get('amount'),
                'subcategory': outgoing.get('subcategory'),
                'memo': outgoing.get('memo'),
                'merchant': outgoing.get('merchant')
            }
            outgoings_data.append(data)
        
        income_data = []
        
        for inc in consistent_income:
            # Extract day from transaction_date if available
            day_of_month = inc.get('transaction_date').day if inc.get('transaction_date') else 1
            
            data = {
                'transaction_number': inc.get('transaction_number'),
                'day_of_month': day_of_month,
                'account': inc.get('account'),
                'amount': inc.get('amount'),
                'subcategory': inc.get('subcategory'),
                'memo': inc.get('memo'),
                'source': inc.get('source')
            }
            income_data.append(data)
        
        purchases_data = []
        
        for purchase in all_purchases:
            # Extract day from transaction_date if available
            day_of_month = purchase.get('transaction_date').day if purchase.get('transaction_date') else 1
            
            data = {
                'transaction_number': purchase.get('transaction_number'),
                'day_of_month': day_of_month,
                'account': purchase.get('account'),
                'amount': purchase.get('amount'),
                'subcategory': purchase.get('subcategory'),
                'memo': purchase.get('memo'),
                'merchant': purchase.get('merchant')
            }
            purchases_data.append(data)
        
        # Add to database
        outgoings_count = db.bulk_add_outgoings(outgoings_data)
        income_count = db.bulk_add_income(income_data)
        purchases_count = db.bulk_add_purchases(purchases_data)
        
        return ProcessingResult(
            success=True,
            message=f"Successfully processed {len(files)} month(s) of data",
            outgoings_added=outgoings_count,
            income_added=income_count,
            purchases_added=purchases_count,
            is_multi_month=True,
            num_months=stats['num_months'],
            consistent_outgoings=len(consistent_outgoings),
            consistent_income=len(consistent_income)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing files: {str(e)}"
        )


@app.get("/outgoings", response_model=List[dict])
async def get_outgoings(limit: Optional[int] = None, merchant: Optional[str] = None):
    """
    Get all outgoing transactions
    
    Args:
        limit: Optional limit on number of results
        merchant: Optional filter by merchant name
        
    Returns:
        List of outgoing transactions
    """
    try:
        if merchant:
            outgoings = db.get_outgoings_by_merchant(merchant)
        else:
            outgoings = db.get_all_outgoings(limit)
        
        return [
            {
                'id': o.id,
                'day_of_month': o.day_of_month,
                'amount': o.amount,
                'merchant': o.merchant,
                'memo': o.memo,
                'subcategory': o.subcategory,
                'account': o.account
            }
            for o in outgoings
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving outgoings: {str(e)}"
        )


@app.post("/outgoings")
async def add_scheduled_outgoing(request: ScheduledOutgoingRequest):
    """
    Add a scheduled outgoing transaction
    
    Args:
        request: ScheduledOutgoingRequest with day_of_month, amount, merchant, memo
        
    Returns:
        Created outgoing record
    """
    try:
        if request.day_of_month < 1 or request.day_of_month > 31:
            raise HTTPException(
                status_code=400,
                detail="day_of_month must be between 1 and 31"
            )
        
        outgoing = db.add_outgoing({
            'day_of_month': request.day_of_month,
            'amount': request.amount,
            'merchant': request.merchant,
            'memo': request.memo,
            'subcategory': request.subcategory,
            'account': request.account or "Scheduled Outgoing",
        })
        
        return {
            'id': outgoing.id,
            'day_of_month': outgoing.day_of_month,
            'amount': outgoing.amount,
            'merchant': outgoing.merchant,
            'memo': outgoing.memo,
            'subcategory': outgoing.subcategory,
            'account': outgoing.account
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error adding scheduled outgoing: {str(e)}"
        )


@app.patch("/outgoings/{outgoing_id}")
async def update_scheduled_outgoing(outgoing_id: int, request: ScheduledOutgoingUpdateRequest):
    """
    Update a scheduled outgoing transaction
    
    Args:
        outgoing_id: ID of the outgoing to update
        request: ScheduledOutgoingUpdateRequest with optional fields to update
        
    Returns:
        Updated outgoing record
    """
    try:
        update_data = {}
        
        if request.day_of_month is not None:
            if request.day_of_month < 1 or request.day_of_month > 31:
                raise HTTPException(
                    status_code=400,
                    detail="day_of_month must be between 1 and 31"
                )
            
            update_data['day_of_month'] = request.day_of_month
        
        if request.amount is not None:
            update_data['amount'] = request.amount
        
        if request.merchant is not None:
            update_data['merchant'] = request.merchant
        
        if request.memo is not None:
            update_data['memo'] = request.memo
        
        if request.subcategory is not None:
            update_data['subcategory'] = request.subcategory
        
        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No fields to update provided"
            )
        
        outgoing = db.update_outgoing(outgoing_id, update_data)
        
        if not outgoing:
            raise HTTPException(
                status_code=404,
                detail=f"Outgoing with ID {outgoing_id} not found"
            )
        
        return {
            'id': outgoing.id,
            'day_of_month': outgoing.day_of_month,
            'amount': outgoing.amount,
            'merchant': outgoing.merchant,
            'memo': outgoing.memo,
            'subcategory': outgoing.subcategory,
            'account': outgoing.account
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating scheduled outgoing: {str(e)}"
        )


@app.delete("/outgoings/{outgoing_id}")
async def delete_scheduled_outgoing(outgoing_id: int):
    """
    Delete a scheduled outgoing transaction
    
    Args:
        outgoing_id: ID of the outgoing to delete
        
    Returns:
        Success message
    """
    try:
        success = db.delete_outgoing(outgoing_id)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Outgoing with ID {outgoing_id} not found"
            )
        
        return {"success": True, "message": f"Deleted outgoing {outgoing_id}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting scheduled outgoing: {str(e)}"
        )


@app.post("/outgoings/remove-duplicates")
async def remove_duplicate_outgoings():
    """
    Identify and remove duplicate outgoings
    
    Logic:
    1. If name AND amount match exactly - remove duplicates, keep one
    2. If names match but amounts differ - remove cheaper ones, keep the most expensive
    
    Returns:
        List of removed duplicates and summary
    """
    try:
        outgoings = db.get_all_outgoings()
        
        if not outgoings:
            return {"removed": [], "count": 0, "message": "No outgoings to analyze"}
        
        # Group outgoings by normalized merchant name
        grouped_by_name = {}
        
        for outgoing in outgoings:
            name_key = (outgoing.merchant or outgoing.memo or '').lower().strip()
            
            if name_key not in grouped_by_name:
                grouped_by_name[name_key] = []
            
            grouped_by_name[name_key].append(outgoing)
        
        duplicates_to_remove = []
        
        for name_key, group in grouped_by_name.items():
            if len(group) <= 1:
                continue
            
            # Find the one with the highest amount to keep
            max_amount = max(o.amount for o in group)
            kept_one = False
            
            for outgoing in group:
                if outgoing.amount == max_amount and not kept_one:
                    # Keep this one (the first with max amount)
                    kept_one = True
                else:
                    # Remove this one (duplicate or cheaper)
                    duplicates_to_remove.append({
                        'id': outgoing.id,
                        'merchant': outgoing.merchant,
                        'amount': outgoing.amount,
                        'day_of_month': outgoing.day_of_month,
                        'reason': 'exact duplicate' if outgoing.amount == max_amount else 'cheaper duplicate'
                    })
        
        # Remove duplicates
        for dup in duplicates_to_remove:
            db.delete_outgoing(dup['id'])
        
        return {
            "removed": duplicates_to_remove,
            "count": len(duplicates_to_remove),
            "message": f"Removed {len(duplicates_to_remove)} duplicate/cheaper outgoing(s)"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error removing duplicates: {str(e)}"
        )


@app.get("/income", response_model=List[dict])
async def get_income(limit: Optional[int] = None, source: Optional[str] = None):
    """
    Get all income transactions
    
    Args:
        limit: Optional limit on number of results
        source: Optional filter by source name
        
    Returns:
        List of income transactions
    """
    try:
        if source:
            income = db.get_income_by_source(source)
        else:
            income = db.get_all_income(limit)
        
        return [
            {
                'id': i.id,
                'day_of_month': i.day_of_month,
                'amount': i.amount,
                'source': i.source,
                'memo': i.memo,
                'subcategory': i.subcategory,
                'account': i.account
            }
            for i in income
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving income: {str(e)}"
        )


@app.get("/purchases", response_model=List[dict])
async def get_purchases(limit: Optional[int] = None, merchant: Optional[str] = None):
    """
    Get all purchase transactions (Card Purchases and Debits)
    
    Args:
        limit: Optional limit on number of results
        merchant: Optional filter by merchant name
        
    Returns:
        List of purchase transactions
    """
    try:
        if merchant:
            purchases = db.get_purchases_by_merchant(merchant)
        else:
            purchases = db.get_all_purchases(limit)
        
        return [
            {
                'id': p.id,
                'day_of_month': p.day_of_month,
                'amount': p.amount,
                'merchant': p.merchant,
                'memo': p.memo,
                'subcategory': p.subcategory,
                'account': p.account
            }
            for p in purchases
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving purchases: {str(e)}"
        )


@app.get("/summary/spending", response_model=SummaryResponse)
async def get_spending_summary():
    """
    Get AI-generated spending summary using ALL transactions (not just sample)
    
    Returns:
        Summary of spending patterns
    """
    try:
        # Get outgoings from database
        outgoings = db.get_all_outgoings()
        
        if not outgoings:
            return SummaryResponse(
                summary="No spending data available.",
                total_amount=0.0,
                transaction_count=0
            )
        
        # Convert to dict format for agent
        outgoings_data = [
            {
                'day_of_month': o.day_of_month,
                'amount': o.amount,
                'merchant': o.merchant,
                'memo': o.memo
            }
            for o in outgoings
        ]
        
        # Generate AI summary (will use ALL data, not just 20 samples)
        bank_agent = get_agent()
        summary = bank_agent.get_spending_summary(outgoings_data)
        
        total = sum(o.amount for o in outgoings)
        
        return SummaryResponse(
            summary=summary,
            total_amount=total,
            transaction_count=len(outgoings)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating spending summary: {str(e)}"
        )


@app.get("/summary/income", response_model=SummaryResponse)
async def get_income_summary():
    """
    Get AI-generated income summary using ALL transactions (not just sample)
    
    Returns:
        Summary of income patterns
    """
    try:
        # Get income from database
        income = db.get_all_income()
        
        if not income:
            return SummaryResponse(
                summary="No income data available.",
                total_amount=0.0,
                transaction_count=0
            )
        
        # Convert to dict format for agent
        income_data = [
            {
                'day_of_month': i.day_of_month,
                'amount': i.amount,
                'source': i.source,
                'memo': i.memo
            }
            for i in income
        ]
        
        # Generate AI summary (will use ALL data, not just samples)
        bank_agent = get_agent()
        summary = bank_agent.get_income_summary(income_data)
        
        total = sum(i.amount for i in income)
        
        return SummaryResponse(
            summary=summary,
            total_amount=total,
            transaction_count=len(income)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating income summary: {str(e)}"
        )


@app.get("/summary/purchases", response_model=SummaryResponse)
async def get_purchases_summary():
    """
    Get AI-generated purchases summary using ALL transactions (not just sample)
    
    Returns:
        Summary of purchase patterns
    """
    try:
        # Get purchases from database
        purchases = db.get_all_purchases()
        
        if not purchases:
            return SummaryResponse(
                summary="No purchase data available.",
                total_amount=0.0,
                transaction_count=0
            )
        
        # Convert to dict format for agent
        purchases_data = [
            {
                'day_of_month': p.day_of_month,
                'amount': p.amount,
                'merchant': p.merchant,
                'memo': p.memo
            }
            for p in purchases
        ]
        
        # Generate AI summary (will use ALL data, not just 20 samples)
        bank_agent = get_agent()
        summary = bank_agent.get_purchases_summary(purchases_data)
        
        total = sum(p.amount for p in purchases)
        
        return SummaryResponse(
            summary=summary,
            total_amount=total,
            transaction_count=len(purchases)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating purchases summary: {str(e)}"
        )


@app.get("/stats")
async def get_stats():
    """
    Get overall statistics
    
    Returns:
        Statistics about stored transactions
    """
    try:
        outgoings = db.get_all_outgoings()
        income = db.get_all_income()
        purchases = db.get_all_purchases()
        
        total_outgoings = sum(o.amount for o in outgoings)
        total_income = sum(i.amount for i in income)
        total_purchases = sum(p.amount for p in purchases)
        total_expenses = total_outgoings + total_purchases
        
        return {
            'total_outgoings': total_outgoings,
            'total_purchases': total_purchases,
            'total_expenses': total_expenses,
            'total_income': total_income,
            'net': total_income - total_expenses,
            'outgoing_count': len(outgoings),
            'purchase_count': len(purchases),
            'income_count': len(income)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving stats: {str(e)}"
        )


@app.get("/summary/comprehensive", response_model=SummaryResponse)
async def get_comprehensive_summary():
    """
    Get comprehensive AI-generated financial summary
    
    Returns:
        Comprehensive summary including income, outgoings, purchases, and insights
    """
    try:
        # Get all data from database
        outgoings = db.get_all_outgoings()
        income = db.get_all_income()
        purchases = db.get_all_purchases()
        
        if not outgoings and not income and not purchases:
            return SummaryResponse(
                summary="No financial data available.",
                total_amount=0.0,
                transaction_count=0
            )
        
        # Convert to dict format for agent
        outgoings_data = [
            {
                'day_of_month': o.day_of_month,
                'amount': o.amount,
                'merchant': o.merchant,
                'memo': o.memo
            }
            for o in outgoings
        ]
        
        income_data = [
            {
                'day_of_month': i.day_of_month,
                'amount': i.amount,
                'source': i.source,
                'memo': i.memo
            }
            for i in income
        ]
        
        purchases_data = [
            {
                'day_of_month': p.day_of_month,
                'amount': p.amount,
                'merchant': p.merchant,
                'memo': p.memo
            }
            for p in purchases
        ]
        
        # Calculate basic statistics
        total_outgoings = sum(o.amount for o in outgoings)
        total_income_amount = sum(i.amount for i in income)
        total_purchases = sum(p.amount for p in purchases)
        total_expenses = total_outgoings + total_purchases
        
        stats = {
            'num_months': 1,
            'total_outgoings': total_outgoings,
            'total_income': total_income_amount,
            'total_purchases': total_purchases,
            'total_spent': total_expenses,
            'net_position': total_income_amount - total_expenses,
            'avg_monthly_outgoings': total_outgoings,
            'avg_monthly_income': total_income_amount,
            'avg_monthly_purchases': total_purchases,
            'avg_monthly_spent': total_expenses,
            'num_outgoing_transactions': len(outgoings),
            'num_income_transactions': len(income),
            'num_purchase_transactions': len(purchases)
        }
        
        # Generate AI summary
        bank_agent = get_agent()
        summary = bank_agent.get_comprehensive_summary(outgoings_data, income_data, purchases_data, stats)
        
        return SummaryResponse(
            summary=summary,
            total_amount=total_expenses,
            transaction_count=len(outgoings) + len(income) + len(purchases),
            statistics=stats
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating comprehensive summary: {str(e)}"
        )


@app.get("/raw-transactions", response_model=List[dict])
async def get_raw_transactions(limit: Optional[int] = None):
    """
    Get all raw transactions
    
    Args:
        limit: Optional limit on number of results
        
    Returns:
        List of raw transactions
    """
    try:
        raw_transactions = db.get_all_raw_transactions(limit)
        
        return [
            {
                'id': r.id,
                'transaction_number': r.transaction_number,
                'transaction_date': r.transaction_date.isoformat(),
                'account': r.account,
                'amount': r.amount,
                'subcategory': r.subcategory,
                'override_subcategory': r.override_subcategory,
                'memo': r.memo,
                'created_at': r.created_at.isoformat()
            }
            for r in raw_transactions
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving raw transactions: {str(e)}"
        )


@app.get("/raw-transactions/date-range", response_model=List[dict])
async def get_raw_transactions_by_date_range(start_date: str, end_date: str):
    """
    Get raw transactions within a date range
    
    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        
    Returns:
        List of raw transactions within the date range
    """
    try:
        # Parse dates
        from datetime import datetime
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        raw_transactions = db.get_raw_transactions_by_date_range(start, end)
        
        return [
            {
                'id': r.id,
                'transaction_number': r.transaction_number,
                'transaction_date': r.transaction_date.isoformat(),
                'account': r.account,
                'amount': r.amount,
                'subcategory': r.subcategory,
                'override_subcategory': r.override_subcategory,
                'memo': r.memo,
                'created_at': r.created_at.isoformat()
            }
            for r in raw_transactions
        ]
        
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD format."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving raw transactions: {str(e)}"
        )


@app.get("/raw-transactions/month/{year}/{month}", response_model=List[dict])
async def get_raw_transactions_by_month(year: int, month: int):
    """
    Get raw transactions for a specific month
    
    Args:
        year: Year (e.g., 2024)
        month: Month (1-12)
        
    Returns:
        List of raw transactions for the specified month
    """
    try:
        if month < 1 or month > 12:
            raise HTTPException(
                status_code=400,
                detail="Month must be between 1 and 12"
            )
        
        raw_transactions = db.get_raw_transactions_by_month(year, month)
        
        return [
            {
                'id': r.id,
                'transaction_number': r.transaction_number,
                'transaction_date': r.transaction_date.isoformat(),
                'account': r.account,
                'amount': r.amount,
                'subcategory': r.subcategory,
                'override_subcategory': r.override_subcategory,
                'memo': r.memo,
                'created_at': r.created_at.isoformat()
            }
            for r in raw_transactions
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving raw transactions: {str(e)}"
        )


@app.get("/raw-transactions/available-months", response_model=List[dict])
async def get_available_months():
    """
    Get all available months that have raw transaction data
    
    Returns:
        List of year-month combinations sorted in descending order
    """
    try:
        months = db.get_available_months()
        
        return months
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving available months: {str(e)}"
        )


@app.post("/balance")
async def add_balance(balance_request: BalanceRequest):
    """
    Add a balance record
    
    Args:
        balance_request: Balance data including name, amount, and optional recorded_at
        
    Returns:
        Created balance record
    """
    try:
        recorded_at = None
        
        if balance_request.recorded_at:
            recorded_at = datetime.fromisoformat(balance_request.recorded_at.replace('Z', '+00:00'))
        
        balance = db.add_balance(
            name=balance_request.name,
            amount=balance_request.amount,
            recorded_at=recorded_at
        )
        
        return {
            'id': balance.id,
            'name': balance.name,
            'amount': balance.amount,
            'recorded_at': balance.recorded_at.isoformat(),
            'created_at': balance.created_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error adding balance: {str(e)}"
        )


@app.get("/balance", response_model=List[dict])
async def get_balances(limit: Optional[int] = None):
    """
    Get all balance records
    
    Args:
        limit: Optional limit on number of results
        
    Returns:
        List of balance records
    """
    try:
        balances = db.get_all_balances(limit)
        
        return [
            {
                'id': b.id,
                'name': b.name,
                'amount': b.amount,
                'recorded_at': b.recorded_at.isoformat(),
                'created_at': b.created_at.isoformat()
            }
            for b in balances
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving balances: {str(e)}"
        )


@app.get("/balance/latest")
async def get_latest_balance():
    """
    Get the most recent balance record
    
    Returns:
        Latest balance record or null if none exists
    """
    try:
        balance = db.get_latest_balance()
        
        if not balance:
            return None
        
        return {
            'id': balance.id,
            'name': balance.name,
            'amount': balance.amount,
            'recorded_at': balance.recorded_at.isoformat(),
            'created_at': balance.created_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving latest balance: {str(e)}"
        )


@app.post("/overdraft")
async def add_overdraft(overdraft_request: OverdraftRequest):
    """
    Add an overdraft limit record
    
    Args:
        overdraft_request: Overdraft data including amount and optional recorded_at
        
    Returns:
        Created overdraft record
    """
    try:
        recorded_at = None
        
        if overdraft_request.recorded_at:
            recorded_at = datetime.fromisoformat(overdraft_request.recorded_at.replace('Z', '+00:00'))
        
        overdraft = db.add_overdraft(
            amount=overdraft_request.amount,
            recorded_at=recorded_at
        )
        
        return {
            'id': overdraft.id,
            'amount': overdraft.amount,
            'recorded_at': overdraft.recorded_at.isoformat(),
            'created_at': overdraft.created_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error adding overdraft: {str(e)}"
        )


@app.get("/overdraft", response_model=List[dict])
async def get_overdrafts(limit: Optional[int] = None):
    """
    Get all overdraft records
    
    Args:
        limit: Optional limit on number of results
        
    Returns:
        List of overdraft records
    """
    try:
        overdrafts = db.get_all_overdrafts(limit)
        
        return [
            {
                'id': o.id,
                'amount': o.amount,
                'recorded_at': o.recorded_at.isoformat(),
                'created_at': o.created_at.isoformat()
            }
            for o in overdrafts
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving overdrafts: {str(e)}"
        )


@app.get("/overdraft/latest")
async def get_latest_overdraft():
    """
    Get the most recent overdraft record
    
    Returns:
        Latest overdraft record or null if none exists
    """
    try:
        overdraft = db.get_latest_overdraft()
        
        if not overdraft:
            return None
        
        return {
            'id': overdraft.id,
            'amount': overdraft.amount,
            'recorded_at': overdraft.recorded_at.isoformat(),
            'created_at': overdraft.created_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving latest overdraft: {str(e)}"
        )


@app.patch("/raw-transactions/{transaction_id}/override-type")
async def update_transaction_type(transaction_id: int, request: TransactionTypeUpdateRequest):
    """
    Update the type override for a raw transaction
    
    Args:
        transaction_id: ID of the transaction to update
        request: Request containing the new override_subcategory
        
    Returns:
        Updated transaction record
    """
    try:
        updated_transaction = db.update_transaction_override_subcategory(
            transaction_id, 
            request.override_subcategory
        )
        
        if not updated_transaction:
            raise HTTPException(
                status_code=404,
                detail=f"Transaction with ID {transaction_id} not found"
            )
        
        return {
            'id': updated_transaction.id,
            'transaction_number': updated_transaction.transaction_number,
            'transaction_date': updated_transaction.transaction_date.isoformat(),
            'account': updated_transaction.account,
            'amount': updated_transaction.amount,
            'subcategory': updated_transaction.subcategory,
            'override_subcategory': updated_transaction.override_subcategory,
            'memo': updated_transaction.memo,
            'created_at': updated_transaction.created_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating transaction type: {str(e)}"
        )


@app.delete("/clear-data")
async def clear_data():
    """
    Clear all data from the database
    
    WARNING: This will delete all transactions
    """
    try:
        db.clear_all_data()
        
        return {
            "success": True,
            "message": "All data cleared successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing data: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

