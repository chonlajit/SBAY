package com.example.iotbackend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "waste_types")
public class WasteType {
    @Id
    private String id;
    
    private String type; // e.g., PLASTIC_BOTTLE, ALUMINUM_CAN, BEVERAGE_CARTON
    private String label; // e.g., ขวดพลาสติก, กระป๋องอลูมิเนียม, กล่องเครื่องดื่ม
    private int points; // Default/fallback points per item
    
    // Market & System Pricing per Kilogram
    private Double pricePerKg; // Real market price per kg (Baht)
    private Double userPointRate; // Proportion given to user (default 0.80 = 80%)
    private Double pointsPerKg; // Points given to user per kg (pricePerKg * userPointRate * 100)
    private Double scorePerGram; // Score points given per gram (pointsPerKg / 1000.0)
    private Double profitPerKg; // System profit in Baht per kg (pricePerKg * (1 - userPointRate))
    private Double profitPointsPerKg; // System profit in Points per kg (profitPerKg * 100)
    
    private LocalDateTime updatedAt;
    private String updatedBy;
}
