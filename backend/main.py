# backend/main.py
from flask import Flask, request, jsonify
from voice_analysis import compare_voices
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.after_request
def add_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Content-Type"] = "application/json"
    return response

@app.route('/analyze', methods=['POST'])
def analyze_voice():
    try:
        known_voice = request.files['knownVoice']
        test_voice = request.files['testVoice']

        print(f"Received files: {known_voice.filename}, {test_voice.filename}")
        print(f"MIME types: {known_voice.mimetype}, {test_voice.mimetype}")

        # Validate MIME types
        ALLOWED_MIME_TYPES = ["audio/webm", "video/webm", "audio/wav", "audio/ogg"]

        if not (known_voice.mimetype.endswith("webm") or known_voice.mimetype.endswith("wav") or known_voice.mimetype.endswith("ogg")):
            raise ValueError("Unsupported file format")


        known_path = os.path.join(UPLOAD_FOLDER, 'known_voice.webm')
        test_path = os.path.join(UPLOAD_FOLDER, 'test_voice.webm')

        known_voice.save(known_path)
        test_voice.save(test_path)

        result = compare_voices(known_path, test_path)
        print("Result to return:", result)  # 🔍 Debug print

        return jsonify(result), 200

    except Exception as e:
        print(f"Error in /analyze: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
