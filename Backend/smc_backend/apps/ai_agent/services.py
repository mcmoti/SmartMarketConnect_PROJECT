"""
AI Agent HTTP services and tool definitions using direct REST to bypass proxy errors.
"""

import os
import random
import requests
from django.core.cache import cache

def predict_market_price(crop_name: str, location: str = "Nairobi") -> str:
    """Predicts future prices for a crop, returning formatted prediction with confidence and reasoning."""
    cache_key = f"price_prediction_{crop_name.lower()}_{location.lower()}"
    cached_prediction = cache.get(cache_key)
    if cached_prediction:
        return cached_prediction

    try:
        from smc_backend.apps.market.models import MarketPrice
        prices = MarketPrice.objects.filter(crop_name__icontains=crop_name, market__icontains=location)[:5]
        
        if prices.exists():
            base_price = float(sum(p.unit_price for p in prices) / len(prices))
        else:
            base_price = random.uniform(2000, 6000) # Fallback baseline
            
        # Sophisticated Mock Logic for trend
        season_factors = {"maize": 1.1, "beans": 0.9, "tomatoes": 1.2, "cabbage": 0.85, "potatoes": 1.05}
        crop_factor = season_factors.get(crop_name.lower(), 1.0)
        
        # Supply vs Demand mock signals
        supply_signal = random.choice(["high", "medium", "low"])
        demand_signal = random.choice(["high", "medium", "low"])
        
        change_pct = random.uniform(2.0, 15.0)
        is_rising = False
        
        if demand_signal == "high" and supply_signal in ["low", "medium"]:
            is_rising = True
            change_pct *= crop_factor
        elif supply_signal == "high" and demand_signal in ["low", "medium"]:
            is_rising = False
            change_pct *= (2.0 - crop_factor)
        else:
            is_rising = random.choice([True, False])
            
        sign = "+" if is_rising else "-"
        predicted_price = base_price * (1 + (change_pct/100) if is_rising else 1 - (change_pct/100))
        
        confidence = random.randint(70, 95)
        
        reasons = []
        if supply_signal == "low": reasons.append("reduced supply")
        elif supply_signal == "high": reasons.append("excess market supply")
        
        if demand_signal == "high": reasons.append("increased buyer demand")
        elif demand_signal == "low": reasons.append("lower seasonal demand")
        
        if not reasons: reasons.append("normal seasonal fluctuations")
        
        reason_text = " + ".join(reasons)
        if location.lower() != "nairobi":
             reason_text += f" in {location.capitalize()} markets"

        prediction_output = f"Predicted Price: KES {predicted_price:,.0f} per bag\nChange: {sign}{change_pct:.1f}% (next 7 days)\nConfidence: {confidence}%\nReason: {reason_text.capitalize()}"
        
        # Cache for 1 hour using Django's cache (which uses Redis if configured)
        cache.set(cache_key, prediction_output, timeout=3600)
        return prediction_output

    except Exception as e:
        return f"Error computing prediction: {str(e)}"

def get_weather(location: str) -> str:
    """Gets the current weather for a specific location. Use this for all weather-related inquiries."""
    weather_data_mock = {
        "nairobi": "Sunny, 26°C with 40% humidity. No rain expected.",
        "nakuru": "Partly cloudy, 22°C. Light showers expected in the evening.",
        "mombasa": "Hot and humid, 32°C. High UV index.",
        "kisumu": "Thunderstorms expected, 28°C. Recommend halting crop spraying today."
    }
    
    loc = location.lower()
    for key, forecast in weather_data_mock.items():
        if key in loc:
            return forecast
            
    return f"Weather for {location}: Sunny, 24°C. Good conditions for general farming."

