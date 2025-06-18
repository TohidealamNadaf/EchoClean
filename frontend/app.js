let mediaRecorder = null;
let recordedChunks = [];
let currentRecordingType = null; // 'known' or 'test'

async function startRecording(type) {
    const recordingStatusDiv = document.getElementById('recordingStatus');

    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        recordingStatusDiv.innerHTML = 'Stopping recording...';
        return;
    }

    currentRecordingType = type;
    recordedChunks = [];

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) recordedChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            if (recordedChunks.length === 0) {
                recordingStatusDiv.innerHTML = 'Recording failed: no audio captured.';
                return;
            }

            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            const file = new File([blob], `${currentRecordingType}_voice.webm`, { type: 'audio/webm' });
            const inputElement = currentRecordingType === 'known'
                ? document.getElementById('knownVoice')
                : document.getElementById('testVoice');

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            inputElement.files = dataTransfer.files;

            inputElement.dispatchEvent(new Event('change'));

            recordingStatusDiv.innerHTML = `Recording stopped. ${currentRecordingType === 'known' ? 'Known' : 'Test'} voice recorded and ready to analyze.`;
            console.log(`Recorded ${currentRecordingType} voice file assigned to input:`, file);
        };

        mediaRecorder.start();
        recordingStatusDiv.innerHTML = `Recording ${type} voice... Press record again to stop.`;

    } catch (err) {
        console.error("Error accessing microphone:", err);
        recordingStatusDiv.innerHTML = "Microphone access denied or error occurred.";
    }
}

let isAnalyzing = false;

async function analyzeVoice(event) {
    if (event) event.preventDefault();

    if (isAnalyzing) {
        console.log("Still analyzing, please wait.");
        return;
    }

    const analyzeButton = document.querySelector('button[onclick="analyzeVoice()"]');
    const knownVoiceInput = document.getElementById('knownVoice');
    const testVoiceInput = document.getElementById('testVoice');
    const resultDiv = document.getElementById('result');
    const recordingStatusDiv = document.getElementById('recordingStatus');

    // Do NOT clear resultDiv on start to avoid flickering result

    recordingStatusDiv.style.color = 'red';
    recordingStatusDiv.innerHTML = '';

    if (!knownVoiceInput.files.length || !testVoiceInput.files.length) {
        recordingStatusDiv.innerHTML = 'Please upload or record both voice samples.';
        return;
    }

    if (mediaRecorder && mediaRecorder.state === "recording") {
        recordingStatusDiv.innerHTML = 'Stop recording before analyzing.';
        return;
    }

    isAnalyzing = true;
    analyzeButton.disabled = true;
    recordingStatusDiv.style.color = 'blue';
    recordingStatusDiv.innerHTML = 'Analyzing... please wait.';

    const formData = new FormData();
    formData.append('knownVoice', knownVoiceInput.files[0]);
    formData.append('testVoice', testVoiceInput.files[0]);

    try {
        console.log('Sending analyze request');
        const response = await fetch('http://127.0.0.1:5000/analyze', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${errorText}`);
        }

        const result = await response.json();
        console.log('Analyze response received:', result);
        displayResult(result);

    } catch (error) {
        console.error('Error during analyze:', error);
        recordingStatusDiv.style.color = 'red';
        recordingStatusDiv.innerHTML = 'An error occurred while analyzing the voices.';
    } finally {
        isAnalyzing = false;
        analyzeButton.disabled = false;
        recordingStatusDiv.style.color = 'red';
    }
}

function displayResult(result) {
    const resultDiv = document.getElementById('result');
    console.log("Displaying result:", result);
    if (result.error) {
        resultDiv.innerHTML = `Error: ${result.error}`;
    } else {
        resultDiv.innerHTML = `<strong>Confidence:</strong> ${result.confidence.toFixed(2)}%<br><strong>Verdict:</strong> ${result.verdict}`;
    }
}
