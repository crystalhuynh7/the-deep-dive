from flask import Flask, request, jsonify
from flask_cors import CORS  # <-- NEW: Import Flask-CORS
from transformers import pipeline
import torch 

# --- 1. Model Initialization ---
app = Flask(__name__)
CORS(app)  # <-- NEW: Initialize CORS for all routes (origin='*')

# Define the labels for classification
AESTHETICS = [
    "clean girl", "y2k", "dark academia", "cottage core", "coquette", 
    "soft girl", "vintage", "coastal cowgirl", "mob wife", "old money"
]

# Initialize the Zero-Shot Classification Pipeline 
# Using the smallest successful model to prevent Out-Of-Memory errors
classifier = pipeline(
    "zero-shot-classification", 
    model="MoritzLaurer/xtremedistil-l6-h256-zeroshot-v1.1-all-33", 
    device=0 if torch.cuda.is_available() else -1 
)

# --- 2. API Endpoint ---
# We now only need the POST method here because CORS handles the OPTIONS request automatically
@app.route('/classify', methods=['POST']) 
def classify_identity():
    # Attempt to parse JSON data from the request body
    data = request.get_json(force=True, silent=True)
    
    # Handle cases where JSON parsing fails or data is missing
    if not data or 'responses' not in data or not isinstance(data['responses'], list):
        return jsonify({"error": "Invalid input. Expected a list of 'responses' in JSON body."}), 400

    user_responses = data['responses']
    combined_text = " ".join(user_responses)

    # Perform the ZSC
    result = classifier(
        combined_text,
        candidate_labels=AESTHETICS,
        multi_label=True
    )
    
    # Process the results for the top 5
    aesthetic_scores = sorted(
        zip(result['labels'], result['scores']),
        key=lambda x: x[1],
        reverse=True
    )
    
    top_five = aesthetic_scores[:5]
    total_score = sum(score for _, score in top_five)
    
    final_breakdown = {}
    for label, score in top_five:
        # Scale the score to be a percentage of the top five's total
        percentage = round((score / total_score) * 100)
        final_breakdown[label] = percentage
        
    # Flask-CORS adds the necessary Access-Control-Allow-Origin headers automatically
    return jsonify(final_breakdown)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)