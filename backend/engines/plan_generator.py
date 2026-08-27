def generate_plans(profile: dict, actual_risk: str) -> list:
    """
    Builds 2-3 genuine different financial plans for the client.
    """
    plans = []
    
    surplus = profile['monthly_surplus']
    
    # Base allocations
    if actual_risk == "Low":
        equity_ratio = 0.3
        debt_ratio = 0.7
    elif actual_risk == "High":
        equity_ratio = 0.8
        debt_ratio = 0.2
    else: # Medium
        equity_ratio = 0.6
        debt_ratio = 0.4
        
    # Plan 1: Core Base Plan based on Risk
    plans.append({
        "plan_name": "Standard Core Portfolio",
        "description": "Standard allocation aligned with actual risk tolerance.",
        "equity_allocation": equity_ratio * 100,
        "debt_allocation": debt_ratio * 100,
        "monthly_sip": surplus * 0.8 # Invest 80% of surplus
    })
    
    # Plan 2: Aggressive Wealth Builder (shifts +20% to equity)
    if actual_risk != "High":
        plans.append({
            "plan_name": "Aggressive Wealth Builder",
            "description": "Slightly more aggressive approach to capture higher long-term growth.",
            "equity_allocation": min((equity_ratio + 0.2) * 100, 95),
            "debt_allocation": max((debt_ratio - 0.2) * 100, 5),
            "monthly_sip": surplus * 0.9
        })
        
    # Plan 3: Capital Preservation (shifts +20% to debt)
    if actual_risk != "Low":
        plans.append({
            "plan_name": "Capital Preservation",
            "description": "Conservative approach prioritizing capital safety over high returns.",
            "equity_allocation": max((equity_ratio - 0.2) * 100, 10),
            "debt_allocation": min((debt_ratio + 0.2) * 100, 90),
            "monthly_sip": surplus * 0.7
        })

    return plans
