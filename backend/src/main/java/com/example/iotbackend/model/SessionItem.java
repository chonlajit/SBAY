package com.example.iotbackend.model;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SessionItem {
    private String type; // e.g., PLASTIC_BOTTLE, CAN, GLASS
    private String size; // e.g., SMALL, MEDIUM, LARGE
    private Double ml;   // Estimated volume in ml
    private LocalDateTime timestamp;
}
