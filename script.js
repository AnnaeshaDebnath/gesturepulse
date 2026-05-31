const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

const loadingOverlay = document.getElementById('loadingOverlay');
const gestureDisplay = document.getElementById('gestureDisplay');
const faceDisplay = document.getElementById('faceDisplay');
const fingerDisplay = document.getElementById('fingerDisplay');
const systemStatusBadge = document.getElementById('systemStatus');
const statusText = document.getElementById('statusText');

let fingerHistoryQueue = [];
const SMOOTHING_WINDOW_SIZE = 4; 

// Calibration parameters
let neutralWidthRatio = 0.56; 
let calibrationFramesCollected = 0;
const CALIBRATION_LIMIT = 30; 

function resizeCanvas() {
    canvasElement.width = window.innerWidth * window.devicePixelRatio;
    canvasElement.height = window.innerHeight * window.devicePixelRatio;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function getDistance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function processHandData(landmarks, handLabel, fingersOut, handStatesOut) {
    const tipIds = [4, 8, 12, 16, 20];
    let fingers = [];

    const thumbTip = landmarks[4];
    const thumbKnuckle = landmarks[2]; 
    const indexBase = landmarks[5];
    const thumbToIndexDist = getDistance(thumbTip, indexBase);

    // Verify thumb status across mirror boundaries
    let thumbIsExtended = false;
    if (handLabel === "Right Hand") {
        thumbIsExtended = (thumbTip.x > thumbKnuckle.x && thumbToIndexDist > 0.065);
    } else {
        thumbIsExtended = (thumbTip.x < thumbKnuckle.x && thumbToIndexDist > 0.065);
    }
    fingers.push(thumbIsExtended ? 1 : 0);

    // Process remaining 4 fingers
    for (let i = 1; i < 5; i++) {
        const tip = landmarks[tipIds[i]];
        const midJoint = landmarks[tipIds[i] - 1];
        const baseKnuckle = landmarks[tipIds[i] - 2];
        fingers.push((tip.y < midJoint.y && midJoint.y < baseKnuckle.y) ? 1 : 0);
    }

    const handFingersSum = fingers.reduce((a, b) => a + b, 0);
    fingersOut.count += handFingersSum;

    // --- 🤟 GESTURE: ROCKSTAR ---
    if (fingers[1] === 1 && fingers[4] === 1 && fingers[2] === 0 && fingers[3] === 0) {
        fingersOut.rockstar = true;
    }

    const wrist = landmarks[0];
    const otherFingersClosed = fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 0 && fingers[4] === 0;

    // --- 👍 GESTURE: THUMBS UP ---
    const thumbIsPointingUp = thumbTip.y < landmarks[3].y && thumbTip.y < wrist.y;
    if (thumbIsPointingUp && otherFingersClosed) {
        fingersOut.thumbsUp = true;
    }

    // --- 👎 GESTURE: THUMBS DOWN ---
    const thumbIsPointingDown = thumbTip.y > landmarks[3].y && thumbTip.y > wrist.y;
    if (thumbIsPointingDown && otherFingersClosed) {
        fingersOut.thumbsDown = true;
    }

    const matchesHeartHalf = (landmarks[8].y > landmarks[7].y) && 
                             (landmarks[12].y > landmarks[10].y) && 
                             (landmarks[16].y > landmarks[14].y) && 
                             (landmarks[20].y > landmarks[18].y);

    handStatesOut.push({ label: handLabel, heartProfile: matchesHeartHalf });

    const fingerSpread = Math.abs(landmarks[20].x - landmarks[8].x);
    const fourFingersUp = fingers[1] === 1 && fingers[2] === 1 && fingers[3] === 1 && fingers[4] === 1;
    const thumbIsTucked = thumbToIndexDist < 0.062;

    if (fourFingersUp && thumbIsTucked && fingerSpread < 0.08) {
        fingersOut.slap = true;
    }
}

function onResults(results) {
    if (loadingOverlay.style.opacity !== "0") {
        loadingOverlay.style.opacity = "0";
        setTimeout(() => loadingOverlay.style.display = "none", 500);
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    let fingersOut = { count: 0, slap: false, rockstar: false, thumbsUp: false, thumbsDown: false };
    let handStates = [];
    let totalHandsDetected = 0;
    let currentExpressionString = "Neutral";

    // --- A. ADAPTIVE EXPRESSION ENGINE ---
    if (results.faceLandmarks) {
        const mouthLeft = results.faceLandmarks[61];
        const mouthRight = results.faceLandmarks[291];
        const innerUpperLip = results.faceLandmarks[13];
        const innerLowerLip = results.faceLandmarks[14];
        
        const leftEyeOuter = results.faceLandmarks[33];
        const rightEyeOuter = results.faceLandmarks[263];

        const absoluteMouthWidth = getDistance(mouthLeft, mouthRight);
        const absoluteEyeDistance = getDistance(leftEyeOuter, rightEyeOuter);
        const verticalLipGap = getDistance(innerUpperLip, innerLowerLip);

        const currentStretchRatio = absoluteMouthWidth / (absoluteEyeDistance || 1);

        if (calibrationFramesCollected < CALIBRATION_LIMIT) {
            if (calibrationFramesCollected === 0) {
                neutralWidthRatio = currentStretchRatio;
            } else {
                neutralWidthRatio = (neutralWidthRatio * 0.95) + (currentStretchRatio * 0.05);
            }
            calibrationFramesCollected++;
            currentExpressionString = "Calibrating";
            faceDisplay.innerText = "Analyzing Rest Baseline... 🤔";
        } else {
            const stretchPercentageIncrease = (currentStretchRatio - neutralWidthRatio) / neutralWidthRatio;

            // --- 😗 POUT EXPRESSION DETECTION ---
            if (currentStretchRatio < (neutralWidthRatio * 0.82)) {
                currentExpressionString = "Pout";
                faceDisplay.innerText = "Pout 😗";
            }
            else if (verticalLipGap > 0.042) {
                currentExpressionString = "Excited";
                faceDisplay.innerText = "Excited 😮";
            } 
            else if (stretchPercentageIncrease > 0.11 || currentStretchRatio > 0.63) { 
                if (verticalLipGap > 0.015) {
                    currentExpressionString = "Happy";
                    faceDisplay.innerText = "Happy 😁";
                } else {
                    currentExpressionString = "Smile";
                    faceDisplay.innerText = "Smile 😊";
                }
            } 
            else {
                currentExpressionString = "Neutral";
                faceDisplay.innerText = "Neutral 😐";
            }
        }

        // --- ⬜ FIXED FACE OVERLAY BOUNDING BOX (THIN & WHITE) ⬜ ---
        let minX = 1, maxX = 0, minY = 1, maxY = 0;
        for (let i = 0; i < results.faceLandmarks.length; i++) {
            const lm = results.faceLandmarks[i];
            if (lm.x < minX) minX = lm.x;
            if (lm.x > maxX) maxX = lm.x;
            if (lm.y < minY) minY = lm.y;
            if (lm.y > maxY) maxY = lm.y;
        }

        const boxX = minX * canvasElement.width;
        const boxY = minY * canvasElement.height;
        const boxWidth = (maxX - minX) * canvasElement.width;
        const boxHeight = (maxY - minY) * canvasElement.height;

        const paddingFactor = 0.08;
        const padW = boxWidth * paddingFactor;
        const padH = boxHeight * paddingFactor;

        const finalX = boxX - padW;
        const finalY = boxY - padH * 1.5; 
        const finalWidth = boxWidth + padW * 2;
        const finalHeight = boxHeight + padH * 2.5;

        canvasCtx.lineWidth = 1.5;         // Set to match thin hand lines
        canvasCtx.strokeStyle = '#ffffff'; // Swapped to crisp pure white
        canvasCtx.shadowBlur = 4;
        canvasCtx.shadowColor = 'rgba(255, 255, 255, 0.3)'; 
        canvasCtx.strokeRect(finalX, finalY, finalWidth, finalHeight);
        canvasCtx.shadowBlur = 0; 

        // --- 🔍 UN-MIRRORED OVERLAY TEXT MATRIX ---
        canvasCtx.save();
        canvasCtx.translate(canvasElement.width - (finalX + finalWidth / 2), finalY - 16);
        canvasCtx.scale(-1, 1);

        canvasCtx.fillStyle = '#ffffff'; // White text background flag
        const textLabel = currentExpressionString.toUpperCase();
        canvasCtx.font = 'bold 18px Segoe UI, sans-serif';
        const textMetrics = canvasCtx.measureText(textLabel);
        const bgWidth = textMetrics.width + 20;

        canvasCtx.fillRect(-bgWidth / 2, -14, bgWidth, 28);
        
        canvasCtx.fillStyle = '#000000'; // Pure black nested text label
        canvasCtx.textAlign = "center";
        canvasCtx.textBaseline = "middle";
        canvasCtx.fillText(textLabel, 0, 1);
        canvasCtx.restore();

    } else {
        faceDisplay.innerText = "Face Out of View";
        calibrationFramesCollected = 0; 
    }

    // --- B. EVALUATE HANDS CONFIGURATIONS ---
    // Rendered as thin white lines (lineWidth: 1.5) with minimal red joint indicators
    if (results.leftHandLandmarks) {
        totalHandsDetected++;
        drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {color: '#ffffff', lineWidth: 1.5});
        drawLandmarks(canvasCtx, results.leftHandLandmarks, {color: '#ef4444', fillColor: '#ef4444', radius: 2.5});
        processHandData(results.leftHandLandmarks, "Left Hand", fingersOut, handStates);
    }

    if (results.rightHandLandmarks) {
        totalHandsDetected++;
        drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {color: '#ffffff', lineWidth: 1.5});
        drawLandmarks(canvasCtx, results.rightHandLandmarks, {color: '#ef4444', fillColor: '#ef4444', radius: 2.5});
        processHandData(results.rightHandLandmarks, "Right Hand", fingersOut, handStates);
    }

    // UI dashboard panel updates
    if (totalHandsDetected > 0) {
        systemStatusBadge.classList.add('tracking');
        statusText.innerText = `${totalHandsDetected} Hand(s) Active`;

        fingerHistoryQueue.push(fingersOut.count);
        if (fingerHistoryQueue.length > SMOOTHING_WINDOW_SIZE) {
            fingerHistoryQueue.shift();
        }
        const totalFingersCount = Math.round(fingerHistoryQueue.reduce((a, b) => a + b, 0) / fingerHistoryQueue.length);

        let unifiedGesture = "Tracking Active";

        if (handStates.length === 2) {
            if (handStates[0].heartProfile && handStates[1].heartProfile) {
                unifiedGesture = "🫶 Heart Gesture";
            }
        }

        if (unifiedGesture === "Tracking Active") {
            if (fingersOut.thumbsUp) {
                unifiedGesture = "👍 Thumbs Up";
            } else if (fingersOut.thumbsDown) {
                unifiedGesture = "👎 Thumbs Down";
            } else if (fingersOut.rockstar) {
                unifiedGesture = "🤟 Rockstar Sign";
            } else if (fingersOut.slap) {
                unifiedGesture = "✋ slap gesture";
            } else {
                if (totalFingersCount === 1) unifiedGesture = "☝️ Pointing / Thumb Sign";
                else if (totalFingersCount === 2) unifiedGesture = "✌️ Victory / Peace";
                else if (totalFingersCount === 3) unifiedGesture = "🤟 Rockstar Sign"; 
                else if (totalFingersCount === 4) unifiedGesture = "✋ Four-Finger Hand";
                else if (totalFingersCount === 5) unifiedGesture = "🖐️ Open Hand (Five)";
                else if (totalFingersCount === 10) unifiedGesture = "🙌 Both Hands Open";
                else if (totalFingersCount === 0) unifiedGesture = "✊ Fist";
            }
        }

        fingerDisplay.innerText = totalFingersCount;
        gestureDisplay.innerText = unifiedGesture;
    } else {
        fingerHistoryQueue = [];
        systemStatusBadge.classList.remove('tracking');
        statusText.innerText = "No Hands Active";
        gestureDisplay.innerText = "Bring Hand in View";
        fingerDisplay.innerText = "0";
    }

    canvasCtx.restore();
}

const holistic = new Holistic({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
});

holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.65,
    minTrackingConfidence: 0.65
});
holistic.onResults(onResults);

const cameraConfig = {
    onFrame: async () => {
        await holistic.send({image: videoElement});
    },
    width: { ideal: window.innerWidth > 768 ? 1920 : 1280 },
    height: { ideal: window.innerWidth > 768 ? 1080 : 720 }
};

const camera = new Camera(videoElement, cameraConfig);
camera.start().catch(err => {
    alert("Camera setup failed. Check interface hardware configurations.");
});