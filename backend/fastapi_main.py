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
    # denoise_audio, # No longer called directly
    load_audio_from_uploadfile,
    save_audio_to_bytesio,
    # apply_equalizer, # No longer called directly
    # normalize_audio_loudness, # No longer called directly
    generate_waveform_data,
    process_audio_pipeline, # New main processing function
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
    request_waveform: bool = Form(False, description="Return waveform data for original and processed audio"),
    trim_silence: bool = Form(False, description="Automatically trim leading/trailing silence"),
    compressor_threshold: Optional[float] = Form(None, description="Compressor threshold in dBFS (e.g., -20.0)"),
    compressor_ratio: Optional[float] = Form(None, description="Compressor ratio (e.g., 4.0 for 4:1)"),
    compressor_attack: Optional[float] = Form(None, description="Compressor attack time in ms (e.g., 5.0)"),
    compressor_release: Optional[float] = Form(None, description="Compressor release time in ms (e.g., 50.0)"),
    reverb_room_size: Optional[float] = Form(None, description="Reverb room size (0.0 to 1.0)"),
    reverb_wet_dry_mix: Optional[float] = Form(None, description="Reverb wet/dry mix (0.0 for dry, 1.0 for wet)")
):
    """
    Processes an audio file with options for denoising, equalization, normalization,
    compression, reverb, silence trimming, and returns the processed audio.
    Optionally includes waveform data.
    """
    audio_data, sample_rate, error = await load_audio_from_uploadfile(file)

    if error:
        raise HTTPException(status_code=400, detail=error)
    if audio_data is None or sample_rate is None:
        raise HTTPException(status_code=500, detail="Failed to load audio data.")

    original_waveform_data = None
    if request_waveform:
        original_waveform_data = generate_waveform_data(audio_data, sample_rate)

    # Prepare parameters for the pipeline
    eq_bands_list: Optional[List[Dict[str, Any]]] = None
    if eq_bands_json:
        try:
            eq_bands_list = json.loads(eq_bands_json)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format for EQ bands.")

    compressor_settings: Optional[Dict[str, float]] = None
    if compressor_threshold is not None and \
       compressor_ratio is not None and \
       compressor_attack is not None and \
       compressor_release is not None:
        compressor_settings = {
            "threshold": compressor_threshold,
            "ratio": compressor_ratio,
            "attack": compressor_attack,
            "release": compressor_release
        }

    reverb_settings: Optional[Dict[str, float]] = None
    if reverb_room_size is not None and reverb_wet_dry_mix is not None:
        reverb_settings = {
            "room_size": reverb_room_size,
            "wet_dry_mix": reverb_wet_dry_mix
        }

    try:
        processed_data = process_audio_pipeline(
            audio_data=audio_data,
            sample_rate=sample_rate,
            denoise_strength_param=denoise_strength,
            eq_bands_param=eq_bands_list,
            apply_normalization_param=apply_normalization,
            trim_silence_param=trim_silence,
            compressor_params=compressor_settings,
            reverb_params=reverb_settings
        )
    except ValueError as ve: # Catch specific ValueErrors from pipeline (e.g. bad audio shape)
        raise HTTPException(status_code=400, detail=f"Audio processing error: {str(ve)}")
    except Exception as e: # Catch other generic errors from pipeline
        # Log the full error for debugging on the server
        print(f"Unhandled error in process_audio_pipeline: {e}") # Or use proper logging
        raise HTTPException(status_code=500, detail=f"Error during audio processing: {str(e)}")


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
            "eq_bands_applied": eq_bands_list if eq_bands_list else None, # Use parsed list
            "normalization_applied": apply_normalization,
            "trim_silence_applied": trim_silence,
            "compressor_settings_applied": compressor_settings,
            "reverb_settings_applied": reverb_settings
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