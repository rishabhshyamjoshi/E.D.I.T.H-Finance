def run_stress_test(monte_carlo_results: list, shocks: list) -> list:
    """
    Stress test the simulated results based on specific macroeconomic shocks.
    """
    stress_results = []
    
    for mc in monte_carlo_results:
        # Base expected value
        stressed_value = mc['median_expected']
        
        for shock in shocks:
            if shock == "Global Pandemic":
                stressed_value *= 0.70 # 30% drop
            elif shock == "Market Crash":
                stressed_value *= 0.60 # 40% drop
            elif shock == "Hyperinflation":
                # Drops real value of debt heavy portfolios
                stressed_value *= 0.85
                
        stress_results.append({
            "plan_name": mc['plan_name'],
            "base_median": mc['median_expected'],
            "stressed_median": stressed_value,
            "survival_ratio": stressed_value / mc['median_expected']
        })
        
    return stress_results
