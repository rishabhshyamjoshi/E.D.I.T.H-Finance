import os
import google.generativeai as genai

def run_explainer(raw_plan_text: str) -> str:
    """
    Translates technical outputs into readable plain text.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment.")
        
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-3-flash-preview")
    
    prompt = f"""
    You are the Explainer Engine, a high-end financial advisor.
    Take the following raw technical financial plan and translate it into a clear, 
    empathetic, and highly readable plain-text explanation for the client.
    
    RAW PLAN:
    {raw_plan_text}
    """
    
    response = model.generate_content(prompt)
    return response.text
