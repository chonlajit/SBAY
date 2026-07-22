package com.example.iotbackend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@Document(collection = "redemptions")
public class Redemption {
    @Id
    private String id;
    private String userId;
    private String rewardType; // VOLUNTEER or ACTIVITY
    private int cost;
    private double value; // Hours or Credits
    private String details; // Activity Category or "X hours"
    private String status; // PENDING, APPROVED, REJECTED
    private LocalDateTime timestamp;
    
    // Academic details captured at redemption time
    private String title;
    private String firstName;
    private String lastName;
    private String studentId;
    private String faculty;
    private String major;
}
