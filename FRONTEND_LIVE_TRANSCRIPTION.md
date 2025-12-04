# Live Transcription Display - Frontend Implementation Guide

This guide shows how to implement live transcription display with word-level highlighting synchronized with audio playback.

## Backend Endpoints

### 1. Regular Transcript (Complete)
```
GET /testimonies/:id/transcript
```
Returns the complete transcript after processing is done.

### 2. Streaming Transcript (Live)
```
GET /testimonies/:id/transcript/stream
```
Returns Server-Sent Events (SSE) stream with segments as they're generated.

## Frontend Implementation

### React/TypeScript Example

```typescript
import { useEffect, useState, useRef } from 'react';

interface TranscriptSegment {
  type: 'start' | 'segment' | 'complete' | 'error';
  text?: string;
  start?: number;
  end?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  language?: string;
  duration?: number;
  message?: string;
}

interface LiveTranscriptProps {
  testimonyId: number;
  audioElement: HTMLAudioElement | HTMLVideoElement;
}

export function LiveTranscript({ testimonyId, audioElement }: LiveTranscriptProps) {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Track audio playback time for word highlighting
  useEffect(() => {
    const updateTime = () => setCurrentTime(audioElement.currentTime);
    audioElement.addEventListener('timeupdate', updateTime);
    return () => audioElement.removeEventListener('timeupdate', updateTime);
  }, [audioElement]);

  // Connect to SSE stream
  useEffect(() => {
    const eventSource = new EventSource(
      `/api/testimonies/${testimonyId}/transcript/stream`
    );

    eventSource.onmessage = (event) => {
      const data: TranscriptSegment = JSON.parse(event.data);

      if (data.type === 'start') {
        console.log('Transcription started', data);
        setSegments([]);
      } else if (data.type === 'segment') {
        setSegments((prev) => [...prev, data]);
      } else if (data.type === 'complete') {
        console.log('Transcription complete');
        eventSource.close();
      } else if (data.type === 'error') {
        console.error('Transcription error:', data.message);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      console.error('SSE connection error');
      eventSource.close();
    };

    eventSourceRef.current = eventSource;

    return () => {
      eventSource.close();
    };
  }, [testimonyId]);

  // Render transcript with word-level highlighting
  const renderWord = (word: string, start: number, end: number) => {
    const isActive = currentTime >= start && currentTime < end;
    return (
      <span
        key={`${start}-${end}`}
        className={isActive ? 'font-bold text-blue-600' : 'text-gray-700'}
        style={{
          fontWeight: isActive ? 'bold' : 'normal',
          backgroundColor: isActive ? '#E3F2FD' : 'transparent',
          transition: 'all 0.2s ease',
        }}
      >
        {word}{' '}
      </span>
    );
  };

  return (
    <div className="transcript-container p-4 max-h-96 overflow-y-auto">
      {segments.map((segment, index) => (
        <div key={index} className="mb-2">
          {segment.words && segment.words.length > 0 ? (
            // Word-level highlighting (best UX)
            <p>
              {segment.words.map((word, wordIndex) =>
                renderWord(word.word, word.start, word.end)
              )}
            </p>
          ) : (
            // Fallback: segment-level highlighting
            <p
              className={
                currentTime >= (segment.start || 0) &&
                currentTime < (segment.end || Infinity)
                  ? 'font-bold text-blue-600'
                  : 'text-gray-700'
              }
            >
              {segment.text}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Vanilla JavaScript Example

```javascript
class LiveTranscript {
  constructor(testimonyId, audioElement) {
    this.testimonyId = testimonyId;
    this.audioElement = audioElement;
    this.segments = [];
    this.currentTime = 0;
    this.eventSource = null;
    
    this.init();
  }

