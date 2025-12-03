#!/usr/bin/env python3
from flask import Flask, request, jsonify
from faster_whisper import WhisperModel
import requests
import os
import tempfile
import sys

app = Flask(__name__)

# Load model (downloads automatically on first run)
MODEL_NAME = os.getenv('WHISPER_MODEL', 'large-v3')
COMPUTE_TYPE = os.getenv('WHISPER_COMPUTE_TYPE', 'int8')  # int8 for CPU, float16 for GPU

print(f"🤖 Loading Whisper model: {MODEL_NAME} (compute_type: {COMPUTE_TYPE})...")
try:
    model = WhisperModel(MODEL_NAME, device="cpu", compute_type=COMPUTE_TYPE)
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    sys.exit(1)


@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        data = request.json
        audio_url = data.get('audioUrl')
        if not audio_url:
            return jsonify({"error": "audioUrl required"}), 400

        print(f"🎤 Transcribing audio from: {audio_url}")

        # Download audio file
        try:
            response = requests.get(audio_url, stream=True, timeout=60)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"❌ Failed to download audio: {e}")
            return jsonify({"error": f"Failed to download audio: {str(e)}"}), 400

        # Determine file extension from URL or Content-Type
        content_type = response.headers.get('Content-Type', '')
        if 'audio/mpeg' in content_type or audio_url.endswith('.mp3'):
            suffix = '.mp3'
        elif 'audio/wav' in content_type or audio_url.endswith('.wav'):
            suffix = '.wav'
        elif 'audio/mp4' in content_type or audio_url.endswith('.m4a'):
            suffix = '.m4a'
        else:
            suffix = '.mp3'  # Default

        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            for chunk in response.iter_content(chunk_size=8192):
                tmp_file.write(chunk)
            tmp_path = tmp_file.name

        try:
            # Transcribe
            print("🔄 Processing audio...")
            segments, info = model.transcribe(tmp_path, beam_size=5)

            text_parts = []
            for segment in segments:
                text_parts.append(segment.text.strip())

            text = " ".join(text_parts)

            print(f"✅ Transcription complete: {len(text)} characters, language: {info.language}")

            return jsonify({
                "text": text,
                "language": info.language,
                "duration": info.duration if hasattr(info, 'duration') else None,
            })
        except Exception as e:
            print(f"❌ Transcription error: {str(e)}")
            return jsonify({"error": f"Transcription failed: {str(e)}"}), 500
        finally:
            # Clean up temp file
            try:
                os.unlink(tmp_path)
            except:
                pass

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "service": "transcription-server",
        "model": MODEL_NAME,
        "compute_type": COMPUTE_TYPE,
    })


if __name__ == '__main__':
    PORT = int(os.getenv('PORT', 8084))
    print(f"🚀 Starting transcription server on port {PORT}...")
    print(f"   Model: {MODEL_NAME}")
    print(f"   Test: curl http://localhost:{PORT}/health")
    app.run(host='0.0.0.0', port=PORT, debug=False)

