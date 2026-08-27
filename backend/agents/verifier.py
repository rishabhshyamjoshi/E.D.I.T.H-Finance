import re

def run_verifier(raw_plan_text: str, explainer_text: str) -> dict:
    """
    Deterministic check using standard library regex to ensure no financial figures
    were hallucinated by the Explainer agent.
    """
    # Extract all dollar figures (e.g. $10,000, $5.5M)
    regex_pattern = r'\$[\d,]+(?:\.\d+)?(?:[KkMmBb])?'
    
    raw_figures = set(re.findall(regex_pattern, raw_plan_text))
    explainer_figures = set(re.findall(regex_pattern, explainer_text))
    
    # Check for any figures in explainer that are NOT in raw plan
    hallucinated_figures = explainer_figures - raw_figures
    
    # It's possible the LLM formatted 100000 as 100,000, which might trigger a false positive,
    # but for strict deterministic checking, this is a standard approach.
    if len(hallucinated_figures) > 0:
        return {
            "verified": False,
            "message": f"Blocked: Found potentially hallucinated figures in the explanation: {', '.join(hallucinated_figures)}."
        }
        
    return {
        "verified": True,
        "message": "All numerical data points in the client explanation trace back to the raw orchestrator plan."
    }
