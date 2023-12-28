from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
from PIL import Image, ImageEnhance
from io import BytesIO

app = Flask(__name__)
CORS(app)

@app.route('/process-image', methods=['POST'])
def process_image():
    try:
        # Get base64 string from request body
        image_data = request.json.get('imageData')        
        # Convert base64 string to image object
        original_image = Image.open(BytesIO(base64.b64decode(image_data)))


        # TODO: Integrate Image Enhancement and Detection here


        # TODO: Remove mock response
        enhancer = ImageEnhance.Color(original_image)
        enhanced_image = enhancer.enhance(0.2)

        # Convert original Image to correct format
        buffered = BytesIO()
        original_image.save(buffered, format = original_image.format)
        original_image_enc = base64.b64encode(buffered.getvalue()).decode('utf-8')

        # Convert improved Image to correct format
        buffered2 = BytesIO()
        enhanced_image.save(buffered2, format = original_image.format)
        enhanced_image_enc = base64.b64encode(buffered2.getvalue()).decode('utf-8')

        response_data = {
            'originalImageEnc': original_image_enc,
            'enhancedImageEnc': enhanced_image_enc
        }

        return jsonify(response_data), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
