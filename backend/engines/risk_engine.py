def determine_actual_risk(profile_data: dict) -> str:
    """
    Deterministic classification model to predict actual risk appetite
    based on behavioral notes and current portfolio split, overriding stated risk.
    """
    stated_risk = profile_data['stated_risk_tolerance']
    behavior = profile_data['behavioral_notes']
    
    cash_ratio = profile_data['current_savings'] / profile_data['net_worth'] if profile_data['net_worth'] > 0 else 1.0
    
    # Feature extraction rules
    if "sold during last 5% market dip" in behavior or cash_ratio > 0.7:
        actual_risk = "Low"
    elif "crypto and high-yield" in behavior and cash_ratio < 0.2:
        actual_risk = "High"
    elif "Consistently invests" in behavior:
        actual_risk = "Medium"
    else:
        # Fallback to stated risk if no strong behavioral evidence contradicts
        actual_risk = stated_risk
        
    return actual_risk
