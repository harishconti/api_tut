# Audio Processing API

This project provides a FastAPI backend and a React frontend for processing audio files. Initially focused on denoising, it's being expanded to include more audio manipulation features.

## Current Features

*   **Audio Denoising**: Upload an audio file (WAV, MP3, FLAC) to remove background noise.
    *   **Adjustable Denoising Strength**: Users can control the aggressiveness of the noise removal via a slider on the frontend (0.0 for no reduction, 1.0 for maximum).
*   **Format Conversion**: Users can choose the output format for the processed file (WAV, MP3, FLAC).

## API

The backend is built with FastAPI.

### Main Processing Endpoint

*   **Endpoint**: `POST /process/`
*   **Description**: Accepts an audio file and processing parameters, then returns the processed audio.
*   **Request Body**: `multipart/form-data`
    *   `file`: The audio file (types: `audio/wav`, `audio/mpeg`, `audio/flac`).
    *   `denoise_strength` (optional, float, default: `0.5`): Controls the denoising aggressiveness. Ranges from `0.0` (no effect) to `1.0` (maximum effect).
    *   `output_format` (optional, string, default: `wav`): Desired output audio format. Supported: `wav`, `mp3`, `flac`.
*   **Response**:
    *   Success (200 OK): The processed audio file as a stream, with `Content-Type` set to the appropriate audio format and `Content-Disposition` suggesting a filename like `processed_{original_filename}.{output_format}`.
    *   Error (400 Bad Request): If parameters are invalid (e.g., unsupported format, invalid strength).
    *   Error (422 Unprocessable Entity): If the file is missing or of an invalid type for FastAPI's `UploadFile`.

### Example Usage (using cURL)

```bash
curl -X POST -F "file=@/path/to/your/audio.wav" \
     -F "denoise_strength=0.7" \
     -F "output_format=mp3" \
     http://localhost:8000/process/ -o processed_audio.mp3
```

## Frontend

The frontend is a React application allowing users to:
1.  Upload an audio file.
2.  Adjust the denoising strength using a slider.
3.  Select the desired output audio format.
4.  Process the audio.
5.  Play back the processed audio.
6.  Download the processed audio.

## Setup and Running

### Backend

1.  Navigate to the `backend` directory: `cd backend`
2.  Install dependencies: `pip install -r requirements.txt`
3.  Run the FastAPI server: `uvicorn fastapi_main:app --reload`
    (The server will typically run on `http://localhost:8000`)

### Frontend

1.  Navigate to the `frontend/react-app` directory: `cd frontend/react-app`
2.  Install dependencies: `npm install`
3.  Start the React development server: `npm start`
    (The frontend will typically run on `http://localhost:3000` and proxy API requests to the backend.)

## Future Enhancements (Planned)

*   **Audio Equalizer**: Add a multi-band equalizer.
*   **Audio Normalization**: Adjust audio to a standard peak or average loudness.
*   **Waveform Visualization**: Display waveforms before and after processing.
We will try Using Fast API and other API with Python
