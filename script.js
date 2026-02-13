// !!! CRITICAL: REPLACE THIS WITH YOUR ACTUAL LIVE RENDER API URL !!!
const RENDER_API_ENDPOINT = "https://the-deep-dive-api.onrender.com" + "/classify";
const FIREBASE_URL = "https://the-deep-dive-0-default-rtdb.firebaseio.com" + "/reflections.json";

// --- Global Variables for State Management ---
let state = 'QUESTION'; // Controls which question/screen is visible ('QUESTION', 'LOADING', 'RESULTS')
let currentQuestionIndex = 0;
let userResponses = [];
let aestheticResults = null;
let inputElement; // P5.js input element (the textbox)
let loadingAngle = 0; // For the spinner animation

// Archive for Mesh
let archiveData = [];
let meshParticles = [];

const QUESTIONS = [
    "you are walking into a cafe, what are you ordering?",
    "what are you wearing today?",
    "it is friday night, what are you most likely doing in this moment?",
    "pretend you are at your favorite restaurant. where are you, and what are you ordering?",
    "tell me about your favorite social media platform and talk about your favorite creator. if you don't like social media, tell me why or what else you consume."
];

function setup() {
    // Create the canvas to fill the entire window
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('app-container'); // Attach canvas to the main container
    
    // Set up text styles
    textSize(24);
    textAlign(CENTER, CENTER);
    textFont('serif');
    
    // Create the initial input box
    inputElement = createInput('');
    inputElement.size(500, 40);
    inputElement.style('font-size', '16px');
    inputElement.style('padding', '5px');
    inputElement.style('border', 'none');
    inputElement.style('background', 'rgba(100, 100, 100, 0.5)'); // Semi-transparent dark background
    inputElement.style('color', 'white');
    inputElement.style('outline', 'none');
    inputElement.style('z-index', '10'); // CRITICAL: Ensure input is above the canvas

    // Start the process by setting the state and position
    state = 'QUESTION';
    positionInput();

    // Initial fetch of the archive for the "moving mesh"
    fetchArchive();
}

function draw() {
    // 1. Draw the Background
    drawEtherealBackground();

    // 2. Draw the fixed text
    fill(255); // White text
    text("who are you?", width / 2, height / 2 - 200);
    text("The Deep Dive", width / 2, height - 50);

    // 3. Handle the current state (Question, Loading, or Results)
    switch (state) {
        case 'QUESTION':
            drawQuestionScreen();
            break;
        case 'LOADING':
            drawLoadingScreen();
            break;
        case 'RESULTS':
            drawPieChartScreen();
            break;
        case 'REFLECT':
            drawReflectionScreen();
            break;
        case 'ARCHIVE':
            drawArchiveMesh();
            break;
    }
}

// --- 1. THE PIE CHART (Results) ---
function drawPieChartScreen() {
    inputElement.position(-1000, -1000); 
    cursor(ARROW); // Keeps the mouse cursor as a normal pointer
    
    let centerX = width / 2;
    let centerY = height / 2;
    let diameter = 300; // Slightly smaller to give the UI more breathing room
    let lastAngle = 0;

    if (aestheticResults) {
        let results = Object.entries(aestheticResults);
        
        results.forEach(([label, percent], i) => {
            let angle = map(percent, 0, 100, 0, TWO_PI);
            
            // Slice Color
            fill(150, 180, 200 + (i * 10), 200);
            stroke(255, 50);
            arc(centerX, centerY, diameter, diameter, lastAngle, lastAngle + angle, PIE);

            // Hover Logic
            let mouseAngle = atan2(mouseY - centerY, mouseX - centerX);
            if (mouseAngle < 0) mouseAngle += TWO_PI;
            
            if (dist(mouseX, mouseY, centerX, centerY) < diameter/2 && 
                mouseAngle > lastAngle && mouseAngle < lastAngle + angle) {
                
                // Position text at a fixed point inside the slice (drop-down style)
                let midAngle = lastAngle + angle / 2;
                let textOffset = diameter * 0.3; // Distance from center
                let tx = centerX + cos(midAngle) * textOffset;
                let ty = centerY + sin(midAngle) * textOffset;

                noStroke();
                fill(255);
                textSize(14); // Smaller text for a cleaner look
                textAlign(CENTER, CENTER);
                text(`${label.toUpperCase()}\n${percent}%`, tx, ty);
            }
            lastAngle += angle;
        });
    }

    // Repositioned instruction text to avoid overlap with "The Deep Dive"
    fill(255, 180);
    textSize(16);
    textAlign(CENTER, CENTER);
    text("click anywhere to continue", width / 2, height / 2 + 220);
}

