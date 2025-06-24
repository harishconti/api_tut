from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import io
import base64
from typing import Optional, List, Dict, Any # Added for type hinting

# Assuming db_reader is not essential for the core audio processing logic now.
# If it was used for something else, it might need to be re-evaluated.
# from .modules.db_reader import query_df

from .audio_utils import (
    denoise_audio,
    load_audio_from_uploadfile,
    save_audio_to_bytesio,
    apply_equalizer,
    normalize_audio_loudness,
    generate_waveform_data,
    SUPPORTED_AUDIO_FORMATS
)

app = FastAPI(
    title="Audio Processing API",
    description="API for denoising, equalizing, normalizing, and analyzing audio files."
)

# CORS Middleware Configuration
origins = [
    "http://localhost:3000", # Frontend
    # Add other origins if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def index():
    return {"message": "Welcome to the Audio Processing API. Use the /process/ endpoint to process audio."}

@app.post("/process/", tags=["Audio Processing"])
async def process_audio_endpoint(
    file: UploadFile = File(..., description="Audio file to be processed (wav, mp3, flac)"),
    denoise_strength: float = Form(0.5, ge=0.0, le=1.0, description="Denoising strength (0.0 to 1.0)"),
    output_format: str = Form("wav", description=f"Desired output format. Supported: {', '.join(SUPPORTED_AUDIO_FORMATS)}"),
    eq_bands_json: Optional[str] = Form(None, description='JSON string of EQ bands. E.g., \'[{"freq": 1000, "gain": 3, "q": 1.0}]\''),
    apply_normalization: bool = Form(False, description="Apply loudness normalization (EBU R128 to -23 LUFS)"),
    request_waveform: bool = Form(False, description="Return waveform data for original and processed audio")
):
    """
    Processes an audio file with options for denoising, equalization, normalization,
    and returns the processed audio. Optionally includes waveform data.
    """
    audio_data, sample_rate, error = await load_audio_from_uploadfile(file)

    if error:
        raise HTTPException(status_code=400, detail=error)
    if audio_data is None or sample_rate is None:
        raise HTTPException(status_code=500, detail="Failed to load audio data.")

    original_waveform_data = None
    if request_waveform:
        original_waveform_data = generate_waveform_data(audio_data, sample_rate)

    # Start with original audio data for processing
    processed_data = audio_data.copy() # Make a copy for processing

    # Determine number of channels from the loaded audio_data
    if processed_data.ndim == 1:
        num_channels = 1
    elif processed_data.ndim == 2:
        num_channels = processed_data.shape[1]
    else:
        # This case should ideally not be reached if sf.read(always_2d=False) works as expected
        raise HTTPException(status_code=500, detail="Unsupported audio data shape after loading.")

    # Store original channel count for potential reconstruction if denoising alters it
    original_num_channels = num_channels

    # 1. Denoising (if strength > 0)
    if denoise_strength > 0.0: # Only apply if strength is meaningful
        processed_data = denoise_audio(processed_data, sample_rate, strength=denoise_strength)
        # denoise_audio might change channel count (e.g. stereo to mono).
        # Update num_channels based on the output of denoise_audio for subsequent steps.
        if processed_data.ndim == 1:
            num_channels = 1
        elif processed_data.ndim == 2:
            num_channels = processed_data.shape[1]


    # 2. Equalization
    # Apply EQ using the current number of channels of processed_data
    if eq_bands_json:
        try:
            eq_bands: List[Dict[str, Any]] = json.loads(eq_bands_json)
            if eq_bands: # Only apply if there are bands defined
                # Pass the current num_channels of processed_data to apply_equalizer
                processed_data = apply_equalizer(processed_data, sample_rate, eq_bands, channels=num_channels)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format for EQ bands.")
        except Exception as e: # Catch errors from apply_equalizer
            raise HTTPException(status_code=500, detail=f"Error applying equalizer: {str(e)}")


    # 3. Normalization
    if apply_normalization:
        try:
            processed_data = normalize_audio_loudness(processed_data, sample_rate)
        except Exception as e: # Catch errors from normalize_audio_loudness
            raise HTTPException(status_code=500, detail=f"Error applying normalization: {str(e)}")


    # Validate output_format
    requested_format = output_format.lower()
    if requested_format not in SUPPORTED_AUDIO_FORMATS:
        raise HTTPException(status_code=400, detail=f"Unsupported output format: {requested_format}. Supported formats are: {', '.join(SUPPORTED_AUDIO_FORMATS)}")

    original_filename = "audio"
    if file.filename:
        original_filename = file.filename.rsplit('.', 1)[0]
    output_filename = f"processed_{original_filename}.{requested_format}"

    # Prepare response
    if request_waveform:
        processed_waveform_data = generate_waveform_data(processed_data, sample_rate)

        audio_buffer = save_audio_to_bytesio(processed_data, sample_rate, format=requested_format)
        audio_b64 = base64.b64encode(audio_buffer.getvalue()).decode('utf-8')
        audio_buffer.close()

        return JSONResponse(content={
            "message": "Audio processed successfully.",
            "audio_filename": output_filename,
            "audio_format": requested_format,
            "audio_b64": audio_b64,
            "original_waveform": original_waveform_data,
            "processed_waveform": processed_waveform_data,
            "denoise_strength_applied": denoise_strength,
            "eq_bands_applied": json.loads(eq_bands_json) if eq_bands_json else None,
            "normalization_applied": apply_normalization
        })
    else:
        audio_buffer = save_audio_to_bytesio(processed_data, sample_rate, format=requested_format)
        return StreamingResponse(
            audio_buffer,
            media_type=f"audio/{requested_format}",
            headers={"Content-Disposition": f"attachment; filename={output_filename}"}
        )

# Removed old demo endpoints: /emp/{emp_id}, /get-by-id, /get-by-skill, /add-job and Employee model.
# Removed unused query_df and related commented out code.