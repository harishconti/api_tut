# Audio Processing API

This project provides a FastAPI backend and a React frontend for processing audio files. Initially focused on denoising, it's being expanded to include more audio manipulation features.

## Current Features

*   **Audio Denoising**: Upload an audio file (WAV, MP3, FLAC) to remove background noise.
    *   **Adjustable Denoising Strength**: Ranges from `0.0` (no effect) to `1.0` (maximum effect).
*   **Audio Equalization**: Apply multi-band parametric equalization. Each band has center frequency, gain (dB), and Q-factor.
*   **Audio Normalization**: Normalize audio loudness to a target level (EBU R128, typically -23 LUFS).
*   **Format Conversion**: Convert processed audio to WAV, MP3, or FLAC.
*   **Waveform Data Generation**: Optionally retrieve waveform data (amplitude peaks) for the original and processed audio, suitable for visualization.

## API

The backend is built with FastAPI.

### Main Processing Endpoint

*   **Endpoint**: `POST /process/`
*   **Description**: Accepts an audio file and processing parameters, then returns the processed audio. If `request_waveform` is true, returns a JSON response containing the audio as base64, along with waveform data.
*   **Request Body**: `multipart/form-data`
    *   `file`: The audio file (types: `audio/wav`, `audio/mpeg`, `audio/flac`).
    *   `denoise_strength` (optional, float, default: `0.5`): Controls the denoising aggressiveness. Ranges from `0.0` (no effect) to `1.0` (maximum effect).
    *   `output_format` (optional, string, default: `wav`): Desired output audio format. Supported: `wav`, `mp3`, `flac`.
    *   `eq_bands_json` (optional, string, default: `null`): JSON string representing an array of EQ bands. Each band is an object: `{"freq": <number>, "gain": <number>, "q": <number>}`. Example: `'[{"freq": 100, "gain": -3, "q": 0.7}, {"freq": 1000, "gain": 2, "q": 1.4}]'`
    *   `apply_normalization` (optional, boolean, default: `False`): If true, applies loudness normalization to the audio.
    *   `request_waveform` (optional, boolean, default: `False`): If true, the response will be JSON containing base64 encoded audio and waveform data. Otherwise, the response is a direct audio file stream.
*   **Response**:
    *   If `request_waveform` is `False` (default):
        *   Success (200 OK): The processed audio file as a stream, with `Content-Type` set to the appropriate audio format and `Content-Disposition` suggesting a filename like `processed_{original_filename}.{output_format}`.
    *   If `request_waveform` is `True`:
        *   Success (200 OK): A JSON object with the following structure:
            ```json
            {
              "message": "Audio processed successfully.",
              "audio_filename": "processed_original.wav",
              "audio_format": "wav",
              "audio_b64": "<base64_encoded_audio_string>",
              "original_waveform": [<float_values>...],
              "processed_waveform": [<float_values>...],
              "denoise_strength_applied": 0.5,
              "eq_bands_applied": [{"freq": 100, "gain": -3, "q": 0.7}], // or null
              "normalization_applied": true
            }
            ```
    *   Error (400 Bad Request): If parameters are invalid (e.g., unsupported format, invalid strength, malformed `eq_bands_json`).
    *   Error (422 Unprocessable Entity): If the `file` is missing or of an invalid type for FastAPI's `UploadFile`.

### Example Usage (using cURL)

**1. Simple Denoising and Format Conversion (File Output):**
```bash
curl -X POST -F "file=@/path/to/your/audio.wav" \
     -F "denoise_strength=0.7" \
     -F "output_format=mp3" \
     http://localhost:8000/process/ -o processed_audio.mp3
```

**2. Complex Processing with EQ, Normalization, and Waveform Data (JSON Output):**
```bash
curl -X POST \
     -F "file=@/path/to/your/audio.flac" \
     -F "denoise_strength=0.3" \
     -F "output_format=wav" \
     -F "eq_bands_json='[{\"freq\": 80, \"gain\": 2.5, \"q\": 0.7}, {\"freq\": 1000, \"gain\": -1.5, \"q\": 1.2}]'" \
     -F "apply_normalization=True" \
     -F "request_waveform=True" \
     http://localhost:8000/process/ -o response.json
# The output 'response.json' will contain the base64 audio and waveform data.
```

## Frontend

The frontend is a React application allowing users to:
1.  Upload an audio file.
2.  Adjust the denoising strength using a slider.
3.  Select the desired output audio format.
4.  Process the audio.
5.  Play back the processed audio.
6.  Download the processed audio.

## Local Development Setup

This section guides you through setting up and running the project locally.

### Prerequisites

*   **Python**: Version 3.9 or newer.
*   **Node.js**: Version 14.x or newer (which includes npm).
*   **pip**: Python package installer (usually comes with Python).
*   **npm**: Node package manager (usually comes with Node.js).

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    ```
3.  **Activate the virtual environment:**
    *   On macOS and Linux:
        ```bash
        source venv/bin/activate
        ```
    *   On Windows:
        ```bash
        .\venv\Scripts\activate
        ```
4.  **Install Python dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
5.  **Run the FastAPI development server:**
    ```bash
    uvicorn fastapi_main:app --reload
    ```
    The backend API will typically be available at `http://localhost:8000`.

### Frontend Setup

1.  **Navigate to the frontend React app directory:**
    ```bash
    cd frontend/react-app
    ```
    (If you are already in the `backend` directory from the previous step, you might use `cd ../frontend/react-app`)

2.  **Install Node.js dependencies:**
    ```bash
    npm install
    ```
3.  **Start the React development server:**
    ```bash
    npm start
    ```
    The frontend application will typically be available at `http://localhost:3000`. It's configured to proxy API requests to the backend at `http://localhost:8000`.

## Future Enhancements (Planned)

*   **Audio Equalizer**: Add a multi-band equalizer.
*   **Audio Normalization**: Adjust audio to a standard peak or average loudness.
*   **Waveform Visualization**: Display waveforms before and after processing.
We will try Using Fast API and other API with Python
