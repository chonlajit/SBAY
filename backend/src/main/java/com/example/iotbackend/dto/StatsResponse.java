package com.example.iotbackend.dto;

import lombok.Data;
import java.util.Map;
import java.util.List;

@Data
public class StatsResponse {
    private long totalItems;
    private double totalWeightKg;
    private double totalCarbonReductionKg;
    private double carbonCredits;
    private Map<String, Long> itemsByType;
}
