public class Ticket {
    private static int nextTicketId = 1;

    private int ticketId;
    private Vehicle vehicle;
    private int slotNumber;

    public Ticket(Vehicle vehicle, int slotNumber) {
        this.ticketId = nextTicketId++;
        this.vehicle = vehicle;
        this.slotNumber = slotNumber;
    }

    public int getTicketId() {
        return ticketId;
    }

    public Vehicle getVehicle() {
        return vehicle;
    }

    public int getSlotNumber() {
        return slotNumber;
    }
}