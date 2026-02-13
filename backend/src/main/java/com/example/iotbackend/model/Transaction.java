package com.example.iotbackend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@Document(collection = "transactions")
public class Transaction {
    @Id
    private String id;
    private String userId;
    private String wasteType; // CLEAR_BOTTLE, OPAQUE_BOTTLE, CAN, ALUMINUM
    private int pointsEarned;
    private LocalDateTime timestamp;
}
