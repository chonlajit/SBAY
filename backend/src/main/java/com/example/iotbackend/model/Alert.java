package com.example.iotbackend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@Document(collection = "alerts")
public class Alert {
    @Id
    private String id;
    
    private String machineId;
    private String message;
    private String type; // ERROR, WARNING, INFO
    
    private LocalDateTime timestamp;
}
