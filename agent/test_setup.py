#!/usr/bin/env python3
"""
Test script to verify the Budget Agent setup

This script checks that all components are properly installed and configured.
"""

import sys
import os


def check_imports():
    """
    Check if all required packages can be imported
    """
    print("Checking package imports...")
    
    REQUIRED_PACKAGES = [
        ('fastapi', 'FastAPI'),
        ('uvicorn', 'Uvicorn'),
        ('sqlalchemy', 'SQLAlchemy'),
        ('google.generativeai', 'Google Generative AI'),
        ('pydantic', 'Pydantic'),
    ]
    
    all_ok = True
    
    for package, name in REQUIRED_PACKAGES:
        try:
            __import__(package)
            print(f"  ✓ {name}")
        except ImportError:
            print(f"  ✗ {name} - Not installed")
            all_ok = False
    
    return all_ok


def check_environment():
    """
    Check if environment variables are set
    """
    print("\nChecking environment variables...")
    
    API_KEY = os.getenv('GOOGLE_API_KEY')
    
    if API_KEY:
        print(f"  ✓ GOOGLE_API_KEY is set (length: {len(API_KEY)})")
        return True
    else:
        print("  ✗ GOOGLE_API_KEY is not set")
        print("    Please set it in your .env file or environment")
        return False


def check_modules():
    """
    Check if local modules can be imported
    """
    print("\nChecking local modules...")
    
    MODULES = [
        ('db', 'Database module'),
        ('agent_logic', 'Agent logic module'),
    ]
    
    all_ok = True
    
    for module, name in MODULES:
        try:
            __import__(module)
            print(f"  ✓ {name}")
        except ImportError as e:
            print(f"  ✗ {name} - {e}")
            all_ok = False
    
    # API module check (special case due to relative imports)
    try:
        import os
        api_main_path = os.path.join(os.path.dirname(__file__), 'api', 'main.py')
        if os.path.exists(api_main_path):
            print(f"  ✓ API module (file exists)")
        else:
            print(f"  ✗ API module - File not found")
            all_ok = False
    except Exception as e:
        print(f"  ✗ API module - {e}")
        all_ok = False
    
    return all_ok


def check_database():
    """
    Check if database can be initialized
    """
    print("\nChecking database initialization...")
    
    try:
        from db import Database
        
        TEST_DB = 'test_budget_agent.db'
        
        db = Database(TEST_DB)
        print("  ✓ Database initialized successfully")
        
        # Clean up test database
        if os.path.exists(TEST_DB):
            os.remove(TEST_DB)
            print("  ✓ Test database cleaned up")
        
        return True
        
    except Exception as e:
        print(f"  ✗ Database initialization failed: {e}")
        return False


def check_csv_processor():
    """
    Check if CSV processor works
    """
    print("\nChecking CSV processor...")
    
    try:
        from agent_logic import BankStatementProcessor
        
        processor = BankStatementProcessor()
        
        # Test with sample data
        SAMPLE_CSV = """Number,Date,Account,Amount,Subcategory,Memo
0,31/10/2025,20-23-97 70176931,-21.57,Debit,DELIVEROO ON 30 OCT CPM
0,29/10/2025,20-23-97 70176931,4640.11,Counter Credit,JELLYFISH UK LTD JELLYFISH UK BGC"""
        
        transactions = processor.parse_csv_file(SAMPLE_CSV)
        print(f"  ✓ CSV processor works (parsed {len(transactions)} transactions)")
        
        outgoings, income = processor.categorize_transactions(transactions)
        print(f"  ✓ Categorization works ({len(outgoings)} outgoings, {len(income)} income)")
        
        return True
        
    except Exception as e:
        print(f"  ✗ CSV processor failed: {e}")
        return False


def check_agent():
    """
    Check if agent can be initialized
    """
    print("\nChecking agent initialization...")
    
    try:
        from agent_logic import BankStatementAgent
        
        agent = BankStatementAgent()
        print("  ✓ Agent initialized successfully")
        print(f"  ✓ Using model: {agent.model.model_name}")
        
        return True
        
    except ValueError as e:
        print(f"  ⚠ Agent initialization skipped: {e}")
        print("    This is expected if GOOGLE_API_KEY is not set")
        return True
        
    except Exception as e:
        print(f"  ✗ Agent initialization failed: {e}")
        return False


def main():
    """
    Run all checks
    """
    print("=" * 60)
    print("Budget Agent Setup Verification")
    print("=" * 60)
    
    # Try to load .env file
    try:
        from dotenv import load_dotenv
        load_dotenv()
        print("\n✓ Loaded .env file")
    except ImportError:
        print("\n⚠ python-dotenv not installed")
    except Exception:
        print("\n⚠ No .env file found (this is okay if using environment variables)")
    
    # Run all checks
    CHECKS = [
        check_imports,
        check_environment,
        check_modules,
        check_database,
        check_csv_processor,
        check_agent,
    ]
    
    results = []
    
    for check in CHECKS:
        try:
            result = check()
            results.append(result)
        except Exception as e:
            print(f"\n✗ Check failed with error: {e}")
            results.append(False)
    
    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    
    PASSED = sum(results)
    TOTAL = len(results)
    
    print(f"\nChecks passed: {PASSED}/{TOTAL}")
    
    if all(results):
        print("\n✓ All checks passed! Your setup is ready.")
        print("\nNext steps:")
        print("  1. Run: python run_server.py")
        print("  2. Visit: http://localhost:8000/docs")
        print("  3. Upload a CSV file and start analyzing!")
        return 0
    else:
        print("\n⚠ Some checks failed. Please review the output above.")
        print("\nCommon fixes:")
        print("  1. Install missing packages: pip install -r requirements.txt")
        print("  2. Set GOOGLE_API_KEY in .env file")
        print("  3. Make sure you're in the agent directory")
        return 1


if __name__ == "__main__":
    sys.exit(main())

