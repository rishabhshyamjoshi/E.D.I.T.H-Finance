import pandas as pd

def compute_financial_profile(raw_data: dict) -> dict:
    """
    Computes standard financial metrics using Pandas.
    """
    df = pd.DataFrame(raw_data['monthly_history'])
    
    # Averages
    monthly_income = float(df['income'].mean())
    monthly_expense = float(df['expense'].mean())
    monthly_surplus = float(df['surplus'].mean())
    
    # Net Worth calculation
    net_worth = raw_data['current_savings'] + raw_data['investments_value']
    
    # Emergency Fund Status
    # Standard recommendation: 6 months of expenses
    recommended_emergency_fund = monthly_expense * 6
    emergency_fund_status = "Sufficient" if raw_data['current_savings'] >= recommended_emergency_fund else "Deficient"
    
    return {
        "name": raw_data['name'],
        "age": raw_data['age'],
        "net_worth": net_worth,
        "monthly_income": monthly_income,
        "monthly_expense": monthly_expense,
        "monthly_surplus": monthly_surplus,
        "current_savings": raw_data['current_savings'],
        "investments_value": raw_data['investments_value'],
        "emergency_fund_status": emergency_fund_status,
        "stated_risk_tolerance": raw_data['stated_risk_tolerance'],
        "behavioral_notes": raw_data['behavioral_notes']
    }
