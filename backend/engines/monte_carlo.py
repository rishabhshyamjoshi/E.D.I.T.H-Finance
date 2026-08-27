import numpy as np

def run_monte_carlo(plan: dict, current_investments: float, years: int = 10, iterations: int = 10000) -> dict:
    """
    Monte Carlo simulation running 10,000 iterations for a plan.
    Uses historical Nifty yearly returns approximations for equity, 
    and standard fixed-income for debt.
    """
    # Historical Nifty approximate stats: Mean 12%, Volatility (Std Dev) 18%
    equity_mean = 0.12
    equity_std = 0.18
    
    # Historical Debt approximate stats: Mean 7%, Volatility 3%
    debt_mean = 0.07
    debt_std = 0.03
    
    equity_w = plan['equity_allocation'] / 100.0
    debt_w = plan['debt_allocation'] / 100.0
    
    monthly_sip = plan['monthly_sip']
    annual_contribution = monthly_sip * 12
    
    final_values = []
    
    for _ in range(iterations):
        portfolio_val = current_investments
        for _ in range(years):
            # Draw random returns from normal distribution based on historicals
            e_ret = np.random.normal(equity_mean, equity_std)
            d_ret = np.random.normal(debt_mean, debt_std)
            
            # Weighted portfolio return
            port_ret = (equity_w * e_ret) + (debt_w * d_ret)
            
            # Add return and annual contribution
            portfolio_val = portfolio_val * (1 + port_ret) + annual_contribution
            
        final_values.append(portfolio_val)
        
    final_values = np.array(final_values)
    
    return {
        "plan_name": plan['plan_name'],
        "median_expected": float(np.median(final_values)),
        "10th_percentile_worst_case": float(np.percentile(final_values, 10)),
        "90th_percentile_best_case": float(np.percentile(final_values, 90))
    }
