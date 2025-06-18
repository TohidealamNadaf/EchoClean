import librosa

def load_audio(file_path):
    audio, sr = librosa.load(file_path, sr=16000)
    return audio, sr
