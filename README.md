# ParkEase web app

## Requirements
- Java 17 or newer
- Maven 3.9+

## Database
H2 runs embedded in the app and persists data in `data/parkease.mv.db`. No database installation or password setup is needed. The app creates the `tickets` table on startup.

## Start
From this folder:

```powershell
mvn spring-boot:run
```

Open <http://localhost:8080>. To build a runnable jar:

```powershell
mvn clean package
java -jar target/parkease-1.0.0.jar
```

The REST endpoints are `POST /api/park`, `POST /api/exit`, `GET /api/slots`, `GET /api/summary`, and `GET /api/history`.
