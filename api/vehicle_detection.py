import cv2
import os
from ultralytics import YOLO

class VehicleDetector:
    def __init__(self, model_path=None):
        """
        Initialize the YOLOv8 model for the web system.
        """
        if model_path is None:
            # default to yolov8n.pt in the same directory as this script
            current_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(current_dir, "yolov8n.pt")
            
        self.model = YOLO(model_path)
        self.vehicle_classes = ["car", "bus", "truck", "motorbike"]

    def detect(self, source):
        """
        The core logic from your snippet, adapted for the website.
        """
        if isinstance(source, str):
            img = cv2.imread(source)
            if img is None: return None, 0
        else:
            img = source.copy()

        # Run YOLO Inference
        results = self.model(img)
        
        # Get annotated image (using the .plot() method for best visualization)
        annotated_frame = results[0].plot()

        # Count vehicles specifically using your classification list
        count = 0
        for box in results[0].boxes:
            cls_id = int(box.cls[0])
            label = self.model.names[cls_id]
            if label in self.vehicle_classes:
                count += 1

        # Show Red count overlay on top of the annotated frame
        cv2.putText(annotated_frame, f"Vehicles: {count}", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

        return annotated_frame, count

def main():
    """
    STANDALONE TEST LOOP
    This section only runs when you execute 'python vehicle_detection.py'.
    It will NOT run (and thus will not crash) when the web server starts.
    """
    detector = VehicleDetector()
    image_dir = "test_images/"
    output_dir = "output_images/"
    os.makedirs(output_dir, exist_ok=True)

    print("Running standalone detection test on images...")

    for i in range(1, 4):
        image_path = os.path.join(image_dir, f"{i}.jpg")
        if not os.path.exists(image_path):
            print(f"File not found: {image_path}")
            continue

        processed_img, count = detector.detect(image_path)
        print(f"Processed {image_path}: {count} vehicles detected.")
        
        cv2.imshow("Detection Preview", processed_img)
        cv2.waitKey(1000) # Show for 1 second

    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()