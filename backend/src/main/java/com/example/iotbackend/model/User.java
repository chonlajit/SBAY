package com.example.iotbackend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

@Data
@Document(collection = "users")
public class User {
    @Id
    private String id;
    
    private String phoneNumber;
    
    private String username;
    
    private String title;
    private String firstName;
    private String lastName;
    private String email;
    private String studentId;
    private String faculty;
    private String major;
    
    private String password; // Added for password login
    
    private int points;
    
    private double volunteerHours;
    private int activityCredits;
    
    private String role; // "USER", "ADMIN", or "PARTNER"
    private String partnerId; // กำหนดเมื่อ role = PARTNER เชื่อมกับ Partner document
}
