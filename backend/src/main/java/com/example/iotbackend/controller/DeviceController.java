package com.example.iotbackend.controller;

import com.example.iotbackend.model.Device;
import com.example.iotbackend.repository.DeviceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    @Autowired
    private DeviceRepository deviceRepository;

    @PostMapping("/{deviceId}/heartbeat")
    public ResponseEntity<?> heartbeat(@PathVariable String deviceId) {
        Device device = deviceRepository.findById(deviceId).orElse(new Device());
        device.setId(deviceId);
        device.setStatus("ONLINE");
        device.setLastHeartbeat(LocalDateTime.now());
        
        // Initialize default capacities if empty
        if (device.getMaxCapacities().isEmpty()) {
            device.getMaxCapacities().put("PLASTIC", 100.0);
            device.getMaxCapacities().put("CAN", 100.0);
            device.getMaxCapacities().put("GLASS", 100.0);
            device.getMaxCapacities().put("GENERAL", 100.0);
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
