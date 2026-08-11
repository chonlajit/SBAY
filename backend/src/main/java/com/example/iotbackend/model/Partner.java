package com.example.iotbackend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "partners")
public class Partner {
    @Id
    private String id;
    private String name;           // ชื่อร้าน
    private String description;    // คำอธิบายร้าน
    private String logoUrl;        // URL โลโก้ร้าน
    private String category;       // ประเภทร้าน เช่น อาหาร, ร้านค้า, บริการ
    private boolean active;        // เปิด/ปิด ร้านนี้
    private LocalDateTime createdAt;
    private List<PartnerReward> rewards; // รายการของรางวัลของร้านนี้
    private double accumulatedPoints;    // แต้มสะสมของร้านค้า (หลังจากหัก 10%)
}
