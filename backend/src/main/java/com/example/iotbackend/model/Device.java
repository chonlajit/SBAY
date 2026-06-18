package com.example.iotbackend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Data
@Document(collection = "devices")
public class Device {

    @Id
    private String id;
    
    private String name;
    private String location;
    
    // e.g. "ONLINE" or "OFFLINE"
    private String status;
    
    private LocalDateTime lastHeartbeat;
    
    // Bin Status
    private Map<String, Double> wasteLevels = new HashMap<>();
    private Map<String, Double> maxCapacities = new HashMap<>();
    private Boolean isFull = false;
    private String fullWasteType;
}