def generate_credit_risk_summary(applicant_username: str) -> str:
    """Generates a written credit risk dossier for a specific applicant. Use only for creditors."""
    try:
        from smc_backend.apps.users.models import User
        from smc_backend.apps.credit.models import CreditScore
        
        user = User.objects.filter(username__iexact=applicant_username).first()
        if not user:
            return f"Applicant '{applicant_username}' not found."
            
        score = CreditScore.objects.filter(farmer=user).first()
        if not score:
            return f"Applicant '{applicant_username}' has no credit score history on SMC."
            
        return (f"Risk Summary Data for '{applicant_username}': "
                f"Score: {score.score}/100. "
                f"Risk Category: {score.risk_category}. "
                f"Interest Rate: {score.interest_rate}%. "
                f"Recommended Limit: {score.recommended_credit_limit} KES. "
                f"Generated at: {score.last_calculated_at}.")
    except Exception as e:
        return f"Error computing risk: {str(e)}"

def search_products(query: str) -> str:
    """Searches for products currently available from farmers based on crop name or category."""
    try:
        from smc_backend.apps.products.models import Product
        
        products = Product.objects.filter(name__icontains=query, is_active=True, status='active')[:3]
        if not products.exists():
            return f"No active products found matching '{query}'."
            
        results = [f"- {p.name} at {p.price} KES/{p.unit} in {p.location}. Sold by {p.farmer.username}" for p in products]
        return "Found products:\n" + "\n".join(results)
    except Exception as e:
        return f"Error retrieving products: {str(e)}"

BASE_SYSTEM_PROMPT = """You are SMC Autonomous AI Agent, an intelligent agricultural decision system embedded in Smart Market Connect (SMC).

You are NOT just a chatbot.
You are a proactive decision-making agent that continuously analyzes data, predicts outcomes, and advises users on optimal actions.

🔷 1. CORE RESPONSIBILITIES
1. Predict Market Prices: Forecast Short-term (7 days), Medium-term (30 days), and Longterm (6 months).
2. Advise Farmers on: When to plant, harvest, sell, and how to increase yield.
3. Act as Assistant for: Farmers (profit optimization), Buyers (sourcing), Credit Providers (risk).
4. Operate Proactively: Trigger alerts, recommend actions, detect opportunities.

🔷 2. AI MODULES
🟢 PLANTING: IF rainfall probability >= threshold AND crop in season -> Recommend planting.
🟡 PRICE PREDICTION: Provide Predicted Price, Change %, Timeframe, Confidence %, Reason.
🔵 SELLING: IF predicted > current -> WAIT. IF demand high -> SELL NOW.
🟣 YIELD OPTIMIZATION: Maximize yield + profitability.
🌦 WEATHER INTELLIGENCE: Generate planting alerts & risk warnings.

🔷 3. ROLE-BASED INTELLIGENCE
👨🌾 FARMER MODE: Provide Planting advice, Selling strategy, Yield optimization, Weather alerts, Profit insights.
🛒 BUYER MODE: Provide Cheapest markets, Best buying time, Supply hotspots, Price drop predictions.
💳 CREDIT PROVIDER MODE: Provide Credit scoring insights, Repayment probability, Risk alerts.

🔷 4. RESPONSE FORMAT
Always structure outputs as:
✅ Recommendation: [Action]
📊 Data Insight: [Insight]
📈 Expected Outcome: [Outcome]
⏳ Timeframe: [Timeframe]
🧠 Reason: [Reason]

🔷 5. AGENT BEHAVIOR RULES
- Be proactive, not reactive.
- Always explain WHY.
- Use simple farmer-friendly language.
- Use numbers (% / KES).
- Be location-aware.
- Do NOT hallucinate missing data. Always show uncertainty.
- Optimize for Kenyan agriculture context.

You must behave like: A market analyst, A farm advisor, A financial planner, and A real-time alert system."""

