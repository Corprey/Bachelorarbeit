import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Camera } from 'expo-camera';
import { useWindowDimensions } from "react-native";

export default function App() {
  const [hasCameraPermission, setHasCameraPermission] = useState();
  const [receivedImages, setReceivedImages] = useState();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showImproved, setShowImproved] = useState(false);


  const { width } = useWindowDimensions();

  let cameraRef = useRef();

  // Request camera permission 
  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraPermission.status === "granted");
    })();
  }, []);

  // Handle missing camera permissions
  if (hasCameraPermission === undefined) {
    return (
      <View style={styles.container}>
        <Text>Requesting permissions...</Text>
      </View>
    );
  } else if (!hasCameraPermission) {
    return (
      <View style={styles.container}>
        <Text>Permission for camera not granted. Please change this in settings.</Text>
      </View>
    );
  }

  // Function to take a picture
  const takePicture = async () => {
    let options = {
      quality: 1,
      base64: true,
      exif: false
    };

    const capturedImage = await cameraRef.current.takePictureAsync(options);
    detectImage(capturedImage); // Initiate Backend communication
  };

  
  const detectImage = async (capturedImage) => {
    setLoading(true);
    let base64Prefix = "data:image/png;base64,";

    // TODO: Backend communication
    //const base64RegExp = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;
    //const isBase64 = (str) => base64RegExp.test(str);
    //console.log("Base64?" + isBase64(capturedImage.base64));
    //const imageData = `data:image/jpg;base64,${capturedImage.base64}`;
    
    let imageData = capturedImage.base64;
    if (imageData.startsWith(base64Prefix)) {
      imageData = imageData.substring(base64Prefix.length);
    }

    // Send POST request to backend
    // TODO: Change address
    try {
      const rawResponse = await fetch(`http://192.168.0.53:5000/process-image`, {
        method: 'POST',
       // mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData }),
      });

      if (!rawResponse.ok) {
        const errorMessage = await rawResponse.text();
        alert(errorMessage);
        resetCamera();
        return;
      }

      const { originalImageEnc, enhancedImageEnc } = await rawResponse.json();

      // Convert base64 images to objects to be used for <Image /> tags
      const originalImage = { uri: base64Prefix + originalImageEnc };
      const enhancedImage = { uri: base64Prefix + enhancedImageEnc };

      setReceivedImages([originalImage, enhancedImage]);
      setLoading(false);
      setShowPreview(true);

    } catch( e ) {
      alert("Could not connect to server " + e);
      resetCamera();
    }
  }

  // Return to camera view when called
  const resetCamera = () => {
    setReceivedImages(undefined);
    setLoading(false);
    setShowPreview(false);
    setShowImproved(false);
  };

  // Toggles the display image
  const toggleImageDisplay = () => {
    setShowImproved(!showImproved);
  };


  if(loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Processing Request...</Text>
      </View>
    );
  } 
  else if(showPreview) {
    const height = Math.round((width * 16) / 9);

    return (
      <View style={styles.container}>
        <Image source={showImproved ? receivedImages[1] : receivedImages[0]} style={[styles.image, { height: height, width: "100%" }]} />
        <Text style={styles.imageMode}> {showImproved ? ("Improved Image") : ("Original Image")} </Text>
        <TouchableOpacity onPress={toggleImageDisplay} style={styles.toggleButton}>
          <Text>Switch Mode</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={resetCamera} style={styles.closeButton}>
          <Text>X</Text>
        </TouchableOpacity>
      </View>
    );
  } 
  else {
    const height = Math.round((width * 16) / 9);

    return (
      <Camera ratio="16:9" style={[styles.camera, {height: height, width: "100%"}]} ref={cameraRef}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={takePicture} style={styles.captureButton}>
            <View style={styles.captureInnerButton} />
          </TouchableOpacity>
        </View>
        <StatusBar style="auto" />
      </Camera>
    );
  }
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  captureButton: {
    backgroundColor: '#d6d6d6',
    borderRadius: 80,
    height: 80,
    width: 80,
    alignSelf: 'center',
  },
  captureInnerButton: {
    backgroundColor: '#5e5e5e',
    borderRadius: 70,
    height: 70,
    width: 70,
    margin: 5,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
  },
  imageMode: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: '#aaa',
    borderRadius: 20,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 10,
    paddingRight: 10,
  },
  toggleButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingTop: 3,
    paddingBottom: 5,
    paddingLeft: 10,
    paddingRight: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fff',
    borderRadius: 30,
    height: 30,
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
