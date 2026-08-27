import os
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Import Engines
from engines.data_gen import generate_synthetic_data
from engines.profile_engine import compute_financial_profile
from engines.risk_engine import determine_actual_risk

# Import Agents
from agents.orchestrator import run_orchestrator
from agents.explainer import run_explainer
from agents.verifier import run_verifier
from agents.challenger import run_challenger

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global store for the latest profile for simplicity
current_profile = None

@app.get("/api/profile")
async def get_profile():
    global current_profile
    raw_data = generate_synthetic_data()
    profile = compute_financial_profile(raw_data)
    profile['actual_risk'] = determine_actual_risk(profile)
    current_profile = profile
    return profile

class ParseProfileRequest(BaseModel):
    text: str

@app.post("/api/profile/parse")
async def parse_profile(data: ParseProfileRequest):
    global current_profile
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"error": "GEMINI_API_KEY not found"}
        
    import google.generativeai as genai
    import json
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-3-flash-preview")
    
    prompt = f"""
    Extract the financial profile from the following text and output ONLY a valid JSON object. Do not include markdown code blocks.
    Required keys: 
    - "name" (string)
    - "age" (int)
    - "net_worth" (float)
    - "monthly_income" (float)
    - "monthly_expense" (float)
    - "stated_risk_tolerance" (string: Low, Medium, or High)
    - "goals" (list of strings)
    Text: {data.text}
    """
    
    response = model.generate_content(prompt)
    try:
        raw_json = response.text.strip()
        if raw_json.startswith('```json'):
            raw_json = raw_json[7:-3].strip()
        parsed = json.loads(raw_json)
        
        profile = {
            "name": parsed.get("name", "Unknown Client"),
            "age": parsed.get("age", 30),
            "net_worth": parsed.get("net_worth", 0),
            "monthly_income": parsed.get("monthly_income", 0),
            "monthly_expense": parsed.get("monthly_expense", 0),
            "monthly_surplus": parsed.get("monthly_income", 0) - parsed.get("monthly_expense", 0),
            "current_savings": parsed.get("net_worth", 0) * 0.2,
            "investments_value": parsed.get("net_worth", 0) * 0.8,
            "emergency_fund_status": "Sufficient",
            "stated_risk_tolerance": parsed.get("stated_risk_tolerance", "Medium"),
            "behavioral_notes": "Parsed from unstructured notes.",
            "actual_risk": parsed.get("stated_risk_tolerance", "Medium"),
            "goals": parsed.get("goals", ["Wealth Growth"])
        }
        current_profile = profile
        return profile
    except Exception as e:
        return {"error": f"Failed to parse text. {e}"}



@app.websocket("/ws/agent-flow")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    global current_profile
    
    try:
        # Ignore client shocks and receive anything just to trigger
        data = await websocket.receive_json()
        
        if not current_profile:
            await websocket.send_json({"agent": "System", "type": "error", "text": "No profile found."})
            await websocket.close()
            return

        # Auto-calculate shocks based on risk
        risk = current_profile.get("actual_risk", "Medium")
        if risk == "High":
            shocks = ["Tech Sector Meltdown", "Market Crash 2008"]
        elif risk == "Medium":
            shocks = ["Inflation Spike", "Interest Rate Hike"]
        else:
            shocks = ["Job Loss / Income Stop", "Real Estate Crash"]

        # 1. Orchestrator
        await websocket.send_json({"agent": "Orchestrator", "type": "status", "status": "loading"})
        await websocket.send_json({"agent": "Orchestrator", "type": "info", "text": "Orchestrator Engine [ACTIVE]. Processing financial parameters..."})
        
        raw_plan = run_orchestrator(current_profile, shocks)
        
        await websocket.send_json({"agent": "Orchestrator", "type": "success", "text": f"Orchestrator successfully generated raw pathways:\n\n{raw_plan}"})
        await websocket.send_json({"agent": "Orchestrator", "type": "data", "data": raw_plan})
        
        # 2. Explainer
        await websocket.send_json({"agent": "Explainer", "type": "status", "status": "loading"})
        await websocket.send_json({"agent": "Explainer", "type": "info", "text": "Explainer Engine [ACTIVE]. Translating technical framework into client presentation format..."})
        
        expl = run_explainer(raw_plan)
        
        await websocket.send_json({"agent": "Explainer", "type": "success", "text": f"Client-facing explanation complete:\n\n{expl}"})
        await websocket.send_json({"agent": "Explainer", "type": "data", "data": expl})
        
        # 3. Verifier
        await websocket.send_json({"agent": "Verifier", "type": "status", "status": "loading"})
        await websocket.send_json({"agent": "Verifier", "type": "info", "text": "Verifier Engine [ACTIVE]. Cross-referencing translated numbers against base orchestrator logic..."})
        
        verif = run_verifier(raw_plan, expl)
        
        if verif["verified"]:
            await websocket.send_json({"agent": "Verifier", "type": "success", "text": f"Verification Passed: {verif['message']}"})
        else:
            await websocket.send_json({"agent": "Verifier", "type": "error", "text": f"Verification Alert: {verif['message']}"})
            
        await websocket.send_json({"agent": "Verifier", "type": "data", "data": verif})

        # 4. Challenger
        await websocket.send_json({"agent": "Challenger", "type": "status", "status": "loading"})
        await websocket.send_json({"agent": "Challenger", "type": "info", "text": "Challenger Engine [ACTIVE]. Stress testing the plan for theoretical flaws and edge cases..."})
        
        chal = run_challenger(current_profile, expl)
        
        await websocket.send_json({"agent": "Challenger", "type": "success", "text": f"Challenger critique generated:\n\n{chal}"})
        await websocket.send_json({"agent": "Challenger", "type": "data", "data": chal})

        # Complete
        await websocket.send_json({"agent": "System", "type": "complete"})
        
    except Exception as e:
        await websocket.send_json({"agent": "System", "type": "error", "text": f"System Encountered a fatal workflow error: {str(e)}"})
    finally:
        await websocket.close()
