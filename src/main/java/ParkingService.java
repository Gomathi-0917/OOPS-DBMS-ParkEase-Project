package parkease;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import java.sql.Statement;

@Service
public class ParkingService {
 private final JdbcTemplate db;
 private final ParkingLot lot=new ParkingLot();
 public ParkingService(JdbcTemplate db){this.db=db;}
 @PostConstruct public synchronized void load(){
  db.query("SELECT ticket_no,plate,owner,type,slot,entry_time FROM tickets WHERE exit_time IS NULL ORDER BY ticket_no",rs->{
   VehicleType type=VehicleType.valueOf(rs.getString("type"));
   Vehicle v=create(type,rs.getString("plate"));
   Ticket t=new Ticket(rs.getInt("ticket_no"),v,rs.getInt("slot"),rs.getString("owner"),rs.getTimestamp("entry_time").toLocalDateTime()); lot.restoreTicket(t);
  });
 }
 static Vehicle create(VehicleType t,String plate){return switch(t){case BIKE->new Bike(plate);case CAR->new Car(plate);case TRUCK->new Truck(plate);};}
 public synchronized Map<String,Object> park(String type,String plate,String owner) throws Exception {
  VehicleType vt; try{vt=VehicleType.valueOf(type.toUpperCase(Locale.ROOT));}catch(Exception e){throw new IllegalArgumentException("Choose Bike, Car or Truck.");}
  String normalized=plate.trim().toUpperCase(Locale.ROOT);
  if(!normalized.matches("TN[0-9]{2}[A-Z]{1,2}[0-9]{4}")) throw new IllegalArgumentException("Plate must match TN37AB1234.");
  if(owner==null||owner.isBlank()) throw new IllegalArgumentException("Owner name is required.");
  if(lot.hasPlate(normalized)) throw new IllegalArgumentException("This plate is already parked.");
  Vehicle vehicle=create(vt,normalized); Ticket t;
  try{t=lot.parkVehicle(vehicle);}catch(ParkingFullException e){throw new IllegalStateException(e.getMessage());}
  if(t==null)throw new IllegalArgumentException("This plate is already parked.");
  t.setOwnerName(owner.trim());
  try {KeyHolder keys=new GeneratedKeyHolder();
   db.update(connection->{var ps=connection.prepareStatement("INSERT INTO tickets(plate,owner,type,slot,entry_time) VALUES(?,?,?,?,?)",Statement.RETURN_GENERATED_KEYS);ps.setString(1,normalized);ps.setString(2,t.getOwnerName());ps.setString(3,vt.name());ps.setInt(4,t.getSlotNumber());ps.setTimestamp(5,java.sql.Timestamp.valueOf(t.getEntryTime()));return ps;},keys);
   int id=Objects.requireNonNull(keys.getKey()).intValue();
   t.setTicketId(id);
   return Map.of("ticketNo",id,"plate",normalized,"owner",t.getOwnerName(),"type",vt.name(),"slot",t.getSlotNumber(),"entryTime",t.getEntryTime());
  } catch(Exception e){lot.removeTicket(t);throw e;}
 }
 public synchronized Map<String,Object> exit(int ticketNo,int hours){
  if(hours<=0)throw new IllegalArgumentException("Hours must be greater than zero.");
  Ticket t=lot.findTicket(ticketNo); if(t==null)throw new IllegalArgumentException("Invalid active ticket number.");
  double charge=t.getVehicle().calculateCharge(hours); LocalDateTime now=LocalDateTime.now();
  db.update("UPDATE tickets SET exit_time=?,hours=?,charge=? WHERE ticket_no=? AND exit_time IS NULL",java.sql.Timestamp.valueOf(now),hours,charge,ticketNo);
  t.setExitTime(now);t.setHours(hours);t.setCharge(charge);lot.removeTicket(t);
  return Map.of("ticketNo",ticketNo,"plate",t.getVehicle().getPlateNumber(),"hours",hours,"billableHours",Math.min(hours,8),"extraCharge",hours>8?100:0,"charge",charge);
 }
 public synchronized List<Map<String,Object>> slots(){
  List<Map<String,Object>> out=new ArrayList<>(); for(int i=1;i<=20;i++){Ticket t=lot.findTicketAt(i);out.add(Map.of("slot",i,"occupied",t!=null,"plate",t==null?"":t.getVehicle().getPlateNumber(),"ticketNo",t==null?0:t.getTicketId()));}return out;
 }
 public List<Map<String,Object>> history(){
  return db.query("SELECT ticket_no,plate,owner,type,slot,entry_time,exit_time,hours,charge FROM tickets ORDER BY entry_time DESC,ticket_no DESC",(rs,row)->{
   Map<String,Object> item=new LinkedHashMap<>();
   item.put("ticketNo",rs.getLong("ticket_no")); item.put("plate",rs.getString("plate")); item.put("owner",rs.getString("owner"));
   item.put("type",rs.getString("type")); item.put("slot",rs.getInt("slot"));
   var entry=rs.getTimestamp("entry_time"); var exit=rs.getTimestamp("exit_time");
   item.put("entryTime",entry==null?null:entry.toLocalDateTime()); item.put("exitTime",exit==null?null:exit.toLocalDateTime());
   item.put("hours",(Integer)rs.getObject("hours")); item.put("charge",rs.getBigDecimal("charge"));
   item.put("status",exit==null?"PARKED":"EXITED"); return item;
  });
 }
 public Map<String,Object> summary(){return Map.of("parked",db.queryForObject("SELECT COUNT(*) FROM tickets WHERE exit_time IS NULL",Integer.class),"collection",db.queryForObject("SELECT COALESCE(SUM(charge),0) FROM tickets",java.math.BigDecimal.class));}
}