// --- THE CLICK HANDLER ---
function mousePressed() {
    // If the user is on the Results screen, clicking moves them to Reflection
    if (state === 'RESULTS') {
        state = 'REFLECT';
    }
}

// --- 2. THE REFLECTION ("That's you, right?") ---
function drawReflectionScreen() {
    positionInput();
    fill(255);
    textSize(24);
    text("that's you, right?", width / 2, height / 2 - 80);
    textSize(14);
    text("Type your reflection and press ENTER to archive your identity", width / 2, height / 2 + 80);
}

// --- 3. THE MOVING MESH ---
function drawArchiveMesh() {
    inputElement.position(-1000, -1000);
    
    meshParticles.forEach(p => {
        p.update();
        p.display();
    });

    fill(255, 200);
    textSize(32);
    text("The Collective Archive", width / 2, 100);
}

// --- Firebase & Logic ---
async function fetchArchive() {
    try {
        let response = await fetch(FIREBASE_URL);
        let data = await response.json();
        if (data) {
            archiveData = Object.values(data).map(obj => obj.reflection);
            // Create particles for each archived reflection
            meshParticles = archiveData.map(txt => new Particle(txt));
        }
    } catch (e) { console.error("Archive fetch failed", e); }
}

async function saveToFirebase(reflection) {
    const payload = {
        reflection: reflection,
        timestamp: Date.now(),
        top_aesthetic: Object.keys(aestheticResults)[0]
    };
    
    try {
        await fetch(FIREBASE_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        
        // Refresh the local data so your new response appears in the mesh
        await fetchArchive(); 
        
        // Move to the final "Archive Mesh" screen
        state = 'ARCHIVE'; 
    } catch (e) { 
        console.error("Firebase save failed", e); 
    }
}

// Function to handle the transition to the next step when ENTER is pressed
function keyPressed() {
    // 1. Logic for the Quiz Phase
    if (keyCode === ENTER && state === 'QUESTION') {
        processAnswer();
    } 
    
    // 2. Logic for the Reflection Phase (NEW)
    else if (keyCode === ENTER && state === 'REFLECT') {
        const reflection = inputElement.value();
        if (reflection.trim() !== '') {
            // Send to database
            saveToFirebase(reflection);
            
            // Clean up UI for the final mesh
            inputElement.value('');
            inputElement.position(-1000, -1000); 
        }
    }
}

// Particle class for the "Moving Mesh"
class Particle {
    constructor(txt) {
        this.txt = txt;
        this.pos = createVector(random(width), random(height));
        this.vel = createVector(random(-0.5, 0.5), random(-0.5, 0.5));
        this.noiseSeed = random(1000);
    }
    update() {
        this.pos.add(this.vel);
        if (this.pos.x < 0 || this.pos.x > width) this.vel.x *= -1;
        if (this.pos.y < 0 || this.pos.y > height) this.vel.y *= -1;
    }
    display() {
        fill(255, 120);
        textSize(12);
        text(this.txt, this.pos.x, this.pos.y);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    positionInput();
}

// Helper to center the input box
function positionInput() {
    // closer to the question text
    inputElement.position(width / 2 - inputElement.width / 2, height / 2 + 10);
}

// --- Drawing the Background (Ethereal Visuals) ---
function drawEtherealBackground() {
    let c1 = color(220, 220, 230, 200);
    background(c1);
    
    // Add dynamic noise/lines to mimic the fractal/streaks
    noStroke();
    for (let i = 0; i < 100; i++) {
        fill(255, 255, 255, 10);
        ellipse(
            noise(i * 0.1, frameCount * 0.005) * width, 
            noise(i * 0.2, frameCount * 0.007) * height, 
            map(i, 0, 100, 50, 300)
        );
    }
}


// --- Drawing the Question Screen ---
function drawQuestionScreen() {
    positionInput();
    // Ensure input stays positioned near the question
    // Use the canvas 2D context shadow properties for a soft, blurred shadow
    // Save/restore drawing context around shadow changes so other elements aren't affected

    // Question text (larger)
    textSize(16);
    if (drawingContext && drawingContext.save) drawingContext.save();
    // Soft black shadow behind white text
    drawingContext.shadowColor = 'rgba(0,0,0,0.6)';
    drawingContext.shadowBlur = 12;
    drawingContext.shadowOffsetX = 0;
    drawingContext.shadowOffsetY = 0;

    fill(255); // White text
    text(QUESTIONS[currentQuestionIndex], width / 2, height / 2 - 50);

    // Restore drawing context so subsequent drawings are not blurred
    if (drawingContext && drawingContext.restore) drawingContext.restore();

    // Instruction text (smaller) — use a slightly smaller shadow blur
    textSize(16);
    if (drawingContext && drawingContext.save) drawingContext.save();
    drawingContext.shadowColor = 'rgba(0,0,0,0.6)';
    drawingContext.shadowBlur = 8;
    drawingContext.shadowOffsetX = 0;
    drawingContext.shadowOffsetY = 0;

    fill(255);
    text("Press ENTER to submit", width / 2, height / 2 + 100);

    if (drawingContext && drawingContext.restore) drawingContext.restore();
}


// --- Drawing the Loading Screen ---
function drawLoadingScreen() {
    // Hide the input box by moving it off-screen
    inputElement.position(-1000, -1000); 
    
    fill(255);
    textSize(30);
    text("you are....", width / 2, height / 2 - 50);
    
    // Draw the spinning circle loader
    push();
    translate(width / 2, height / 2);
    stroke(255);
    strokeWeight(3);
    noFill();
    
    for (let i = 0; i < 8; i++) {
        let angle = loadingAngle + (i * PI / 4);
        let x = cos(angle) * 15;
        let y = sin(angle) * 15;
        
        let alpha = map(sin(loadingAngle + i * PI / 4), -1, 1, 100, 255);
        fill(255, alpha);
        ellipse(x, y, 6, 6);
    }
    
    loadingAngle += 0.1; // Speed of rotation
    pop();
}


// --- Drawing the Results Screen ---
function drawResultsScreen() {
    // Hide the input box by moving it off-screen
    inputElement.position(-1000, -1000); 
    
    fill(255);
    textSize(30);
    text("you are....", width / 2, height / 2 - 100);
    
    if (aestheticResults) {
        textSize(24);
        let resultString = '';
        
        // Build the result string (e.g., "20% clean girl, 40% Y2K...")
        Object.entries(aestheticResults).forEach(([aesthetic, percentage], index) => {
            if (index > 0) resultString += ', ';
            resultString += `${percentage}% ${aesthetic.toUpperCase()}`;
        });
        
        // Draw the result string
        text(resultString, width / 2, height / 2);
    }
}

// --- Logic for moving between states ---
function processAnswer() {
    const answer = inputElement.value();
    if (answer.trim() === '') return; // Don't submit empty answers
    
    userResponses.push(answer);
    inputElement.value(''); // Clear the input box
    
    currentQuestionIndex++;
    
    if (currentQuestionIndex < QUESTIONS.length) {
        // Move to the next question
    } else {
        // All questions answered, time to move to loading and API call
        state = 'LOADING';
        callAIApi(userResponses);
    }
}

// --- API Integration ---
async function callAIApi(responses) {
    try {
        const response = await fetch(RENDER_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ responses: responses })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        aestheticResults = await response.json(); 
        state = 'RESULTS'; // Move to results screen on success

    } catch (error) {
        console.error('API Error:', error);
        // Display an error message if the API fails
        aestheticResults = { 'API ERROR': 100 };
        state = 'RESULTS';
    }
}