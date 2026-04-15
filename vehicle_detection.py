import cv2
import os
from ultralytics import YOLO

class VehicleDetector:
    def __init__(self, model_path="yolov8n.pt"):
        """
        Initialize the YOLOv8 model.
        """
        # Load the YOLOv8 Nano model (will download automatically if not found)
        self.model = YOLO(model_path)
        # Relevant COCO classes for vehicle detection
        # 2: car, 3: motorcycle, 5: bus, 7: truck
        self.vehicle_classes = [2, 3, 5, 7]

    def detect(self, source, confidence_threshold=0.5):
        """
        Perform detection on an image path or a numpy image array.
        Returns the image with detections drawn and a count of vehicles.
        """
        if isinstance(source, str):
            # Read the image from path
            img = cv2.imread(source)
            if img is None:
                print(f"Error: Could not read image at {source}")
                return None, 0
        else:
            # Assume it's already a numpy array (OpenCV image)
            img = source.copy()

        # Perform inference
        results = self.model.predict(img, conf=confidence_threshold, verbose=False)
        
        vehicle_count = 0
        
        # Iterate over detections in the first result
        for result in results:
            for box in result.boxes:
                # Filter by vehicle classes
                class_id = int(box.cls[0])
                if class_id in self.vehicle_classes:
                    vehicle_count += 1
                    
                    # Get box coordinates (x1, y1, x2, y2)
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])
                    label = result.names[class_id]
                    
                    # Draw rectangle and label
                    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(img, f"{label} {conf:.2f}", (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 0), 2)

        return img, vehicle_count

def main():
    # Initialize the detector
    detector = VehicleDetector()
    
    # Path to the directory containing the images
    image_dir = "test_images/"
    output_dir = "output_images/"
    os.makedirs(output_dir, exist_ok=True)

    # Process each image (1.jpg to 4.jpg)
    for i in range(1, 5):
        image_name = f"{i}.jpg"
        image_path = os.path.join(image_dir, image_name)
        
        print(f"Processing {image_path}...")
        processed_img, count = detector.detect(image_path)
        
        if processed_img is not None:
            # Display vehicle count
            print(f"Detected {count} vehicles in {image_name}")
            
            # Save the result
            output_path = os.path.join(output_dir, f"output_{image_name}")
            cv2.imwrite(output_path, processed_img)
            
            # Optionally show the result
            # cv2.imshow("Vehicle Detection", processed_img)
            # cv2.waitKey(500) # Show for half a second

    print("Processing complete.")
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
