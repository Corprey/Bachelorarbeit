from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import tempfile
import os
from PIL import Image, ImageEnhance
from io import BytesIO
from stable_baselines3 import SAC
import numpy as np
import torch

print("Starting ...")

agent_path = "../models/train_sac_hsv_10000ep_noAugment"
yolo_model_path = "../models/YOLOv5s_80batch_640img_noAugment.pt"
image_width = 320
image_height = 320
temp_dir = tempfile.mkdtemp()

print("Load Agent ...")
model = SAC.load(agent_path) 

print("Load YOLOv5 Detector ...")
yolo = torch.hub.load('ultralytics/yolov5', 'custom', yolo_model_path) 

print("Starting Server...")
app = Flask(__name__)
CORS(app)

@app.route('/process-image', methods=['POST'])
def processImage():
    try:
        # Get base64 string from request body
        image_data = request.json.get('imageData')        
        # Convert base64 string to image object
        original_image = Image.open(BytesIO(base64.b64decode(image_data)))

        original_image_labeled, enhanced_image_labeled = enhanceImage(original_image)

        buffered = BytesIO()
        original_image_labeled.save(buffered, format = original_image_labeled.format)
        original_image_enc = base64.b64encode(buffered.getvalue()).decode('utf-8')

        buffered2 = BytesIO()
        enhanced_image_labeled.save(buffered2, format = original_image_labeled.format)
        enhanced_image_enc = base64.b64encode(buffered2.getvalue()).decode('utf-8')

        response_data = {
            'originalImageEnc': original_image_enc,
            'enhancedImageEnc': enhanced_image_enc
        }

        return jsonify(response_data), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def enhanceImage(image):
    # Convert image to fitting format for environment
    image_converted = image.resize((image_width, image_height))
    if image_converted.mode == "RGBA":
        image_converted = image_converted.convert("RGB")
    image_converted = np.asarray(image_converted)

    # Improve image with agent
    action, _states = model.predict(image_converted)
    image_hsv = image.convert('HSV')
    enhancer = ImageEnhance.Color(image_hsv)
    enhanced_image_hsv = enhancer.enhance(0.5)
    enhanced_image_rgb = enhanced_image_hsv.convert('RGB')

    # Call YOLOv5 network to detect traffic signs
    return detectImage(image, enhanced_image_rgb)


def detectImage(original_image, enhanced_image):
    results = yolo([original_image, enhanced_image])
    results.save(save_dir="./test", exist_ok=True)

    original_image_labeled = Image.open("./test/image0.jpg") 
    enhanced_image_labeled = Image.open("./test/image1.jpg") 

    return original_image_labeled, enhanced_image_labeled



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
