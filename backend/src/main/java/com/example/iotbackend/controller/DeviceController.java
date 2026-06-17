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
        
        // Save or update
        deviceRepository.save(device);
        return ResponseEntity.ok().build();
    }
}
