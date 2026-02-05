#!/usr/bin/env python3
from flask import Flask, request, jsonify
from faster_whisper import WhisperModel
import requests
import os
import tempfile
import sys
import numpy as np

app = Flask(__name__)

# Load model (downloads automatically on first run)
# large-v3-turbo is faster and more accurate than large-v3
MODEL_NAME = os.getenv('WHISPER_MODEL', 'large-v3')
COMPUTE_TYPE = os.getenv('WHISPER_COMPUTE_TYPE', 'int8')  # int8 for CPU, float16 for GPU

print(f"🤖 Loading Whisper model: {MODEL_NAME} (compute_type: {COMPUTE_TYPE})...")
print(f"   💡 Tip: For better accuracy and speed, use 'large-v3-turbo' or 'large-v3'")
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

        # Optional: specify language (e.g., "rw" for Kinyarwanda, "en" for English)
        # If not specified, Whisper will auto-detect the language
        # Supported languages: https://github.com/openai/whisper/blob/main/whisper/tokenizer.py
        # Kinyarwanda is supported with language code "rw"
        language = data.get('language')  # Optional: "rw", "en", "fr", etc.
        
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
            # Enhanced Transcription Parameters for Maximum Accuracy
            # Whisper supports 99 languages including:
            # - Kinyarwanda (rw)
            # - English (en)
            # - French (fr)
            # - Swahili (sw)
            # - And 95+ more languages
            # If language is not specified, Whisper auto-detects it
            print("🔄 Processing audio with enhanced parameters...")

            # Advanced transcription parameters for better accuracy
            transcribe_params = {
                "beam_size": 5,  # Higher = more accurate but slower (default 5, can go up to 10)
                "best_of": 5,  # Number of candidates to consider (higher = better quality)
                "patience": 1.0,  # Beam search patience factor
                "temperature": [0.0, 0.2, 0.4, 0.6, 0.8, 1.0],  # Try multiple temperatures for best results
                "compression_ratio_threshold": 2.4,  # Filter out low-quality segments
                "log_prob_threshold": -1.0,  # Filter segments with low confidence
                "no_speech_threshold": 0.6,  # Detect silence/non-speech segments
                "condition_on_previous_text": True,  # Use context from previous segments
                "word_timestamps": True,  # Enable word-level timestamps for better accuracy
                "vad_filter": True,  # Voice Activity Detection - removes silence/noise
                "vad_parameters": {
                    "threshold": 0.5,  # Sensitivity of VAD (0.5 = balanced)
                    "min_speech_duration_ms": 250,  # Minimum speech segment duration
                    "max_speech_duration_s": 30,  # Maximum segment duration
                    "min_silence_duration_ms": 2000,  # Minimum silence to split segments
                    "speech_pad_ms": 400,  # Padding around speech segments
                },
            }

            if language:
                transcribe_params["language"] = language
                print(f"   Using specified language: {language}")
            else:
                print(f"   Auto-detecting language (supports Kinyarwanda 'rw' and 98+ other languages)...")

            segments, info = model.transcribe(tmp_path, **transcribe_params)

            text_parts = []
            segments_data = []
            total_confidence = 0
            segment_count = 0
            low_confidence_segments = []

            for segment in segments:
                # Calculate segment confidence if available
                segment_confidence = None
                if hasattr(segment, 'avg_logprob'):
                    # Convert log probability to percentage confidence
                    segment_confidence = min(100, max(0, (1 + segment.avg_logprob) * 100))
                    total_confidence += segment_confidence
                    segment_count += 1

                    # Track low-confidence segments for quality warnings
                    if segment_confidence < 70:
                        low_confidence_segments.append({
                            "text": segment.text.strip(),
                            "confidence": round(segment_confidence, 1),
                            "start": segment.start,
                            "end": segment.end
                        })

                text_parts.append(segment.text.strip())

                # Enhanced segment data with word-level timestamps
                segment_data = {
                    "text": segment.text.strip(),
                    "start": segment.start,
                    "end": segment.end,
                    "confidence": round(segment_confidence, 1) if segment_confidence else None,
                    "words": []
                }

                # Add word-level timestamps with confidence
                if hasattr(segment, 'words') and segment.words:
                    for word in segment.words:
                        word_data = {
                            "word": word.word,
                            "start": word.start,
                            "end": word.end,
                        }
                        # Add word confidence if available
                        if hasattr(word, 'probability'):
                            word_data["confidence"] = round(word.probability * 100, 1)
                        segment_data["words"].append(word_data)

                segments_data.append(segment_data)

            text = " ".join(text_parts)

            # Calculate overall confidence
            avg_confidence = (total_confidence / segment_count) if segment_count > 0 else None

            print(f"✅ Transcription complete: {len(text)} characters, language: {info.language}")
            if avg_confidence:
                print(f"   📊 Average confidence: {avg_confidence:.1f}%")
            if low_confidence_segments:
                print(f"   ⚠️  {len(low_confidence_segments)} segments with confidence < 70%")

            response_data = {
                "text": text,
                "language": info.language,
                "duration": info.duration if hasattr(info, 'duration') else None,
                "segments": segments_data,
                "confidence": round(avg_confidence, 1) if avg_confidence else None,
                "lowConfidenceSegments": low_confidence_segments if low_confidence_segments else [],
                "metadata": {
                    "model": MODEL_NAME,
                    "segmentCount": len(segments_data),
                    "hasWordTimestamps": True,
                    "vadFilterApplied": True,
                }
            }

            return jsonify(response_data)
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

