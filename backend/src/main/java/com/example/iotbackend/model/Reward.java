package com.example.iotbackend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "rewards")
public class Reward {
    @Id
    private String id;
    private String name;
    private String description;
    private int cost;
    private String imageUrl;
}
