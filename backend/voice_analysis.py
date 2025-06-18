from resemblyzer import VoiceEncoder, preprocess_wav
import numpy as np
from scipy.spatial.distance import cosine
import soundfile as sf
import tempfile
import os
from pydub import AudioSegment
AudioSegment.converter = "C:/ffmpeg/bin/ffmpeg.exe"

encoder = VoiceEncoder()

def convert_to_wav(original_path):
    """Converts .webm/.ogg/etc to a temporary .wav file using pydub."""
    try:
        audio = AudioSegment.from_file(original_path, format="webm")  # <-- explicit format
        tmp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        audio.export(tmp_wav.name, format="wav")
        return tmp_wav.name
    except Exception as e:
        print(f"Audio conversion failed: {e}")
        raise e

def extract_embedding(path):
    try:
        # Try direct preprocess
        return encoder.embed_utterance(preprocess_wav(path))
    except Exception as e:
        print(f"preprocess_wav failed on {path}: {e}")
        try:
            # Try conversion
            converted_path = convert_to_wav(path)
            return encoder.embed_utterance(preprocess_wav(converted_path))
        except Exception as conv_e:
            print(f"Conversion to wav also failed: {conv_e}")
            raise conv_e

def compare_voices(path1, path2):
    emb1 = extract_embedding(path1)
    emb2 = extract_embedding(path2)

    similarity = 1 - cosine(emb1, emb2)
    confidence = float(round(similarity * 100, 2))

    print(f"Similarity score: {similarity}, Confidence: {confidence}")

    if confidence >= 75:
        verdict = "✅ Likely Authentic"
    elif confidence >= 50:
        verdict = "⚠️ Possibly Manipulated"
    else:
        verdict = "🚨 Suspicious Voice – Possible Deepfake"

    return {"confidence": confidence, "verdict": verdict}
