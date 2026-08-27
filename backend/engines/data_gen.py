import random

def generate_synthetic_data() -> dict:
    """
    Generates synthetic client data including monthly cashflows, 
    assets, and behavioral patterns.
    """
    jobs = ["Software Engineer", "Doctor", "Small Business Owner", "Teacher", "Investment Banker"]
    job = random.choice(jobs)
    
    # Base monthly income
    base_income = random.randint(5000, 25000)
    
    # Generate 12 months of synthetic transaction data
    monthly_data = []
    total_savings = 0
    
    for month in range(1, 13):
        # Introduce some variance in expenses
        expense = int(base_income * random.uniform(0.4, 0.8))
        surplus = base_income - expense
        total_savings += surplus
        
        monthly_data.append({
            "month": month,
            "income": base_income,
            "expense": expense,
            "surplus": surplus
        })
        
    return {
        "name": "Jane Doe",
        "age": random.randint(28, 55),
        "job": job,
        "base_income": base_income,
        "current_savings": total_savings + random.randint(10000, 100000),
        "investments_value": random.randint(50000, 500000),
        "monthly_history": monthly_data,
        "stated_risk_tolerance": random.choice(["Low", "Medium", "High"]),
        "behavioral_notes": random.choice([
            "Panicked and sold during last 5% market dip.",
            "Consistently invests 20% of income regardless of market.",
            "Often asks about crypto and high-yield risky assets.",
            "Keeps 80% of net worth in cash savings accounts."
        ])
    }
