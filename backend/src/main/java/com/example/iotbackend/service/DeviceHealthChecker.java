package com.example.iotbackend.service;

import com.example.iotbackend.model.Device;
import com.example.iotbackend.repository.DeviceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class DeviceHealthChecker {

    @Autowired
    private DeviceRepository deviceRepository;

    /**
     * ทุก 30 วินาที ตรวจสอบว่าตู้ไหนไม่ส่ง heartbeat มาเกิน 90 วินาที
     * ถ้าเกิน → ตั้งสถานะเป็น OFFLINE
     */
    @Scheduled(fixedRate = 30000)
    public void checkDeviceHealth() {
        LocalDateTime threshold = LocalDateTime.now().minusSeconds(90);
        List<Device> devices = deviceRepository.findAll();

        for (Device device : devices) {
            if ("ONLINE".equals(device.getStatus()) && device.getLastHeartbeat() != null
                    && device.getLastHeartbeat().isBefore(threshold)) {
                device.setStatus("OFFLINE");
                deviceRepository.save(device);
            }
        }
    }
}
