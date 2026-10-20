import os
import json
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.schema.output_parser import StrOutputParser
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize LLM
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)

SYSTEM_PROMPT = """
You are a Specialized Bovine Veterinary Assistive Clinical System.
Your objective is to analyze the animal's data, reported symptoms, and physiological deviations to assist in the early detection of diseases.

ESTABLISHED RULES:
1. NEVER give a definitive diagnosis. Always generate differential hypotheses.
2. NEVER prescribe antibiotics or restricted-use drugs autonomously.
3. If there is a risk of death, zoonosis, or a notifiable disease, set "call_veterinarian" to true.
4. Justify your hypotheses linking the symptoms to physiology and weight changes.
5. Answer STRICTLY in valid JSON format.

ANIMAL DATA:
{animal_context}

CLINICAL DATA AND SYMPTOMS:
Temperature: {temperature}°C
Symptoms: {symptoms}
Observations: {observations}

Return a JSON strictly with the following keys:
- "clinical_summary" (string)
- "probable_hypotheses" (list of objects with 'disease', 'probability', 'justification')
- "additional_questions_needed" (list of strings)
- "immediate_safe_actions" (list of strings)
- "severe_warning_signs" (list of strings)
- "call_veterinarian" (boolean)
- "veterinarian_message" (string)
"""

def run_clinical_analysis(animal_context: dict, clinical_input: dict):
    prompt = PromptTemplate(
        input_variables=["animal_context", "temperature", "symptoms", "observations"],
        template=SYSTEM_PROMPT
    )
    
    # Langchain Pipeline
    chain = prompt | llm | StrOutputParser()
    
    # Prepare context payload
    context_str = json.dumps(animal_context, indent=2)
    
    # Trigger LLM
    response = chain.invoke({
        "animal_context": context_str,
        "temperature": clinical_input.get("temperature"),
        "symptoms": ", ".join(clinical_input.get("symptoms", [])),
        "observations": clinical_input.get("free_observations", "None")
    })
    
    # Clean markdown if present
    if response.startswith("```json"):
        response = response.strip("```json").strip("```")
        
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return {"error": "Failed to parse LLM response into JSON.", "raw_response": response}