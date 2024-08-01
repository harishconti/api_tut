from fastapi import FastAPI, Path, HTTPException
import json
from pydantic import BaseModel, Field
from modules.db_reader import query_df
import json
# object creation of FastAPI
app = FastAPI()


@app.get("/")
def index():
    return {"Hello": "World"}


@app.get("/emp/{emp_id}")
def emp_id(emp_id: int):
    with open('temp/emp_data.json', 'r') as f:
        data = json.load(f)
    print(data)
    try:
        return data['jobs'][emp_id - 1]
    except KeyError:
        return KeyError


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