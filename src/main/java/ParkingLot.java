package parkease;

public class ParkingLot {
    public static final int CAPACITY = 20;

    private Ticket[] slots = new Ticket[CAPACITY];

    public void restoreTicket(Ticket ticket) {
        int start=ticket.getSlotNumber()-1;
        for(int i=0;i<ticket.getVehicle().getType().getSlotsNeeded();i++) slots[start+i]=ticket;
    }

    public Ticket findTicket(int id) {
        for(Ticket t:slots) if(t!=null && t.getTicketId()==id) return t;
        return null;
    }

    public Ticket findTicketAt(int slot) { return slots[slot-1]; }

    public void removeTicket(Ticket ticket) {
        for(int i=0;i<CAPACITY;i++) if(slots[i]==ticket) slots[i]=null;
    }

    public boolean hasPlate(String plate) {
        for(Ticket t:slots) if(t!=null && t.getVehicle().getPlateNumber().equalsIgnoreCase(plate)) return true;
        return false;
    }

    public Ticket parkVehicle(Vehicle vehicle)
            throws ParkingFullException {

        String plate = vehicle.getPlateNumber();

        // Prevent duplicate vehicle numbers
        for (Ticket ticket : slots) {
            if (ticket != null &&
                ticket.getVehicle().getPlateNumber()
                    .equalsIgnoreCase(plate)) {
                System.out.println("Vehicle is already parked!");
                return null;
            }
        }

        int needed = vehicle.getType().getSlotsNeeded();

        // Always select the lowest-numbered contiguous free block.
        int firstFree = findFirstFreeBlock(needed);
        if (firstFree >= 0) {
            int i = firstFree;
                Ticket ticket = new Ticket(vehicle, i + 1);

                for (int j = 0; j < needed; j++) {
                    slots[i + j] = ticket;
                }

                System.out.println("Parking successful!");
                System.out.println("Ticket ID: "
                        + ticket.getTicketId());
                System.out.println("Slot number: " + (i + 1));

                return ticket;
        }

        throw new ParkingFullException(
                "No suitable parking slots available!");
    }

    private int findFirstFreeBlock(int needed) {
        for (int i = 0; i <= CAPACITY - needed; i++) {
            boolean free = true;
            for (int j = 0; j < needed; j++) {
                if (slots[i + j] != null) { free = false; break; }
            }
            if (free) return i;
        }
        return -1;
    }

    public void exitVehicle(int ticketId, int hours) {
        for (int i = 0; i < CAPACITY; i++) {
            Ticket ticket = slots[i];

            if (ticket != null &&
                ticket.getTicketId() == ticketId) {

                Vehicle vehicle = ticket.getVehicle();

                if (hours <= 0) {
                    System.out.println(
                            "Hours must be greater than zero.");
                    return;
                }

                double charge = vehicle.calculateCharge(hours);

                System.out.println("Vehicle: "
                        + vehicle.getPlateNumber());
                System.out.println("Bill: Rs. " + charge);

                // Free all slots occupied by this ticket
                for (int j = 0; j < CAPACITY; j++) {
                    if (slots[j] == ticket) {
                        slots[j] = null;
                    }
                }

                System.out.println("Parking slot released!");
                return;
            }
        }

        System.out.println("Invalid ticket ID!");
    }

    public void showSlotMap() {
        System.out.println("\n--- Parking Slot Map ---");

        for (int i = 0; i < CAPACITY; i++) {
            if (slots[i] == null) {
                System.out.println("Slot " + (i + 1) + ": FREE");
            } else {
                System.out.println("Slot " + (i + 1) + ": "
                        + slots[i].getVehicle().getPlateNumber());
            }
        }
    }

    public void showSummary() {
        int vehicleCount = 0;

        for (int i = 0; i < CAPACITY; i++) {
            if (slots[i] != null &&
                (i == 0 || slots[i] != slots[i - 1])) {
                vehicleCount++;
            }
        }

        System.out.println("Parked vehicles: " + vehicleCount);
    }
}
