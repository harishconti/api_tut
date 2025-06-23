import librosa
import noisereduce as nr
import soundfile as sf
import numpy as np
from fastapi import UploadFile
import io

SUPPORTED_AUDIO_FORMATS = ["wav", "mp3", "flac"]

def denoise_audio(audio_data: np.ndarray, sample_rate: int, strength: float = 0.5) -> np.ndarray: # Default strength added
    """
    Denoises an audio signal using spectral gating.

    Args:
        audio_data (np.ndarray): The input audio signal.
        sample_rate (int): The sample rate of the audio signal.

    Returns:
        np.ndarray: The denoised audio signal.
    """
    # Perform noise reduction
    reduced_noise = nr.reduce_noise(y=audio_data, sr=sample_rate)
    # The prop_decrease parameter controls how much noise reduction is applied.
    # It's a value between 0 and 1. Higher values mean more noise reduction.
    # We can map our strength parameter (e.g., 0-100 or 0.0-1.0) to this.
    # For now, let's assume strength is 0.0 to 1.0, and use it directly for prop_decrease.
    # A lower prop_decrease means less aggressive noise reduction.
    # Default for noisereduce is 1.0
    return nr.reduce_noise(y=audio_data, sr=sample_rate, prop_decrease=strength)

async def load_audio_from_uploadfile(file: UploadFile) -> tuple[np.ndarray | None, int | None, str | None]:
    """
    Loads audio data from an UploadFile object.

    Args:
        file (UploadFile): The uploaded audio file.

    Returns:
        tuple[np.ndarray | None, int | None, str | None]: A tuple containing:
            - audio_data (np.ndarray): The audio data as a NumPy array, or None if loading fails.
            - sample_rate (int): The sample rate of the audio, or None if loading fails.
            - error (str): An error message if loading fails, otherwise None.
    """
    if not file.filename:
        return None, None, "File has no name."

    file_extension = file.filename.split(".")[-1].lower()
    if file_extension not in SUPPORTED_AUDIO_FORMATS:
        return None, None, f"Unsupported audio format: {file_extension}. Supported formats are: {', '.join(SUPPORTED_AUDIO_FORMATS)}"

    try:
        contents = await file.read()
        audio_data, sample_rate = sf.read(io.BytesIO(contents))
        # Ensure audio is mono for simplicity with noisereduce
        if audio_data.ndim > 1:
            audio_data = librosa.to_mono(audio_data.T) # Transpose if multi-channel from soundfile
        return audio_data, sample_rate, None
    except Exception as e:
        return None, None, f"Error loading audio file: {str(e)}"

def save_audio_to_bytesio(audio_data: np.ndarray, sample_rate: int, format: str = "wav") -> io.BytesIO:
    """
    Saves denoised audio data to a BytesIO object.

    Args:
        audio_data (np.ndarray): The denoised audio data.
        sample_rate (int): The sample rate of the audio.
        format (str): The desired output audio format (default is "wav").

    Returns:
        io.BytesIO: A BytesIO object containing the audio data.
    """
    buffer = io.BytesIO()
    sf.write(buffer, audio_data, sample_rate, format=format)
    buffer.seek(0)
    return buffer
