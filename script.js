// !!! CRITICAL: REPLACE THIS WITH YOUR ACTUAL LIVE RENDER API URL !!!
const RENDER_API_ENDPOINT = "https://the-deep-dive-api.onrender.com" + "/classify";

// --- Global Variables for State Management ---
let state = 'QUESTION'; // Controls which question/screen is visible ('QUESTION', 'LOADING', 'RESULTS')
let currentQuestionIndex = 0;
let userResponses = [];
let aestheticResults = null;
let inputElement; // P5.js input element (the textbox)
let loadingAngle = 0; // For the spinner animation

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
            drawResultsScreen();
            break;
    }
}

// Function to handle the transition to the next step when ENTER is pressed
function keyPressed() {
    if (keyCode === ENTER && state === 'QUESTION') {
        processAnswer();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    positionInput();
}

// Helper to center the input box
function positionInput() {
    // We position the input element 50px below the center
    inputElement.position(width / 2 - inputElement.width / 2, height / 2 + 50);
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
    // Ensure the input box is positioned correctly (and thus visible)
    positionInput();
    
    fill(255);
    // Draw the current question
    text(QUESTIONS[currentQuestionIndex], width / 2, height / 2 - 50);
    
    // Draw instructions
    textSize(16);
    text("Press ENTER to submit", width / 2, height / 2 + 100);
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