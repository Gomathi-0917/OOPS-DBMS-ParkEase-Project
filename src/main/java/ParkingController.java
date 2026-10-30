package parkease;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
@RestController @RequestMapping("/api")
public class ParkingController {
 private final ParkingService service; public ParkingController(ParkingService service){this.service=service;}
 private static final Path SOURCE_ROOT=Path.of("src/main").toAbsolutePath().normalize();
 private static final Map<String,String> SOURCE_FILES=Map.ofEntries(
  Map.entry("index.html","resources/static/index.html"),
  Map.entry("style.css","resources/static/style.css"),
  Map.entry("script.js","resources/static/script.js"),
  Map.entry("Vehicle.java","java/Vehicle.java"),
  Map.entry("Car.java","java/Car.java"),
  Map.entry("Bike.java","java/Bike.java"),
  Map.entry("Truck.java","java/Truck.java"),
  Map.entry("VehicleType.java","java/VehicleType.java"),
  Map.entry("Chargeable.java","java/Chargeable.java"),
  Map.entry("Ticket.java","java/Ticket.java"),
  Map.entry("ParkingLot.java","java/ParkingLot.java"),
  Map.entry("ParkingService.java","java/ParkingService.java"),
  Map.entry("ParkingFullException.java","java/ParkingFullException.java"),
  Map.entry("ParkingController.java","java/ParkingController.java"),
  Map.entry("ParkEaseApplication.java","java/ParkEaseApplication.java"),
  Map.entry("application.properties","resources/application.properties"),
  Map.entry("schema.sql","resources/schema.sql")
 );
 record ParkRequest(String type,String plate,String owner){} record ExitRequest(Integer ticketNo,Integer hours){}
 @PostMapping("/park") public Map<String,Object> park(@RequestBody ParkRequest r)throws Exception{return service.park(r.type(),r.plate(),r.owner());}
 @PostMapping("/exit") public Map<String,Object> exit(@RequestBody ExitRequest r){if(r.ticketNo()==null||r.hours()==null)throw new IllegalArgumentException("Ticket number and hours are required.");return service.exit(r.ticketNo(),r.hours());}
 @GetMapping("/slots") public List<Map<String,Object>> slots(){return service.slots();}
 @GetMapping("/summary") public Map<String,Object> summary(){return service.summary();}
 @GetMapping("/history") public List<Map<String,Object>> history(){return service.history();}
 @GetMapping("/source") public Map<String,String> source(@RequestParam String name)throws IOException{
  String relativePath=SOURCE_FILES.get(name);
  if(relativePath==null)throw new IllegalArgumentException("Source file is not available.");
  Path file=SOURCE_ROOT.resolve(relativePath).normalize();
  if(!file.startsWith(SOURCE_ROOT))throw new IllegalArgumentException("Source file is not available.");
  Path realFile=file.toRealPath();
  if(!realFile.startsWith(SOURCE_ROOT.toRealPath()))throw new IllegalArgumentException("Source file is not available.");
  return Map.of("name",name,"content",Files.readString(realFile,StandardCharsets.UTF_8));
 }
 @ExceptionHandler({IllegalArgumentException.class,IllegalStateException.class}) @ResponseStatus(org.springframework.http.HttpStatus.BAD_REQUEST)
 public Map<String,String> error(Exception e){return Map.of("error",e.getMessage()==null?"Request failed":e.getMessage());}
}
