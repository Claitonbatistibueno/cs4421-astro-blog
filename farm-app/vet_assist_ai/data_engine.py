import mysql.connector
import pandas as pd
import requests
import os
import google.generativeai as genai # Requires: pip install google-generativeai pandas mysql-connector-python requests

# ==========================================
# 1. CONFIGURATION & API KEYS
# ==========================================
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'farmproject'
}

# Put your Google Gemini API Key here
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")  # set in your environment, never commit the key
genai.configure(api_key=GEMINI_API_KEY)

# ==========================================
# 2. DATABASE INTEGRATION
# ==========================================
def get_animal_data(animal_id):
    """
    Fetches structured animal data and history from the local database.
    """
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        
        # 2.1 Basic Data, Breed, and Age
        query_animal = """
            SELECT a.animal_id, a.tag_number, a.sex, a.birth_date,
                   at.species, at.breed,
                   DATEDIFF(NOW(), a.birth_date) AS age_days
            FROM animal a
            JOIN animal_types at ON a.type_id = at.type_id
            WHERE a.animal_id = %s
        """
        df_animal = pd.read_sql(query_animal, conn, params=(animal_id,))
        
        # 2.2 Weight History (Last 3 weighings to check ADG trends)
        query_weight = """
            SELECT weighing_date, weight_kg, daily_gain 
            FROM weighing 
            WHERE animal_id = %s 
            ORDER BY weighing_date DESC LIMIT 3
        """
        df_weight = pd.read_sql(query_weight, conn, params=(animal_id,))
        
        # 2.3 Recent Health History
        query_health = """
            SELECT treatment_date, diagnosis 
            FROM health_records 
            WHERE animal_id = %s 
            ORDER BY treatment_date DESC LIMIT 3
        """
        df_health = pd.read_sql(query_health, conn, params=(animal_id,))
        
        conn.close()
        
        if df_animal.empty:
            return None
            
        return {
            "profile": df_animal.iloc[0].to_dict(),
            "weight_history": df_weight.to_dict(orient="records"),
            "health_history": df_health.to_dict(orient="records")
        }
    except Exception as e:
        print(f"Database access error: {e}")
        return None

# ==========================================
# 3. RAG - EXTERNAL KNOWLEDGE BASES
# ==========================================
def search_pubmed_literature(species, symptoms):
    """
    Fetches scientific abstracts from PubMed via E-utilities API to support AI reasoning.
    """
    symptoms_query = " OR ".join(symptoms)
    search_term = f"{species} AND ({symptoms_query})"
    
    url_search = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={search_term}&retmax=3&retmode=json"
    
    try:
        res_search = requests.get(url_search, timeout=5).json()
        ids = res_search['esearchresult'].get('idlist', [])
        
        if not ids:
            return "No recent correlated scientific literature found on PubMed."
            
        ids_str = ",".join(ids)
        url_summary = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id={ids_str}&retmode=json"
        res_summary = requests.get(url_summary, timeout=5).json()
        
        evidence_list = []
        for uid in ids:
            title = res_summary['result'][uid].get('title', '')
            evidence_list.append(f"PMID: {uid} - {title}")
            
        return "\n".join(evidence_list)
    except Exception as e:
        return f"Failed to query PubMed API: {e}"

def search_ema_database(condition):
    """
    Placeholder: Fetches safe veterinary medicines from the European Medicines Agency (EMA).
    """
    return "EMA Database lookup: Verify active principles suitable for the presumed condition."

# ==========================================
# 4. AI CLINICAL REASONING ENGINE (GEMINI)
# ==========================================
def generate_assistive_report(animal_id, body_temp, symptoms, observations, images="None"):
    """
    Main function triggered by the chatbot when a user requests an analysis using Google Gemini.
    """
    # Step 1: Fetch local database history
    db_data = get_animal_data(animal_id)
    if not db_data:
        return "Error: Animal not found in the database."
    
    species = db_data['profile'].get('species', 'cattle')
    
    # Step 2: RAG - Fetch external evidence (PubMed)
    scientific_evidence = search_pubmed_literature(species, symptoms)
    ema_guidelines = search_ema_database("general")
    
    # Step 3: Build the structured system prompt enforcing your strict rules
    system_instruction = """
    You are a Virtual Veterinary Assistant specializing in livestock and companion animals.
    Your reasoning must follow these exact steps: 1. Analyze weight/performance; 2. Detect physiological deviations; 3. Analyze symptoms; 4. Cross-reference with scientific evidence.
    
    CRITICAL SECURITY RULES:
    - Never issue a definitive diagnosis (always use "probable hypotheses").
    - Avoid direct prescription of dosages.
    - Always declare uncertainty when data is insufficient.
    - If the temperature or symptoms represent an immediate risk of death or severe infectious disease, recommend CALLING A VETERINARIAN IMMEDIATAMENTE.
    - Identify physiological incompatibilities (e.g., a calf with the weight of an adult).

    YOU MUST RESPOND STRICTLY IN THIS FORMAT:
    - Clinical Summary:
    - Probable Hypotheses (with estimated probabilities %):
    - Physiological Justification:
    - Necessary Additional Questions:
    - Safe Immediate Actions:
    - Severe Warning Signs:
    - Scientific Reference: (cite the literature provided below)
    - System Confidence Level (High/Medium/Low):
    """
    
    # Step 4: Build the specific user case
    user_prompt = f"""
    ANALYZE THE FOLLOWING CASE:
    
    [DATABASE RECORDS - ANIMAL ID {animal_id}]
    - Species/Breed: {db_data['profile'].get('species')} / {db_data['profile'].get('breed')}
    - Age: {db_data['profile'].get('age_days')} days
    - Sex: {db_data['profile'].get('sex')}
    - Recent Weight History: {db_data['weight_history']}
    - Recent Health History: {db_data['health_history']}
    
    [BOT INPUT DATA]
    - Body Temperature: {body_temp}°C
    - Selected Symptoms: {', '.join(symptoms)}
    - Free Observations: {observations}
    - Image Status: {images}
    
    [RETRIEVED SCIENTIFIC LITERATURE (RAG)]
    {scientific_evidence}
    
    [PHARMACOLOGICAL GUIDELINES (EMA)]
    {ema_guidelines}
    """
    
    try:
        # Step 5: Call the Gemini Model (gemini-1.5-pro is recommended for complex reasoning)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-pro",
            system_instruction=system_instruction
        )
        
        # Generation configuration (Low temperature for analytical rigor)
        generation_config = genai.GenerationConfig(
            temperature=0.1
        )
        
        response = model.generate_content(
            user_prompt,
            generation_config=generation_config
        )
        
        return response.text
        
    except Exception as e:
        return f"Error during AI processing step: {e}"

# ==========================================
# 5. EXECUTION TEST (Simulating the Chatbot)
# ==========================================
if __name__ == "__main__":
    print("Initiating clinical case analysis with Gemini...\n")
    
    # Static ID for testing (replace with dynamic ID from your bot)
    target_animal_id = 12 
    
    report = generate_assistive_report(
        animal_id=target_animal_id,
        body_temp=40.5, # e.g., fever in cattle
        symptoms=["lameness", "joint swelling", "herd isolation"],
        observations="The animal has been unable to bear weight on the right hind leg since yesterday."
    )