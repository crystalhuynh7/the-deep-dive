from flask import Flask, request, jsonify
from flask_cors import CORS
import re

# --- AI Model Libraries (COMMENTED OUT: Memory Too Large for Free Tier) ---
# import torch 
# from transformers import pipeline 

app = Flask(__name__)
CORS(app) # Initialize CORS

# --- Aesthetic Keyword Definitions (Operational Logic) ---
AESTHETIC_KEYWORDS = {
    "clean girl": ["iced latte", "vanilla", "matcha", "slicked back", "white sneakers", "minimalist", "skincare", "pilates"],
    "y2k": ["low rise", "cargo", "butterfly clip", "velour", "flip phone", "limewire", "britney", "chunky sneakers"],
    "dark academia": ["tweed", "oxford", "library", "coffee shop", "poetry", "leather bound", "typewriter", "tea"],
    "cottage core": ["linen", "flowers", "picnic", "knitting", "tea party", "garden", "mushroom", "pastoral"],
    "coquette": ["ribbon", "lace", "pearls", "pink", "vintage lingerie", "delicate", "ballet flat"],
    "soft girl": ["pastel", "sweatpants", "anime", "kawaii", "boba", "oversized hoodie", "cloud", "strawberry"],
    "vintage": ["thrift", "denim jacket", "records", "old movies", "classic rock", "browns", "earth tones"],
    "coastal cowgirl": ["cowboy boot", "denim", "beach", "sunset", "hat", "turquoise", "boho"],
    "mob wife": ["faux fur", "leopard print", "leather", "gold jewelry", "martini", "italian food", "big hair", "nails"],
    "old money": ["tailored", "tweed", "polo", "yacht", "ivy league", "tennis", "private club", "heirloom"]
}

# --- Original AI Model Initialization (COMMENTED OUT: Memory Too Large) ---
# AESTHETICS = list(AESTHETIC_KEYWORDS.keys()) # Same labels
# classifier = pipeline(
#     "zero-shot-classification", 
#     # Smallest functional model used before hitting OOM error:
#     model="MoritzLaurer/xtremedistil-l6-h256-zeroshot-v1.1-all-33", 
#     device=0 if torch.cuda.is_available() else -1 
# )


@app.route('/classify', methods=['POST'])
def classify_identity():
    data = request.get_json(force=True, silent=True)
    
    if not data or 'responses' not in data or not isinstance(data['responses'], list):
        return jsonify({"error": "Invalid input. Expected a list of 'responses' in JSON body."}), 400

    user_responses = data['responses']
    combined_text = " ".join(user_responses).lower()
    
    aesthetic_scores = {}
    
    # ----------------------------------------------------
    # 1. AI CLASSIFICATION LOGIC (OLD, COMMENTED OUT)
    # ----------------------------------------------------
    # result = classifier(
    #     combined_text,
    #     candidate_labels=AESTHETICS,
    #     multi_label=True
    # )
    # aesthetic_scores = dict(zip(result['labels'], result['scores']))
    
    # ----------------------------------------------------
    # 1. KEYWORD MATCHING LOGIC (NEW, OPERATIONAL)
    # ----------------------------------------------------
    for aesthetic, keywords in AESTHETIC_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            # Use regex to find whole word matches
            if re.search(r'\b' + re.escape(keyword) + r'\b', combined_text):
                score += 1
        aesthetic_scores[aesthetic] = score

    # 2. Sort and Select Top 5
    sorted_scores = sorted(
        aesthetic_scores.items(), 
        key=lambda item: item[1], 
        reverse=True
    )
    
    top_five = sorted_scores[:5]
    total_score = sum(score for _, score in top_five)
    
    final_breakdown = {}
    
    if total_score > 0:
        # Standard Normalization: If scores exist, calculate percentages based on score total
        for label, score in top_five:
            percentage = round((score / total_score) * 100)
            final_breakdown[label] = percentage
    else:
        # Soft Distribution Fallback (Critique Point: Forced Classification)
        equal_percent = round(100 / 5)
        
        # Distribute the percentage to the top 5 labels (which are all tied at 0)
        for label, _ in top_five:
             final_breakdown[label] = equal_percent

    return jsonify(final_breakdown)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)