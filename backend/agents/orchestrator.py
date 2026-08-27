import os
import json
import google.generativeai as genai
from engines.plan_generator import generate_plans

def run_orchestrator(profile: dict, shocks: list) -> str:
    """
    Coordinates the plan generation and formats it into a technical pathway.
    """
    # Fetch plans from engine
    plans = generate_plans(profile, profile['stated_risk_tolerance'])
    
    # Use LLM to format and synthesize
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment.")
        
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-3-flash-preview")
    
    prompt = f"""
    You are the Orchestrator Engine.
    Here is the client profile:
    {json.dumps(profile, indent=2)}
    
    Here are the generated numerical plans:
    {json.dumps(plans, indent=2)}
    
    And the macroeconomic shocks applied: {shocks}
    
    Provide a highly technical, raw breakdown of how these plans fit the client's financial parameters.
    Format as a structured technical document.
    """
    
    response = model.generate_content(prompt)
    return response.text
