from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from data_engine import fetch_animal_context
from orchestrator import run_clinical_analysis

app = FastAPI(title="Vet Assist AI", version="1.0")

# Request Model
class ClinicalInput(BaseModel):
    animal_id: int
    temperature: float
    symptoms: List[str]
    free_observations: Optional[str] = ""

@app.post("/api/v1/analyze")
async def analyze_health(data: ClinicalInput):
    # 1. Fetch data from DB
    animal_context = fetch_animal_context(data.animal_id)
    
    if not animal_context:
        raise HTTPException(status_code=404, detail="Animal not found in the database.")

    clinical_input = data.model_dump()

    try:
        # 2. Run AI Analysis
        ai_result = run_clinical_analysis(animal_context, clinical_input)
        
        return {
            "status": "success",
            "animal_info": animal_context,
            "clinical_analysis": ai_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Analysis Error: {str(e)}")