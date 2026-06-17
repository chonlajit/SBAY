package com.example.iotbackend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "device_sessions")
public class DeviceSession {

    @Id
    private String id;
    
    private String deviceId;
    private String userId; // Can be empty if guest/unknown
    
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    
    private List<SessionItem> items;
    
    private Integer totalItems;
    private Double totalMl;
    private Double totalScore;
}
