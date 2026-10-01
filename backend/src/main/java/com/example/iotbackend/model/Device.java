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

    // Ultrasonic Fill Level (0-100%)
    private Integer fillLevel;
    private LocalDateTime lastFillLevelUpdate;

    // Financial & Profit Tracking (80% User points, 20% Machine profit)
    private Double totalPointsGiven = 0.0;       // 80% แต้มที่แจกให้ผู้ใช้
    private Double totalProfitPoints = 0.0;      // 20% กำไรของระบบ/ตู้ = pointsGiven * 0.25
    private Double totalProfitBaht = 0.0;        // กำไรเป็นเงินบาท (100 แต้ม = 1 บาท)
    private Double totalActualValuePoints = 0.0; // มูลค่าจริง 100% = pointsGiven / 0.80
    private Double totalActualValueBaht = 0.0;   // มูลค่าจริง 100% เป็นเงินบาท
    private Long totalRecycledItems = 0L;        // จำนวนชิ้นขยะที่หยอด
    private Long totalSessions = 0L;             // จำนวนครั้งที่หยอด
}
