
import java.util.Scanner;

public class Main {

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        ParkingLot parkingLot = new ParkingLot();

        while (true) {
            System.out.println("\n===== ParkEase Smart Parking =====");
            System.out.println("1. Park Vehicle");
            System.out.println("2. Exit Vehicle");
            System.out.println("3. Show Slot Map");
            System.out.println("4. Show Summary");
            System.out.println("5. Quit");
            System.out.print("Enter your choice: ");

            int choice;

            try {
                choice = Integer.parseInt(sc.nextLine());
            } catch (NumberFormatException e) {
                System.out.println("Please enter a valid number.");
                continue;
            }

            switch (choice) {
                case 1:
                    System.out.print("Enter vehicle type (BIKE/CAR/TRUCK): ");
                    String typeInput = sc.nextLine().trim().toUpperCase();

                    VehicleType type;

                    try {
                        type = VehicleType.valueOf(typeInput);
                    } catch (IllegalArgumentException e) {
                        System.out.println("Invalid vehicle type!");
                        break;
                    }

                    System.out.print("Enter vehicle plate number: ");
                    String plate = sc.nextLine().trim().toUpperCase();

                    if (!isValidPlate(plate)) {
                        System.out.println(
                                "Invalid plate! Use 6-10 letters and digits.");
                        break;
                    }

                    Vehicle vehicle;

                    switch (type) {
                        case BIKE:
                            vehicle = new Bike(plate);
                            break;
                        case CAR:
                            vehicle = new Car(plate);
                            break;
                        case TRUCK:
                            vehicle = new Truck(plate);
                            break;
                        default:
                            System.out.println("Invalid type!");
                            continue;
                    }

                    try {
                        parkingLot.parkVehicle(vehicle);
                    } catch (ParkingFullException e) {
                        System.out.println(e.getMessage());
                    }
                    break;

                case 2:
                    System.out.print("Enter ticket ID: ");
                    try {
                        int ticketId = Integer.parseInt(sc.nextLine());
                        System.out.print("Enter parking hours: ");
                        int hours = Integer.parseInt(sc.nextLine());

                        parkingLot.exitVehicle(ticketId, hours);
                    } catch (NumberFormatException e) {
                        System.out.println("Please enter valid numbers.");
                    }
                    break;

                case 3:
                    parkingLot.showSlotMap();
                    break;

                case 4:
                    parkingLot.showSummary();
                    break;

                case 5:
                    System.out.println("Thank you for using ParkEase!");
                    sc.close();
                    return;

                default:
                    System.out.println("Choose a number from 1 to 5.");
            }
        }
    }

    public static boolean isValidPlate(String plate) {
        if (plate.length() < 6 || plate.length() > 10) {
            return false;
        }

        for (int i = 0; i < plate.length(); i++) {
            char ch = plate.charAt(i);

            if (!Character.isLetterOrDigit(ch)) {
                return false;
            }
        }

        return true;
    }
}
