package com.example.iotbackend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@Document(collection = "users")
public class User {
    @Id
    private String id;
    
    @Indexed(unique = true)
    private String phoneNumber;
    
    private String username;
    
    private String firstName;
    private String lastName;
    private String email;
    private String studentId;
    private String faculty;
    private String major;
    private String academicYear;
    private String address;
    private Integer age;
    private String profileImageUrl;
    
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password; // Added for password login
    
    private int points;
    
    private String role; // "USER", "ADMIN", "SUPER_ADMIN", or "PARTNER"
    private String partnerId; // กำหนดเมื่อ role = PARTNER เชื่อมกับ Partner document

    // 2FA Protection via Email OTP for all users
    private Boolean twoFactorEnabled;

    // Brute-force protection
    private Integer failedLoginAttempts;
    private java.time.LocalDateTime lockoutUntil;

    public Boolean getTwoFactorEnabled() {
        return twoFactorEnabled != null && twoFactorEnabled;
    }

    public boolean isHasPassword() {
        return password != null && !password.isBlank();
    }
}

