class TrafficSignalController:
    def __init__(self):
        self.green_time = 30  # Initial green time in seconds
        self.red_time = 20    # Initial red time in seconds
        self.yellow_time = 5  # Initial yellow time in seconds
        self.max_green_time = 60  # Maximum green time
        self.min_green_time = 10  # Minimum green time
        self.max_red_time = 40    # Maximum red time
        self.min_red_time = 10    # Minimum red time
        self.max_yellow_time = 10  # Maximum yellow time
        self.min_yellow_time = 3   # Minimum yellow time

    def update_signal_timings(self, vehicle_count):
        """
        Calculates signal timings dynamically and statelessly.
        If count is 0, it drops all signals to 0 for a full reset.
        """
        if vehicle_count == 0:
            self.green_time = 0
            self.red_time = 0
            self.yellow_time = 0
            return

        # --- DYNAMIC FORMULAS (Active Traffic) ---
        
        # Green: Base 10s + 2s per vehicle
        self.green_time = min(10 + (vehicle_count * 2), self.max_green_time)
        
        # Red: Based on opposing density (Base 15s + 1s per vehicle)
        self.red_time = min(15 + vehicle_count, self.max_red_time)
        
        # Yellow: Proportional to density
        if vehicle_count > 40:
            self.yellow_time = 6
        elif vehicle_count > 20:
            self.yellow_time = 5
        else:
            self.yellow_time = 4

    def print_signal_timings(self):
        print("Green Signal Time:", self.green_time, "seconds")
        print("Red Signal Time:", self.red_time, "seconds")
        print("Yellow Signal Time:", self.yellow_time, "seconds")

def main():
    # Initialize Traffic Signal Controller
    signal_controller = TrafficSignalController()

    # Get vehicle count from user
    try:
        vehicle_count = int(input("Enter the vehicle count: "))
    except ValueError:
        print("Invalid input. Please enter a valid integer for vehicle count.")
        return

    # Update signal timings based on vehicle count
    signal_controller.update_signal_timings(vehicle_count)

    # Print updated signal timings
    signal_controller.print_signal_timings()

if __name__ == "__main__":
    main()