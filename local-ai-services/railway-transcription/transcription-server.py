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
COMPUTE_TYPE = os.getenv('WHISPER_COMPUTE_TYPE', 'int8')  

print(f"🤖 Loading Whisper model: {MODEL_NAME} (compute_type: {COMPUTE_TYPE})...")
try:
    model = WhisperModel(MODEL_NAME, device="cpu", compute_type=COMPUTE_TYPE)
    print("Model loaded successfully!")
except Exception as e:
    print(f"Failed to load model: {e}")
    sys.exit(1)


@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        data = request.json
        audio_url = data.get('audioUrl')
        if not audio_url:
            return jsonify({"error": "audioUrl required"}), 400

        # Optional: specify language (e.g., "rw" for Kinyarwanda, "en" for English)
        # If not specified, Whisper will auto-detect the language
        # Supported languages: https://github.com/openai/whisper/blob/main/whisper/tokenizer.py
        # Kinyarwanda is supported with language code "rw"
        language = data.get('language')  
        
        print(f"🎤 Transcribing audio from: {audio_url}")
        if language:
            print(f"🌍 Language specified: {language}")
        else:
            print(f"🌍 Language: auto-detect (Whisper supports 99 languages including Kinyarwanda 'rw')")

        # Download audio file
        try:
            response = requests.get(audio_url, stream=True, timeout=60)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"Failed to download audio: {e}")
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
            suffix = '.mp3'  

        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            for chunk in response.iter_content(chunk_size=8192):
                tmp_file.write(chunk)
            tmp_path = tmp_file.name

        try:
            # Transcribe
            # Whisper supports 99 languages including:
            # - Kinyarwanda (rw)
            # - English (en)
            # - French (fr)
            # - Swahili (sw)
            # - And 95+ more languages
            # If language is not specified, Whisper auto-detects it
            print("🔄 Processing audio...")
            transcribe_params = {"beam_size": 5}
            if language:
                transcribe_params["language"] = language
                print(f"   Using specified language: {language}")
            else:
                print(f"   Auto-detecting language (supports Kinyarwanda 'rw' and 98+ other languages)...")
            
            segments, info = model.transcribe(tmp_path, **transcribe_params)

            text_parts = []
            segments_data = []
            for segment in segments:
                text_parts.append(segment.text.strip())
                # Store segment with timing for live display
                segments_data.append({
                    "text": segment.text.strip(),
                    "start": segment.start,
                    "end": segment.end,
                    "words": getattr(segment, 'words', []) if hasattr(segment, 'words') else []
                })

            text = " ".join(text_parts)

            print(f"✅ Transcription complete: {len(text)} characters, language: {info.language}")

            return jsonify({
                "text": text,
                "language": info.language,
                "duration": info.duration if hasattr(info, 'duration') else None,
                "segments": segments_data,  # Include segments with timing for live display
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


@app.route('/transcribe/stream', methods=['POST'])
def transcribe_stream():
    """
    Streaming transcription endpoint - sends segments as they're generated
    Uses Server-Sent Events (SSE) for real-time updates
    """
    from flask import Response, stream_with_context
    import json
    import time
    
    try:
        data = request.json
        audio_url = data.get('audioUrl')
        if not audio_url:
            return jsonify({"error": "audioUrl required"}), 400

        language = data.get('language')
        
        print(f"🎤 Streaming transcription from: {audio_url}")
        if language:
            print(f"🌍 Language specified: {language}")
        
        # Download audio file
        try:
            response = requests.get(audio_url, stream=True, timeout=60)
            response.raise_for_status()
        except requests.RequestException as e:
            return jsonify({"error": f"Failed to download audio: {str(e)}"}), 400

        # Determine file extension
        content_type = response.headers.get('Content-Type', '')
        if 'audio/mpeg' in content_type or audio_url.endswith('.mp3'):
            suffix = '.mp3'
        elif 'audio/wav' in content_type or audio_url.endswith('.wav'):
            suffix = '.wav'
        elif 'audio/mp4' in content_type or audio_url.endswith('.m4a'):
            suffix = '.m4a'
        else:
            suffix = '.mp3'

        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            for chunk in response.iter_content(chunk_size=8192):
                tmp_file.write(chunk)
            tmp_path = tmp_file.name

        def generate():
            try:
                transcribe_params = {"beam_size": 5}
                if language:
                    transcribe_params["language"] = language
                
                # Stream segments as they're generated
                segments, info = model.transcribe(tmp_path, **transcribe_params)
                
                # Send initial metadata
                yield f"data: {json.dumps({'type': 'start', 'language': info.language, 'duration': getattr(info, 'duration', None)})}\n\n"
                
                # Stream each segment as it's generated
                for segment in segments:
                    segment_data = {
                        "type": "segment",
                        "text": segment.text.strip(),
                        "start": segment.start,
                        "end": segment.end,
                        "words": []
                    }
                    
                    # Include word-level timing if available
                    if hasattr(segment, 'words') and segment.words:
                        segment_data["words"] = [
                            {
                                "word": word.word,
                                "start": word.start,
                                "end": word.end
                            }
                            for word in segment.words
                        ]
                    
                    yield f"data: {json.dumps(segment_data)}\n\n"
                    time.sleep(0.01)  # Small delay for smoother streaming
                
                # Send completion
                yield f"data: {json.dumps({'type': 'complete'})}\n\n"
                
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            finally:
                # Clean up temp file
                try:
                    os.unlink(tmp_path)
                except:
                    pass

        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',
                'Connection': 'keep-alive'
            }
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/', methods=['GET'])
def root():
    return jsonify({
        "status": "ok",
        "service": "transcription-server",
        "endpoints": {
            "health": "/health",
            "transcribe": "/transcribe (POST)",
            "transcribe/stream": "/transcribe/stream (POST) - SSE streaming",
        },
        "model": MODEL_NAME,
        "compute_type": COMPUTE_TYPE,
    })


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

