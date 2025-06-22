from fastapi import FastAPI, Path, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
import json
from pydantic import BaseModel, Field
from modules.db_reader import query_df
from .audio_utils import denoise_audio, load_audio_from_uploadfile, save_audio_to_bytesio
import io

# object creation of FastAPI
app = FastAPI(title="Audio Processing API", description="API for denoising audio files.")


@app.get("/")
def index():
    return {"message": "Welcome to the Audio Processing API. Use the /denoise/ endpoint to process audio."}


@app.post("/denoise/", tags=["Audio Processing"])
async def denoise_audio_endpoint(file: UploadFile = File(..., description="Audio file to be denoised (wav, mp3, flac)")):
    """
    Accepts an audio file, denoises it, and returns the processed audio file.
    """
    audio_data, sample_rate, error = await load_audio_from_uploadfile(file)

    if error:
        raise HTTPException(status_code=400, detail=error)

    if audio_data is None or sample_rate is None: # Should be caught by error but as a safeguard
        raise HTTPException(status_code=500, detail="Failed to load audio data.")

    denoised_data = denoise_audio(audio_data, sample_rate)

    output_format = file.filename.split(".")[-1].lower() if file.filename else "wav"
    if output_format not in ["wav", "flac"]: # mp3 encoding requires ffmpeg or similar, stick to wav/flac for now
        output_format = "wav"

    audio_buffer = save_audio_to_bytesio(denoised_data, sample_rate, format=output_format)

    return StreamingResponse(audio_buffer, media_type=f"audio/{output_format}", headers={
        "Content-Disposition": f"attachment; filename=denoised_{file.filename}"
    })


# Previous endpoints for demonstration (can be removed or kept based on project needs)
@app.get("/emp/{emp_id}", tags=["Demo Employee Data"])
def emp_id(emp_id: int):
    try:
        with open('../temp/emp_data.json', 'r') as f: # Adjusted path
            data = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Employee data file not found.")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Error decoding employee data.")

    if 'jobs' in data and isinstance(data['jobs'], list) and 0 <= emp_id -1 < len(data['jobs']):
        return data['jobs'][emp_id - 1]
    else:
        raise HTTPException(status_code=404, detail=f"Employee with id {emp_id} not found.")


@app.get("/get-by-id")
def get_by_id(emp_id: int):
    try:
        with open("temp/emp_data.json", "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Data file not found")  # Internal Server Error

    for job in data.get("jobs", []):  # Handle missing "jobs" key
        if job["id"] == emp_id:
            return job  # Return the found job directly

    raise HTTPException(status_code=404, detail="Employee not found")


@app.get("/get-by-skill")
def get_by_skill(skill: str):
    try:
        with open("temp/emp_data.json", "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Data file not found")

    matching_jobs = []
    for job in data.get("jobs", []):
        if skill.lower() in job["title"].lower():  # Case-insensitive matching
            matching_jobs.append(job)

    if not matching_jobs:
        raise HTTPException(status_code=404, detail="No jobs found with that skill found currently")

    return matching_jobs


class Employee(BaseModel):
    id: int = Field(..., ge=1, description="Unique identifier for the job")
    title: str = Field(..., max_length=100, description="Job title")
    location: str = Field(..., max_length=50, description="Job location")
    salary: str = Field(..., description="Salary information")

@app.post("/add-job")
def add_job(emp: Employee):
    try:
        with open("temp/emp_data.json", "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Data file not found")
    existing_ids = [job["id"] for job in data.get("jobs", [])]
    if emp.id in existing_ids:
        raise HTTPException(status_code=409, detail="Job with this ID already exists")
    if "jobs" not in data:
        data["jobs"] = []
    data["jobs"].append(emp.dict())

    with open("temp/emp_data.json", "w") as f:
        json.dump(data, f, indent=4)  # Add indentation for readability

    return emp



query = "select * From applications"
data = query_df(query)
print(type(data))