import os
import sys
import json
import mysql.connector
import pandas as pd
import requests
import google.generativeai as genai
import warnings

# Ignora avisos do terminal para não quebrar a leitura do JSON no PHP
warnings.filterwarnings('ignore')

# Configurações do Banco e API
DB_CONFIG = {'host': os.environ.get('DB_HOST', 'localhost'), 'user': os.environ.get('DB_USER', 'root'), 'password': os.environ.get('DB_PASS', ''), 'database': os.environ.get('DB_NAME', 'farmproject')}
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")  # set in your environment, never commit the key
genai.configure(api_key=GEMINI_API_KEY)

def get_animal_data(animal_id):
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        query_animal = """SELECT a.animal_id, a.tag_number, a.sex, a.birth_date, at.species, at.breed, DATEDIFF(NOW(), a.birth_date) AS age_days
                          FROM animal a JOIN animal_types at ON a.type_id = at.type_id WHERE a.animal_id = %s"""
        df_animal = pd.read_sql(query_animal, conn, params=(animal_id,))
        if df_animal.empty:
            conn.close()
            return None
        
        query_weight = "SELECT weighing_date, weight_kg, daily_gain FROM weighing WHERE animal_id = %s ORDER BY weighing_date DESC LIMIT 3"
        df_weight = pd.read_sql(query_weight, conn, params=(animal_id,))
        
        query_health = "SELECT treatment_date, diagnosis FROM health_records WHERE animal_id = %s ORDER BY treatment_date DESC LIMIT 3"
        df_health = pd.read_sql(query_health, conn, params=(animal_id,))
        conn.close()
        
        return {
            "profile": df_animal.iloc[0].to_dict(),
            "weight_history": df_weight.to_dict(orient="records"),
            "health_history": df_health.to_dict(orient="records")
        }
    except Exception as e:
        return None

def search_pubmed_literature(species, symptoms):
    symptoms_query = " OR ".join(symptoms)
    search_term = f"{species} AND ({symptoms_query})"
    url_search = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={search_term}&retmax=3&retmode=json"
    try:
        res_search = requests.get(url_search, timeout=10).json()
        ids = res_search['esearchresult'].get('idlist', [])
        if not ids: return "No recent literature."
        url_summary = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id={','.join(ids)}&retmode=json"
        res_summary = requests.get(url_summary, timeout=10).json()
        return "\n".join([f"PMID: {uid} | {res_summary['result'][uid].get('title', '')}" for uid in ids])
    except:
        return "Failed to query PubMed."

def main():
    # 1. Lê o arquivo JSON enviado pelo PHP via argumento de linha de comando
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Nenhum arquivo de dados recebido."}))
        return

    json_file_path = sys.argv[1]
    with open(json_file_path, 'r', encoding='utf-8') as f:
        input_data = json.load(f)

    animal_id = input_data.get('animal_id', 1)
    body_temp = input_data.get('temperature', 0)
    symptoms = input_data.get('symptoms', [])
    observations = input_data.get('observations', '')

    db_data = get_animal_data(animal_id)
    if not db_data:
        print(json.dumps({"error": f"Animal ID {animal_id} not found in database."}))
        return

    species = db_data['profile'].get('species', 'cattle')
    scientific_evidence = search_pubmed_literature(species, symptoms)

    # 2. Instrução do Sistema FORÇANDO a saída em JSON para encaixar no PHP
    system_instruction = """
    You are a Virtual Veterinary Assistant.
    Analyze the data and respond STRICTLY with a valid JSON object matching this exact structure:
    {
      "summary": "Clinical summary text",
      "hypotheses": [
        {"name": "Hypothesis 1", "prob": 80},
        {"name": "Hypothesis 2", "prob": 20}
      ],
      "justification": "Physiological justification text",
      "questions": ["Question 1", "Question 2"],
      "safe_actions": ["Action 1", "Action 2"],
      "warnings": ["Warning 1", "Warning 2"],
      "references": ["Ref 1"],
      "confidence": "High/Medium/Low"
    }
    Never include any markdown like ```json or outside text. Just the raw JSON object.
    """

    user_prompt = f"""
    Animal Data: {db_data}
    Temp: {body_temp}
    Symptoms: {symptoms}
    Observations: {observations}
    Evidence: {scientific_evidence}
    """

    try:
        # Configurando o Gemini para retornar JSON nativo
        model = genai.GenerativeModel(
            model_name="gemini-1.5-pro",
            system_instruction=system_instruction
        )
        response = model.generate_content(
            user_prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                response_mime_type="application/json" # Mágica acontece aqui!
            )
        )
        
        # O print envia a resposta de volta para o PHP
        print(response.text)

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()