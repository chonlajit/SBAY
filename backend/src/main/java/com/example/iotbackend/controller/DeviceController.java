package com.example.iotbackend.controller;

import com.example.iotbackend.model.Device;
import com.example.iotbackend.repository.DeviceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/devices")
@CrossOrigin(origins = "*")
public class DeviceController {

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private com.example.iotbackend.repository.WasteTypeRepository wasteTypeRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping("/pricing")
    public ResponseEntity<?> getDevicePricing() {
        java.util.List<com.example.iotbackend.model.WasteType> wasteTypes = wasteTypeRepository.findAll();
        
        Map<String, Object> pricingMap = new java.util.HashMap<>();
        Map<String, Double> scorePerGramMap = new java.util.HashMap<>();
        Map<String, Double> pricePerKgMap = new java.util.HashMap<>();
        Map<String, Double> pointsPerKgMap = new java.util.HashMap<>();

        for (com.example.iotbackend.model.WasteType wt : wasteTypes) {
            String type = wt.getType();
            if (type == null) continue;
            
            double priceKg = wt.getPricePerKg() != null ? wt.getPricePerKg() : 10.0;
            double userRate = wt.getUserPointRate() != null ? wt.getUserPointRate() : 0.80;
            double ptsKg = wt.getPointsPerKg() != null ? wt.getPointsPerKg() : (priceKg * userRate * 100.0);
            double scoreGram = wt.getScorePerGram() != null ? wt.getScorePerGram() : (ptsKg / 1000.0);
            double profitKg = wt.getProfitPerKg() != null ? wt.getProfitPerKg() : (priceKg * (1.0 - userRate));

            Map<String, Object> itemDetail = new java.util.HashMap<>();
            itemDetail.put("type", type);
            itemDetail.put("label", wt.getLabel() != null ? wt.getLabel() : type);
            itemDetail.put("pricePerKg", priceKg);
            itemDetail.put("userPointRate", userRate);
            itemDetail.put("pointsPerKg", ptsKg);
            itemDetail.put("scorePerGram", scoreGram);
            itemDetail.put("profitPerKg", profitKg);
            itemDetail.put("updatedAt", wt.getUpdatedAt() != null ? wt.getUpdatedAt().toString() : LocalDateTime.now().toString());

            pricingMap.put(type, itemDetail);
            scorePerGramMap.put(type, scoreGram);
            pricePerKgMap.put(type, priceKg);
            pointsPerKgMap.put(type, ptsKg);
        }

        // Guaranteed fallbacks if database was empty
        if (!scorePerGramMap.containsKey("PLASTIC_BOTTLE")) scorePerGramMap.put("PLASTIC_BOTTLE", 0.8);
        if (!scorePerGramMap.containsKey("ALUMINUM_CAN")) scorePerGramMap.put("ALUMINUM_CAN", 3.2);
        if (!scorePerGramMap.containsKey("BEVERAGE_CARTON")) scorePerGramMap.put("BEVERAGE_CARTON", 0.72);

        if (!pricePerKgMap.containsKey("PLASTIC_BOTTLE")) pricePerKgMap.put("PLASTIC_BOTTLE", 10.0);
        if (!pricePerKgMap.containsKey("ALUMINUM_CAN")) pricePerKgMap.put("ALUMINUM_CAN", 40.0);
        if (!pricePerKgMap.containsKey("BEVERAGE_CARTON")) pricePerKgMap.put("BEVERAGE_CARTON", 9.0);

        Map<String, Object> response = new java.util.HashMap<>();
        response.put("status", "success");
        response.put("version", 1);
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("userPointRate", 0.80);
        response.put("pricing", pricingMap);
        response.put("scorePerGram", scorePerGramMap);
        response.put("pricePerKg", pricePerKgMap);
        response.put("pointsPerKg", pointsPerKgMap);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{deviceId}/heartbeat")
    public ResponseEntity<?> heartbeat(
            @PathVariable String deviceId,
            @RequestBody(required = false) Map<String, String> payload) {
        Device device = deviceRepository.findById(deviceId).orElse(new Device());
        device.setId(deviceId);
        device.setStatus("ONLINE");
        device.setLastHeartbeat(LocalDateTime.now());
        
        // Update name and location from IoT payload (if provided)
        if (payload != null) {
            if (payload.containsKey("name") && payload.get("name") != null && !payload.get("name").trim().isEmpty()) {
                device.setName(payload.get("name"));
            }
            if (payload.containsKey("location") && payload.get("location") != null && !payload.get("location").trim().isEmpty()) {
                device.setLocation(payload.get("location"));
            }
        }
        
        // Fallback defaults if still empty
        if (device.getName() == null || device.getName().trim().isEmpty()) {
            device.setName("Smart Bin " + deviceId.substring(0, Math.min(deviceId.length(), 6)));
        }
        if (device.getLocation() == null || device.getLocation().trim().isEmpty()) {
            device.setLocation("ไม่ระบุสถานที่");
        }
        
        // Ensure default capacities exist for all required types
        device.getMaxCapacities().putIfAbsent("PLASTIC_BOTTLE", 100.0);
        device.getMaxCapacities().putIfAbsent("ALUMINUM_CAN", 100.0);
        device.getMaxCapacities().putIfAbsent("BEVERAGE_CARTON", 100.0);
        
        // Remove old unused types
        device.getMaxCapacities().remove("CLEAR_BOTTLE");
        device.getMaxCapacities().remove("OPAQUE_BOTTLE");
        device.getMaxCapacities().remove("GLASSES_BOTTLE");
        device.getMaxCapacities().remove("STEEL_CAN");
        device.getMaxCapacities().remove("PLASTIC");
        device.getMaxCapacities().remove("CAN");
        device.getMaxCapacities().remove("GLASS");
        device.getMaxCapacities().remove("GENERAL");
        
        // Save or update
        deviceRepository.save(device);
        return ResponseEntity.ok(device);
    }

    @PostMapping("/fill-level")
    public ResponseEntity<?> updateFillLevelDirect(@RequestBody Map<String, Object> payload) {
        String machineId = (String) payload.get("machineId");
        if (machineId == null || machineId.trim().isEmpty()) {
            machineId = (String) payload.get("deviceId");
        }
        if (machineId == null || machineId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "machineId is required"));
        }
        return processFillLevelUpdate(machineId, payload);
    }

    @PostMapping("/{deviceId}/fill-level")
    public ResponseEntity<?> updateFillLevelByPath(
            @PathVariable String deviceId,
            @RequestBody Map<String, Object> payload) {
        return processFillLevelUpdate(deviceId, payload);
    }

    private ResponseEntity<?> processFillLevelUpdate(String machineId, Map<String, Object> payload) {
        Device device = deviceRepository.findById(machineId).orElseGet(() -> {
            Device d = new Device();
            d.setId(machineId);
            d.setName("Smart Bin " + machineId);
            d.setLocation("ไม่ระบุสถานที่");
            return d;
        });

        Object rawLevel = payload.get("fillLevel");
        if (rawLevel == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "fillLevel is required"));
        }

        int fillLevel;
        try {
            if (rawLevel instanceof Number) {
                fillLevel = ((Number) rawLevel).intValue();
            } else {
                fillLevel = (int) Math.round(Double.parseDouble(rawLevel.toString()));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid fillLevel format"));
        }

        // Clamp to 0 - 100
        int clampedLevel = Math.max(0, Math.min(100, fillLevel));
        device.setFillLevel(clampedLevel);

        LocalDateTime updateTime = LocalDateTime.now();
        if (payload.containsKey("timestamp") && payload.get("timestamp") != null) {
            try {
                updateTime = LocalDateTime.parse(payload.get("timestamp").toString());
            } catch (Exception ignored) {
                // Keep updateTime as now
            }
        }
        device.setLastFillLevelUpdate(updateTime);
        device.setLastHeartbeat(LocalDateTime.now());
        device.setStatus("ONLINE");

        // Status thresholds: 0-79% NORMAL, 80-94% NEAR_FULL, 95-100% FULL
        if (clampedLevel >= 95) {
            device.setIsFull(true);
        } else {
            device.setIsFull(false);
        }

        deviceRepository.save(device);

        // Broadcast to WebSocket for live admin updates
        Map<String, Object> broadcastData = new java.util.HashMap<>();
        broadcastData.put("machineId", machineId);
        broadcastData.put("fillLevel", clampedLevel);
        broadcastData.put("wasteLevels", device.getWasteLevels() != null ? device.getWasteLevels() : Map.of());
        broadcastData.put("maxCapacities", device.getMaxCapacities() != null ? device.getMaxCapacities() : Map.of());
        broadcastData.put("isFull", device.getIsFull() != null ? device.getIsFull() : false);
        broadcastData.put("fullWasteType", device.getFullWasteType() != null ? device.getFullWasteType() : "");
        broadcastData.put("status", device.getStatus() != null ? device.getStatus() : "ONLINE");
        broadcastData.put("timestamp", updateTime.toString());
        messagingTemplate.convertAndSend("/topic/devices", broadcastData);
        messagingTemplate.convertAndSend("/topic/devices/" + machineId, broadcastData);

        return ResponseEntity.ok(device);
    }

    @PostMapping("/{deviceId}/level")
    public ResponseEntity<?> updateLevel(@PathVariable String deviceId, @RequestBody Map<String, Object> payload) {
        Device device = deviceRepository.findById(deviceId).orElseThrow(() -> new RuntimeException("Device not found"));
        
        if (payload.containsKey("wasteLevels")) {
            Map<String, Number> levels = (Map<String, Number>) payload.get("wasteLevels");
            for (Map.Entry<String, Number> entry : levels.entrySet()) {
                device.getWasteLevels().put(entry.getKey(), entry.getValue().doubleValue());
            }
        }
        
        if (payload.containsKey("maxCapacities")) {
            Map<String, Number> capacities = (Map<String, Number>) payload.get("maxCapacities");
            for (Map.Entry<String, Number> entry : capacities.entrySet()) {
                device.getMaxCapacities().put(entry.getKey(), entry.getValue().doubleValue());
            }
        }

        LocalDateTime now = LocalDateTime.now();
        if (payload.containsKey("fillLevel")) {
            Object rawLevel = payload.get("fillLevel");
            if (rawLevel instanceof Number) {
                int fill = ((Number) rawLevel).intValue();
                int clamped = Math.max(0, Math.min(100, fill));
                device.setFillLevel(clamped);
                device.setLastFillLevelUpdate(now);
                if (clamped >= 95) {
                    device.setIsFull(true);
                } else {
                    device.setIsFull(false);
                }
            }
        } else if (device.getWasteLevels() != null && !device.getWasteLevels().isEmpty()) {
            // Auto-calculate fillLevel from the highest percentage among compartments
            double maxPct = 0.0;
            for (Map.Entry<String, Double> entry : device.getWasteLevels().entrySet()) {
                double cap = device.getMaxCapacities().getOrDefault(entry.getKey(), 100.0);
                if (cap > 0) {
                    double pct = (entry.getValue() / cap) * 100.0;
                    if (pct > maxPct) maxPct = pct;
                }
            }
            int clamped = Math.max(0, Math.min(100, (int) Math.round(maxPct)));
            device.setFillLevel(clamped);
            device.setLastFillLevelUpdate(now);
        }

        if (payload.containsKey("isFull")) {
            device.setIsFull((Boolean) payload.get("isFull"));
        }
        
        if (payload.containsKey("fullWasteType")) {
            device.setFullWasteType((String) payload.get("fullWasteType"));
        }

        device.setStatus("ONLINE");
        device.setLastHeartbeat(now);
        deviceRepository.save(device);

        // Broadcast to WebSocket for live admin updates
        Map<String, Object> broadcastData = new java.util.HashMap<>();
        broadcastData.put("machineId", deviceId);
        broadcastData.put("fillLevel", device.getFillLevel() != null ? device.getFillLevel() : 0);
        broadcastData.put("wasteLevels", device.getWasteLevels() != null ? device.getWasteLevels() : Map.of());
        broadcastData.put("maxCapacities", device.getMaxCapacities() != null ? device.getMaxCapacities() : Map.of());
        broadcastData.put("isFull", device.getIsFull() != null ? device.getIsFull() : false);
        broadcastData.put("fullWasteType", device.getFullWasteType() != null ? device.getFullWasteType() : "");
        broadcastData.put("status", device.getStatus() != null ? device.getStatus() : "ONLINE");
        broadcastData.put("timestamp", now.toString());
        messagingTemplate.convertAndSend("/topic/devices", broadcastData);
        messagingTemplate.convertAndSend("/topic/devices/" + deviceId, broadcastData);

        return ResponseEntity.ok(device);
    }

    @PostMapping("/{deviceId}/reset")
    public ResponseEntity<?> resetBin(@PathVariable String deviceId, @RequestBody(required = false) Map<String, String> payload) {
        Device device = deviceRepository.findById(deviceId).orElseThrow(() -> new RuntimeException("Device not found"));
        
        String type = (payload != null) ? payload.get("type") : null;
        
        if (type != null && !type.equalsIgnoreCase("ALL")) {
            // Reset specific type
            device.getWasteLevels().put(type.toUpperCase(), 0.0);
            
            // Check if device is still full after this reset
            boolean stillFull = false;
            for (Map.Entry<String, Double> entry : device.getWasteLevels().entrySet()) {
                Double max = device.getMaxCapacities().getOrDefault(entry.getKey(), 100.0);
                if (entry.getValue() >= max) {
                    stillFull = true;
                    device.setFullWasteType(entry.getKey());
                    break;
                }
            }
            if (!stillFull) {
                device.setIsFull(false);
                device.setFullWasteType(null);
            }
        } else {
            // Reset all
            device.getWasteLevels().clear();
            device.setIsFull(false);
            device.setFullWasteType(null);
        }
        
        deviceRepository.save(device);
        
        // Note: The frontend AdminPage refreshes automatically or on button click, 
        // but broadcasting via WebSocket can update active screens immediately.
        messagingTemplate.convertAndSend("/topic/status/" + deviceId, "Device Reset");
        
        return ResponseEntity.ok(Map.of("message", "Reset successful", "type", type != null ? type : "ALL"));
    }
}
