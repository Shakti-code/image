// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const emotionName = document.getElementById('emotion-name');
const emotionConfidence = document.getElementById('emotion-confidence');
const emotionsList = document.getElementById('emotions-list');
const faceCount = document.getElementById('face-count');
const toggleBtn = document.getElementById('toggle-btn');
const loadingIndicator = document.getElementById('loading-indicator');

let isVideoRunning = false;
let detectingInterval = null;
let ctx = null;

// Emotion mapping with emoji and colors
const emotionMap = {
    neutral: { emoji: '😐', color: '#a0aec0' },
    happy: { emoji: '😊', color: '#90ee90' },
    sad: { emoji: '😢', color: '#87ceeb' },
    angry: { emoji: '😠', color: '#ff6b6b' },
    fearful: { emoji: '😨', color: '#daa520' },
    disgusted: { emoji: '🤢', color: '#98d8c8' },
    surprised: { emoji: '😲', color: '#ffd700' }
};

// Initialize emotions grid
function initEmotionsGrid() {
    emotionsList.innerHTML = '';
    Object.keys(emotionMap).forEach(emotion => {
        const div = document.createElement('div');
        div.className = 'emotion-item';
        div.id = `emotion-${emotion}`;
        div.innerHTML = `
            <div class="emotion-name">${emotionMap[emotion].emoji} ${emotion}</div>
            <div class="emotion-bar">
                <div class="emotion-bar-fill" style="background: ${emotionMap[emotion].color}"></div>
            </div>
            <div class="emotion-value">0%</div>
        `;
        emotionsList.appendChild(div);
    });
}

// Load face-api models
async function loadModels() {
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
    
    try {
        console.log('Loading models...');
        await Promise.all([
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceDetectionNet.loadFromUri(MODEL_URL)
        ]);
        console.log('Models loaded successfully!');
        loadingIndicator.style.display = 'none';
        toggleBtn.disabled = false;
    } catch (error) {
        console.error('Error loading models:', error);
        loadingIndicator.textContent = 'Error loading models';
    }
}

// Start webcam
async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
        });
        video.srcObject = stream;
        isVideoRunning = true;
        
        // Setup canvas
        ctx = canvas.getContext('2d');
        
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            startDetection();
        };
    } catch (error) {
        console.error('Error accessing webcam:', error);
        alert('Could not access webcam. Please check permissions.');
        isVideoRunning = false;
    }
}

// Stop webcam
function stopWebcam() {
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    isVideoRunning = false;
    if (detectingInterval) clearInterval(detectingInterval);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    emotionName.textContent = '--';
    emotionConfidence.textContent = '0%';
    faceCount.textContent = 'Faces Detected: 0';
    initEmotionsGrid();
}

// Detect emotions
async function detectEmotions() {
    if (!isVideoRunning) return;

    try {
        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update face count
        faceCount.textContent = `Faces Detected: ${detections.length}`;

        if (detections.length > 0) {
            // Focus on the first face
            const detection = detections[0];
            const expressions = detection.expressions;
            const box = detection.detection.box;

            // Find dominant emotion
            let maxEmotion = 'neutral';
            let maxValue = 0;
            
            Object.entries(expressions).forEach(([emotion, value]) => {
                if (value > maxValue) {
                    maxValue = value;
                    maxEmotion = emotion;
                }
            });

            // Update main emotion display
            emotionName.textContent = maxEmotion.toUpperCase();
            emotionConfidence.textContent = (maxValue * 100).toFixed(1) + '%';

            // Update all emotions
            Object.entries(expressions).forEach(([emotion, confidence]) => {
                const emotionItem = document.getElementById(`emotion-${emotion}`);
                if (emotionItem) {
                    const percentage = (confidence * 100).toFixed(1);
                    emotionItem.querySelector('.emotion-value').textContent = percentage + '%';
                    emotionItem.querySelector('.emotion-bar-fill').style.width = percentage + '%';
                    
                    if (emotion === maxEmotion) {
                        emotionItem.classList.add('active');
                    } else {
                        emotionItem.classList.remove('active');
                    }
                }
            });

            // Draw face box
            ctx.strokeStyle = emotionMap[maxEmotion].color;
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            // Draw emotion label
            const label = `${emotionMap[maxEmotion].emoji} ${maxEmotion.toUpperCase()} (${(maxValue * 100).toFixed(1)}%)`;
            ctx.fillStyle = emotionMap[maxEmotion].color;
            ctx.font = 'bold 18px Arial';
            ctx.fillText(label, box.x, box.y - 10);
        } else {
            emotionName.textContent = '--';
            emotionConfidence.textContent = '0%';
            initEmotionsGrid();
        }
    } catch (error) {
        console.error('Detection error:', error);
    }
}

// Start continuous detection
function startDetection() {
    if (detectingInterval) clearInterval(detectingInterval);
    detectingInterval = setInterval(detectEmotions, 100);
}

// Toggle button handler
toggleBtn.addEventListener('click', () => {
    if (isVideoRunning) {
        stopWebcam();
        toggleBtn.textContent = 'Start Camera';
        toggleBtn.classList.remove('active');
    } else {
        startWebcam();
        toggleBtn.textContent = 'Stop Camera';
        toggleBtn.classList.add('active');
    }
});

// Initialize on page load
window.addEventListener('load', async () => {
    initEmotionsGrid();
    toggleBtn.disabled = true;
    toggleBtn.textContent = 'Loading Models...';
    await loadModels();
    toggleBtn.textContent = 'Start Camera';
    toggleBtn.disabled = false;
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (isVideoRunning) stopWebcam();
});