  init() {
    // Track audio playback time
    this.audioElement.addEventListener('timeupdate', () => {
      this.currentTime = this.audioElement.currentTime;
      this.updateHighlighting();
    });

    // Connect to SSE stream
    this.eventSource = new EventSource(
      `/api/testimonies/${this.testimonyId}/transcript/stream`
    );

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'start') {
        this.segments = [];
        this.render();
      } else if (data.type === 'segment') {
        this.segments.push(data);
        this.render();
      } else if (data.type === 'complete') {
        this.eventSource.close();
      } else if (data.type === 'error') {
        console.error('Transcription error:', data.message);
        this.eventSource.close();
      }
    };

    this.eventSource.onerror = () => {
      console.error('SSE connection error');
      this.eventSource.close();
    };
  }

  updateHighlighting() {
    const words = document.querySelectorAll('.transcript-word');
    words.forEach((wordEl) => {
      const start = parseFloat(wordEl.dataset.start);
      const end = parseFloat(wordEl.dataset.end);
      const isActive = this.currentTime >= start && this.currentTime < end;

      if (isActive) {
        wordEl.classList.add('active');
        wordEl.style.fontWeight = 'bold';
        wordEl.style.backgroundColor = '#E3F2FD';
      } else {
        wordEl.classList.remove('active');
        wordEl.style.fontWeight = 'normal';
        wordEl.style.backgroundColor = 'transparent';
      }
    });
  }

  render() {
    const container = document.getElementById('transcript-container');
    container.innerHTML = '';

    this.segments.forEach((segment) => {
      const segmentDiv = document.createElement('div');
      segmentDiv.className = 'segment mb-2';

      if (segment.words && segment.words.length > 0) {
        // Word-level highlighting (best UX)
        segment.words.forEach((word) => {
          const wordSpan = document.createElement('span');
          wordSpan.className = 'transcript-word';
          wordSpan.textContent = word.word + ' ';
          wordSpan.dataset.start = word.start;
          wordSpan.dataset.end = word.end;
          segmentDiv.appendChild(wordSpan);
        });
      } else {
        // Fallback: segment-level
        const textSpan = document.createElement('span');
        textSpan.textContent = segment.text;
        textSpan.dataset.start = segment.start;
        textSpan.dataset.end = segment.end;
        segmentDiv.appendChild(textSpan);
      }

      container.appendChild(segmentDiv);
    });

    this.updateHighlighting();
  }

  destroy() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}

// Usage
const audio = document.getElementById('audio-player');
const transcript = new LiveTranscript(6, audio);
```

## CSS Styling

```css
.transcript-container {
  font-family: 'Inter', sans-serif;
  line-height: 1.8;
  font-size: 16px;
}

.transcript-word {
  transition: all 0.2s ease;
  padding: 2px 4px;
  border-radius: 3px;
}

.transcript-word.active {
  font-weight: bold;
  background-color: #E3F2FD;
  color: #1976D2;
}

.segment {
  margin-bottom: 8px;
}
```

## Features

✅ **Real-time updates** - Words appear as they're transcribed  
✅ **Word-level highlighting** - Bold/highlight words as they're spoken  
✅ **Audio sync** - Highlights match audio playback position  
✅ **Smooth transitions** - CSS transitions for better UX  
✅ **Kinyarwanda support** - Works with all Whisper-supported languages  

## Best Practices

1. **Word-level highlighting** provides the best UX (words bold as spoken)
2. **Smooth scrolling** - Auto-scroll to current word
3. **Loading state** - Show "Transcribing..." while waiting
4. **Error handling** - Display errors if transcription fails
5. **Reconnection** - Handle SSE connection drops gracefully

## API Response Format

### SSE Event Types

**Start Event:**
```json
{
  "type": "start",
  "language": "rw",
  "duration": 120.5
}
```

**Segment Event:**
```json
{
  "type": "segment",
  "text": "When the genocide happened",
  "start": 0.0,
  "end": 2.5,
  "words": [
    {"word": "When", "start": 0.0, "end": 0.3},
    {"word": "the", "start": 0.3, "end": 0.5},
    {"word": "genocide", "start": 0.5, "end": 1.2},
    {"word": "happened", "start": 1.2, "end": 2.5}
  ]
}
```

**Complete Event:**
```json
{
  "type": "complete"
}
```

**Error Event:**
```json
{
  "type": "error",
  "message": "Transcription failed"
}
```

