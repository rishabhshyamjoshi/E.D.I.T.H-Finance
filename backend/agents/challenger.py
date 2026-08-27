import os
import json
import google.generativeai as genai

def run_challenger(profile: dict, explainer_text: str) -> str:
    """
    Argues against the chosen plan based on behavioral evidence.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment.")
        
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-3-flash-preview")
    
    prompt = f"""
    You are the Challenger Engine, acting as a Devil's Advocate against the financial plan.
    Here is the client's behavioral data:
    {json.dumps({
        'stated_risk_tolerance': profile.get('stated_risk_tolerance'),
        'behavioral_notes': profile.get('behavioral_notes'),
        'current_savings': profile.get('current_savings'),
        'investments_value': profile.get('investments_value')
    }, indent=2)}
    
    Here is the proposed client explanation:
    {explainer_text}
    
    Your goal is to tear this plan apart using evidence from their own behavior. 
    Point out psychological flaws, historical mistakes they've made, or why they 
    might fail to stick to this plan. Keep it highly professional but ruthless.
    """
    
    response = model.generate_content(prompt)
    return response.text
