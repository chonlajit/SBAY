package com.example.iotbackend.model;

import lombok.Data;

@Data
public class PartnerReward {
    private String id;             // UUID หรือ slug
    private String name;           // ชื่อของรางวัล เช่น "ส่วนลด 10%"
    private String description;    // รายละเอียดเพิ่มเติม
    private int pointCost;         // ต้องใช้กี่แต้ม
    private String rewardType;     // DISCOUNT, FREEBIE, VOUCHER, OTHER
    private String category;       // สินค้า | ส่วนลดร้านค้า | สำหรับนักศึกษา
    private String imageUrl;       // รูปของรางวัล
    private boolean active;        // เปิด/ปิด รายการนี้
    private int stock;             // -1 = ไม่จำกัด, 0+ = จำนวนคงเหลือ
}
