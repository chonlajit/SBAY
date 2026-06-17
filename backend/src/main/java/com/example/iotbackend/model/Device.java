package com.example.iotbackend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

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
}