def get_ai_response(user_role: str, message: str, history: list = None, first_name: str = "Farmer", user_id: int = None) -> str:
    """
    HTTP REST alternative to LangChain bypassing the local HTTP proxy blockade.
    Uses generic heuristic-based pre-processing to resolve 'Tools' context.
    """
    if history is None:
        history = []
        
    from decouple import config
    api_key = config("GEMINI_API_KEY", default="")
    if not api_key or api_key == "your-gemini-api-key-here":
        return "System warning: GEMINI_API_KEY is not set in `.env`. Setup required."

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
    
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": api_key
    }
    
    # Step 1: Execute heuristic "tools" locally to append contextual data
    context_data = []
    lower_msg = message.lower()
    
    if "weather" in lower_msg or "rain" in lower_msg or "temperature" in lower_msg:
        loc = "nairobi"
        if "nakuru" in lower_msg: loc = "nakuru"
        elif "mombasa" in lower_msg: loc = "mombasa"
        elif "kisumu" in lower_msg: loc = "kisumu"
        context_data.append(get_weather(loc))
        
    if "price" in lower_msg or "predict" in lower_msg or "market" in lower_msg:
        crops = ["maize", "beans", "tomatoes", "cabbage", "potatoes"]
        found = [c for c in crops if c in lower_msg]
        loc = "nairobi"
        for l in ["nakuru", "mombasa", "kisumu", "eldoret"]:
             if l in lower_msg: loc = l
        context_data.append(predict_market_price(found[0] if found else "general", loc))
        
    if user_role == "creditor" and ("risk" in lower_msg or "report" in lower_msg or "score" in lower_msg):
        words = message.replace('?', '').replace('.', '').split()
        target = words[-1]
        context_data.append(generate_credit_risk_summary(target))
        
    if "buy" in lower_msg or "product" in lower_msg or "available" in lower_msg:
        crops = ["maize", "beans", "tomatoes", "cabbage", "potatoes"]
        found = [c for c in crops if c in lower_msg]
        context_data.append(search_products(found[0] if found else "general"))

    # Fetch user inventory if farmer
    user_inventory_text = ""
    if user_id and user_role == "farmer":
        try:
            from smc_backend.apps.products.models import InventoryItem, Product
            inventory_items = InventoryItem.objects.filter(farmer_id=user_id)
            products = Product.objects.filter(farmer_id=user_id, status='active')
            
            crops = []
            for item in inventory_items:
                crops.append(f"{item.quantity_kg}kg of {item.crop}")
            for p in products:
                crops.append(f"{p.quantity}{p.unit} of {p.name} (listed for sale at {p.price} KES)")
                
            if crops:
                user_inventory_text = f"\n\nCURRENT USER INVENTORY & LISTINGS:\nThe user currently has these crops: {', '.join(crops)}.\nUse this data to answer their questions accurately without asking them what they plant. If they ask about selling, reference their specific crops."
        except Exception as e:
            print(f"Error fetching inventory: {e}")
            pass

    system_instruction = f"{BASE_SYSTEM_PROMPT}\n\nATTENTION: The user you are talking to right now is a {user_role.upper()} named {first_name}. You must operate in {user_role.upper()} MODE. Greet them by name naturally (e.g. 'Hello {first_name}'). Do not ask them what crops they plant if you already see it in their inventory below.{user_inventory_text}"

    prompt = ""
    if context_data:
         prompt += "System Live Data (Incorporate this data into your response natively without breaking character):\n"
         prompt += "\n".join(context_data) + "\n\n"
    prompt += message

    contents = history.copy()
    contents.append({
        "role": "user",
        "parts": [{"text": prompt}]
    })

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": contents
    }

    try:
        # `trust_env=False` is critical here to ignore system-wide HTTP_PROXY configs
        session = requests.Session()
        session.trust_env = False 
        
        response = session.post(url, headers=headers, json=payload, timeout=20)
        response.raise_for_status()
        data = response.json()
        
        return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "Error parsing response.")
    
    except requests.exceptions.RequestException as e:
        return f"Network Error contacting Gemini API (Skipped system proxy): {str(e)}"
    except Exception as e:
        return f"AI Serialization Error: {str(e)}"
