package com.example.iotbackend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "waste_types")
public class WasteType {
    @Id
    private String id;
    
    private String type;
    private String label;
    private int points;
}
