package com.example.iotbackend.controller;

import com.example.iotbackend.dto.StatsResponse;
import com.example.iotbackend.model.DeviceSession;
import com.example.iotbackend.model.SessionItem;
import com.example.iotbackend.repository.DeviceSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stats")
@CrossOrigin(origins = "*")
public class StatsController {

    @Autowired
    private DeviceSessionRepository deviceSessionRepository;

    private static class CacheEntry {
        StatsResponse response;
        long timestamp;
        CacheEntry(StatsResponse response, long timestamp) {
            this.response = response;
            this.timestamp = timestamp;
        }
    }

    private final Map<String, CacheEntry> cache = new java.util.concurrent.ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 60000; // 1 minute

    @GetMapping
    public StatsResponse getGlobalStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        String cacheKey = (startDate != null ? startDate.toString() : "null") + "_" + 
                          (endDate != null ? endDate.toString() : "null");
                          
        CacheEntry entry = cache.get(cacheKey);
        if (entry != null && (System.currentTimeMillis() - entry.timestamp) < CACHE_TTL_MS) {
            return entry.response;
        }

        List<DeviceSession> sessions;
        if (startDate != null && endDate != null) {
            sessions = deviceSessionRepository.findByStartTimeBetween(startDate, endDate);
        } else {
            sessions = deviceSessionRepository.findAll();
        }

        long totalItems = 0;
        double totalWeightKg = 0;
        double totalCarbonReductionKg = 0;
        Map<String, Long> itemsByType = new HashMap<>();

        for (DeviceSession session : sessions) {
            if (session.getItems() != null) {
                for (SessionItem item : session.getItems()) {
                    totalItems++;

                    double weightKg = 0;
                    if (item.getWeight() != null) {
                        weightKg = item.getWeight() / 1000.0;
                        totalWeightKg += weightKg;
                    }

                    String type = item.getType() != null ? item.getType().toUpperCase() : "UNKNOWN";
                    itemsByType.put(type, itemsByType.getOrDefault(type, 0L) + 1);

                    // Carbon Footprint calculation based on standard factors
                    double carbonFactor = 0;
                    if ("PLASTIC_BOTTLE".equals(type) || "CLEAR_BOTTLE".equals(type)) {
                        carbonFactor = 2.5;
                    } else if ("ALUMINUM_CAN".equals(type)) {
                        carbonFactor = 11.0;
                    } else if ("BEVERAGE_CARTON".equals(type)) {
                        carbonFactor = 1.0;
                    } else {
                        // generic fallback
                        carbonFactor = 1.0;
                    }
                    totalCarbonReductionKg += (weightKg * carbonFactor);
                }
            }
        }

        StatsResponse response = new StatsResponse();
        response.setTotalItems(totalItems);
        response.setTotalWeightKg(Math.round(totalWeightKg * 100.0) / 100.0);
        response.setTotalCarbonReductionKg(Math.round(totalCarbonReductionKg * 100.0) / 100.0);
        response.setCarbonCredits(Math.round((totalCarbonReductionKg / 1000.0) * 1000.0) / 1000.0);
        response.setItemsByType(itemsByType);

        cache.put(cacheKey, new CacheEntry(response, System.currentTimeMillis()));

        return response;
    }
}
