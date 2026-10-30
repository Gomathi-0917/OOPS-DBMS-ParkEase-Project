package parkease;
public class Ticket {
    private static int nextTicketId = 1;

    private int ticketId;
    private Vehicle vehicle;
    private int slotNumber;
    private String ownerName;
    private java.time.LocalDateTime entryTime;
    private java.time.LocalDateTime exitTime;
    private Integer hours;
    private Double charge;

    public Ticket(Vehicle vehicle, int slotNumber) {
        this.ticketId = nextTicketId++;
        this.vehicle = vehicle;
        this.slotNumber = slotNumber;
        this.entryTime = java.time.LocalDateTime.now();
    }

    public Ticket(int ticketId, Vehicle vehicle, int slotNumber, String ownerName,
            java.time.LocalDateTime entryTime) {
        this.ticketId=ticketId; this.vehicle=vehicle; this.slotNumber=slotNumber;
        this.ownerName=ownerName; this.entryTime=entryTime;
        nextTicketId=Math.max(nextTicketId,ticketId+1);
    }

    public int getTicketId() {
        return ticketId;
    }
    public void setTicketId(int ticketId){this.ticketId=ticketId;nextTicketId=Math.max(nextTicketId,ticketId+1);}

    public Vehicle getVehicle() {
        return vehicle;
    }

    public int getSlotNumber() {
        return slotNumber;
    }
    public String getOwnerName(){return ownerName;}
    public void setOwnerName(String ownerName){this.ownerName=ownerName;}
    public java.time.LocalDateTime getEntryTime(){return entryTime;}
    public java.time.LocalDateTime getExitTime(){return exitTime;}
    public void setExitTime(java.time.LocalDateTime value){exitTime=value;}
    public Integer getHours(){return hours;}
    public void setHours(Integer value){hours=value;}
    public Double getCharge(){return charge;}
    public void setCharge(Double value){charge=value;}
}
