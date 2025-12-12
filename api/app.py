from flask import Flask, request, jsonify
from transformers import pipeline
import torch 

# --- 1. Model Initialization ---
app = Flask(__name__)

# Define the labels outside the function
AESTHETICS = [
    "clean girl", "y2k", "dark academia", "cottage core", "coquette", 
    "soft girl", "vintage", "coastal cowgirl", "mob wife", "old money"
]

# Initialize the Zero-Shot Classification Pipeline (Load the model once globally)
classifier = pipeline(
    "zero-shot-classification", 
    model="facebook/bart-large-mnli", 
    device=0 if torch.cuda.is_available() else -1 
)

# --- 2. API Endpoint ---
# The @app.route defines the path your front-end will send data to (e.g., YOUR_RENDER_URL/classify)
@app.route('/classify', methods=['POST'])
def classify_identity():
    # Allow the front-end (GitHub Pages) to talk to this server (Render)
    # This is handled automatically by Render, but good to know for testing.
    
    data = request.get_json(force=True)
    user_responses = data.get('responses')
    
    if not user_responses or not isinstance(user_responses, list):
        return jsonify({"error": "Invalid input. Expected a list of 'responses'."}), 400

    combined_text = " ".join(user_responses)

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
        percentage = round((score / total_score) * 100)
        final_breakdown[label] = percentage
        
    return jsonify(final_breakdown)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)