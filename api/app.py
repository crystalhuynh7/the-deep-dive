from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import requests # NEW: for Firebase communication

# --- AI Model Libraries (COMMENTED OUT: Memory Too Large for Free Tier) ---
# import torch 
# from transformers import pipeline 

app = Flask(__name__)
CORS(app) # Initialize CORS

# Firebase Database URL
FIREBASE_URL = ""

# --- Aesthetic Keyword Definitions (Operational Logic) ---
AESTHETIC_KEYWORDS = {
    "clean girl": [
        # Broad Additions (Colors, General)
        "white", "cream", "beige", "ivory", "nude", "taupe", "light gray", "bone", "gold", "silver", "sport", "gym", "running", "routine", "clean", "healthy", "workout", "smoothie", "water", "tea", "coffee", "salad", "oats", "toast",
        # Keywords (Descriptive)
        "minimal", "fresh", "simple", "polished", "structured", "elegant", "sophisticated", "effortless", "glowy", "serene", "aspirational", "chic", "put together",
        # Items/Drinks
        "iced coffee", "iced latte", "matcha", "green juice", "espresso shot", "almond milk", "oat milk", "cappuccino", "flat white", "smoothie bowl", "white shirt", "trousers", "hoops", "sneakers", "tailored coat", 
        "blouse", "sweater", "t-shirt", "jeans", "slacks", "tote bag", "blazer",
        # Actions (Enhanced)
        "pilates", "yoga", "errands", "working out", "journaling", "wellness", "meditation", "productivity", "walking", "planning", "organizing", "sipping", "reading news"
    ],
    "y2k": [
        # Broad Additions (Colors, General)
        "hot pink", "lime green", "baby blue", "orange", "yellow", "red", "purple", "metallic", "neon", "music", "party", "dancing", "friends", "out", "phone", "pop", "club", "soda", "pizza", "burger", "candy", "milkshake", "cereal",
        # Keywords (Descriptive)
        "chunky", "bright", "girly", "funky", "retro", "bling", "iconic", "futuristic", "playful", "nostalgic", "pop culture", "plastic", "rebellious",
        # Items/Drinks
        "frappuccino", "syrup pump", "mocha", "caramel macchiato", "whipped cream", "sugar", "low rise", "cargo", "rhinestone", "clip", "mini skirt", "velour", "flip phone", "graphic tee", "platform", "baguette bag", 
        "hoodie", "jeans", "sneakers", "skirt", "crop top", "jacket", "dress",
        # Actions (Enhanced)
        "clubbing", "arcade", "mall", "gossip", "tiktok", "gaming", "night out", "texting", "hanging out", "shopping", "scrolling", "watching tv"
    ],
    "dark academia": [
        # Broad Additions (Colors, General)
        "black", "brown", "dark green", "burgundy", "oxblood", "navy", "grey", "khaki", "maroon", "deep red", "charcoal", "study", "library", "reading", "history", "writing", "book", "school", "quiet", "tea", "coffee", "soup", "bread",
        # Keywords (Descriptive)
        "intellectual", "vintage", "classic", "moody", "gothic", "scholarly", "romantic", "melancholy", "academic", "paper",
        # Items/Drinks
        "black coffee", "espresso", "americano", "earl grey", "darjeeling", "hot tea", "scone", "biscotti", "tweed", "blazer", "cardigan", "wool", "spectacles", "turtleneck", "leather bound", "fountain pen",
        "coat", "boots", "trousers", "dress", "sweater", "vest", "tie", "loafers",
        # Actions (Enhanced)
        "museum", "philosophy", "debating", "poetry", "gallery", "visiting campuses", "rainy days", "researching", "discussing", "listening to podcasts", "taking notes"
    ],
    "cottage core": [
        # Broad Additions (Colors, General)
        "green", "moss", "tan", "sage", "yellow", "brown", "off-white", "light blue", "dusty rose", "terracotta", "garden", "nature", "cooking", "baking", "home", "animals", "soft", "woods", "tea", "water", "fruit", "vegetables", "scones",
        # Keywords (Descriptive)
        "whimsical", "cozy", "homemade", "earthy", "pastoral", "quaint", "slow living", "peaceful", "simple",
        # Items/Drinks
        "herbal tea", "scone", "jam", "honey", "lemonade", "lavender latte", "muffin", "croissant", "linen", "dress", "flowers", "straw hat", "mushroom", "picnic", "apron",
        "skirt", "blouse", "dress", "sandals", "sweater", "boots", "apron",
        # Actions (Enhanced)
        "knitting", "foraging", "sewing", "hiking", "walking", "embroidery", "preserving food", "planting", "gathering", "listening to quiet music", "strolling", "caring for"
    ],
    "coquette": [
        # Broad Additions (Colors, General)
        "light pink", "rose", "peach", "blush", "magenta", "baby pink", "ivory", "girly", "fashion", "beauty", "sweet", "watching", "cake", "dessert", "soda",
        # Keywords (Descriptive)
        "ribbon", "lace", "pearls", "delicate", "feminine", "flirty", "dainty", "sultry", "dollish", "romantic", "fragile", "glamour",
        # Items/Drinks
        "macaron", "pink drink", "champagne", "rose water", "ballet flat", "bows", "tulle", "vintage", "silk", "lingerie", "corset", "heels",
        "dress", "skirt", "blouse", "stockings", "cardigan", "slippers",
        # Actions (Enhanced)
        "writing letters", "curating", "daydreaming", "listening to classical", "watching movies", "posing", "taking photos", "dressing up", "admiring", "reflecting"
    ],
    "soft girl": [
        # Broad Additions (Colors, General)
        "pastel", "baby blue", "lilac", "mint", "bubblegum", "lavender", "teal", "cute", "kawaii", "sleeping", "boba", "phone", "gaming", "chill", "nothing", "candy", "chips", "pizza",
        # Keywords (Descriptive)
        "comfy", "gentle", "youthful", "playful", "wholesome", "bubbly",
        # Items/Drinks
        "milkshake", "smoothie", "hot chocolate", "whipped cream", "sweatpants", "hoodie", "cloud", "strawberry", "platform", "oversized sweater", "anime", "k-pop",
        "jeans", "t-shirt", "shorts", "sneakers", "skirt", "dress", "socks",
        # Actions (Enhanced)
        "snuggling", "crafts", "making faces", "drawing", "playing video games", "tiktok", "watching youtube", "napping", "cuddling", "relaxing", "listening to music"
    ],
    "vintage": [
        # Broad Additions (Colors, General)
        "mustard", "burnt orange", "terracotta", "maroon", "teal", "rust", "olive", "browns", "deep yellow", "red", "music", "movies", "collecting", "coffee", "tea", "pie", "sandwich",
        # Keywords (Descriptive)
        "retro", "classic", "timeless", "denim", "old", "antique", "records", "thrift", "authentic", "nostalgic", "recycled", "worn", "groovy", "pinup",
        # Items/Drinks
        "diner coffee", "malt", "milkshake", "soda", "iced tea", "coca-cola", "jacket", "leather", "high-waisted", "flannel", "vinyl", "bell bottoms", "fedora", "suit",
        "jeans", "dress", "boots", "shoes", "shirt", "coat", "scarf",
        # Actions (Enhanced)
        "jazz", "rock and roll", "antiques", "thrift store", "flea market", "restoring", "dancing", "swing", "watching", "listening", "fixing", "searching"
    ],
    "coastal cowgirl": [
        # Broad Additions (Colors, General)
        "sand", "denim blue", "turquoise", "aqua", "sky blue", "blue", "ocean", "driving", "country", "outdoors", "drinking", "travel", "sun", "beach", "water", "bbq", "tacos",
        # Keywords (Descriptive)
        "western", "free spirited", "boho", "rustic", "salty", "laid back", "festival", "adventurous", "shell necklace",
        # Items/Drinks
        "iced tea", "lemonade", "cold brew", "iced latte", "muffin", "scone", "cowboy boot", "denim shorts", "fringe", "straw hat", "bandana", "sundress", "crochet",
        "jeans", "shorts", "shirt", "boots", "hat", "dress", "swimsuit",
        # Actions (Enhanced)
        "sunset", "bonfire", "concert", "rodeos", "swimming", "barbecue", "horse riding", "driving", "traveling", "listening to music", "camping", "hiking"
    ],
    "mob wife": [
        # Broad Additions (Colors, General)
        "black", "leopard", "gold", "red", "scarlet", "silver", "jet black", "burgundy", "crimson", "dark", "dinner", "jewelry", "fashion", "luxury", "eating", "wine", "martini", "steak", "pasta",
        # Keywords (Descriptive)
        "bold", "extravagant", "glamorous", "fur", "expensive", "confident", "opulent", "fierce", "sultry", "leather", "dramatic", "smoking",
        # Items/Drinks
        "espresso", "cappuccino", "macchiato", "italian soda", "faux fur", "leopard print", "sunglasses", "designer", "nails", "stiletto", "lace dress",
        "coat", "dress", "heels", "skirt", "jacket", "trousers", "blouse",
        # Actions (Enhanced)
        "steakhouse", "casino", "shopping", "gossip", "bossy", "private events", "drinking", "dining", "talking", "arranging"
    ],
    "old money": [
        # Broad Additions (Colors, General)
        "navy", "forest green", "hunter green", "light blue", "royal blue", "money", "sport", "golf", "tennis", "water", "tea", "salad", "wine", "cocktail",
        # Keywords (Descriptive)
        "preppy", "classic", "tailored", "traditional", "elite", "conservative", "polished", "discreet", "heritage", "family",
        # Items/Drinks
        "sparkling water", "coffee", "latte", "english breakfast", "earl grey", "polo", "cashmere", "pearls", "loafers", "monogram", "tweed", "button-down", "blazer",
        "shirt", "sweater", "trousers", "skirt", "coat", "shoes", "jacket",
        # Actions (Enhanced)
        "investing", "private club", "gala", "sailing", "quiet dinner", "reading", "discussing", "planning", "hosting", "attending", "vacationing"
    ]
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

@app.route('/reflect', methods=['POST'])
def save_reflection():
    """Endpoint to save the 'That's you, right?' response to the database."""
    data = request.get_json(force=True, silent=True)
    
    if not data or 'reflection' not in data:
        return jsonify({"error": "Missing reflection text"}), 400

    # Prepare data for Firebase
    payload = {
        "text": data['reflection'],
        "top_aesthetic": data.get('top_aesthetic', 'unknown'),
        "timestamp": {".sv": "timestamp"} # Firebase server-side timestamp
    }

    try:
        response = requests.post(FIREBASE_URL, json=payload)
        return jsonify({"status": "success", "id": response.json()['name']}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/archive', methods=['GET'])
def get_archive():
    """Endpoint to fetch all reflections to power the moving mesh background."""
    try:
        response = requests.get(FIREBASE_URL)
        archive_data = response.json()
        
        # Flatten the Firebase dictionary into a list for easier P5.js processing
        reflections = []
        if archive_data:
            for key in archive_data:
                reflections.append(archive_data[key]['text'])
        
        return jsonify(reflections)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)