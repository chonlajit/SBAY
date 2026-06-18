package com.example.iotbackend.controller;

import com.example.iotbackend.model.Device;
import com.example.iotbackend.repository.DeviceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    @Autowired
    private DeviceRepository deviceRepository;

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
        
        // Initialize default capacities if empty
        if (device.getMaxCapacities().isEmpty()) {
            device.getMaxCapacities().put("CLEAR_BOTTLE", 100.0);
            device.getMaxCapacities().put("OPAQUE_BOTTLE", 100.0);
            device.getMaxCapacities().put("GLASSES_BOTTLE", 100.0);
            device.getMaxCapacities().put("STEEL_CAN", 100.0);
            device.getMaxCapacities().put("ALUMINUM_CAN", 100.0);
        }
        
        // Save or update
        deviceRepository.save(device);
        return ResponseEntity.ok().build();
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

        if (payload.containsKey("isFull")) {
            device.setIsFull((Boolean) payload.get("isFull"));
        }
        
        if (payload.containsKey("fullWasteType")) {
            device.setFullWasteType((String) payload.get("fullWasteType"));
        }

        deviceRepository.save(device);
        return ResponseEntity.ok().build();
    }
}
