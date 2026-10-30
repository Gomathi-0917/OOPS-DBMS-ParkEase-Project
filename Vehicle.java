public abstract class Vehicle implements Chargeable {
    private String plateNumber;
    private VehicleType type;

    public Vehicle(String plateNumber, VehicleType type) {
        this.plateNumber = plateNumber;
        this.type = type;
    }

    public String getPlateNumber() {
        return plateNumber;
    }

    public VehicleType getType() {
        return type;
    }

    @Override
    public double calculateCharge(int hours) {
        int billableHours = Math.min(hours, 8);
        return billableHours * type.getHourlyRate();
    }
}