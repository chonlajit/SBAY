package com.example.iotbackend.controller;

import com.example.iotbackend.model.Alert;
import com.example.iotbackend.model.Transaction;
import com.example.iotbackend.model.User;
import com.example.iotbackend.repository.AlertRepository;
import com.example.iotbackend.repository.TransactionRepository;
import com.example.iotbackend.repository.UserRepository;
import com.example.iotbackend.repository.RedemptionRepository;
import com.example.iotbackend.service.RecycleService;
import com.example.iotbackend.model.Redemption;
import com.example.iotbackend.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private AlertRepository alertRepository;
    
    @Autowired
    private RedemptionRepository redemptionRepository;

    @Autowired
    private RecycleService recycleService;

    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private com.example.iotbackend.repository.DeviceRepository deviceRepository;
    
    private void validateAdmin(String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing Token");
        }
        String jwt = token.substring(7);
        if (!jwtUtil.validateToken(jwt)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Token");
        }
        String role = jwtUtil.getRoleFromToken(jwt);
        if (!"ADMIN".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied");
        }
    }

    @GetMapping("/users")
    public List<User> getAllUsers(@RequestHeader("Authorization") String token) {
        validateAdmin(token);
        return userRepository.findAll();
    }
    
    @GetMapping("/devices")
    public List<com.example.iotbackend.model.Device> getAllDevices(@RequestHeader("Authorization") String token) {
        validateAdmin(token);
        return deviceRepository.findAll();
    }
    
    @PostMapping("/devices/{id}/reset")
    public Map<String, String> resetDeviceBin(@RequestHeader("Authorization") String token, @PathVariable String id) {
        validateAdmin(token);
        com.example.iotbackend.model.Device device = deviceRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Device not found"));
        
        device.getWasteLevels().clear();
        device.setIsFull(false);
        device.setFullWasteType(null);
        deviceRepository.save(device);
        
        return Map.of("message", "Device waste levels have been reset.");
    }
    
    @DeleteMapping("/user/{id}")
    public void deleteUser(@RequestHeader("Authorization") String token, @PathVariable String id) {
        validateAdmin(token);
        userRepository.deleteById(id);
    }

    @PutMapping("/user/{id}/role")
    public User changeUserRole(@RequestHeader("Authorization") String token, @PathVariable String id, @RequestBody Map<String, String> payload) {
        validateAdmin(token);
        User user = userRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        String newRole = payload.get("role");
        if (newRole != null && (newRole.equals("ADMIN") || newRole.equals("USER") || newRole.equals("PARTNER"))) {
            user.setRole(newRole);
            if ("PARTNER".equals(newRole)) {
                String partnerId = payload.get("partnerId");
                if (partnerId != null && !partnerId.isEmpty()) {
                    user.setPartnerId(partnerId);
                }
            } else {
                user.setPartnerId(null); // clear partnerId when not PARTNER role
            }
            return userRepository.save(user);
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role");
    }
    
    @GetMapping("/redemptions/pending")
    public List<Redemption> getPendingRedemptions(@RequestHeader("Authorization") String token) {
        validateAdmin(token);
        return redemptionRepository.findByStatusOrderByTimestampDesc("PENDING");
    }

    @PostMapping("/redemptions/{id}/approve")
    public Map<String, String> approveRedemption(@RequestHeader("Authorization") String token, @PathVariable String id) {
        validateAdmin(token);
        try {
            recycleService.approveRedemption(id);
            return Map.of("success", "true", "message", "Redemption approved");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PostMapping("/redemptions/{id}/reject")
    public Map<String, String> rejectRedemption(@RequestHeader("Authorization") String token, @PathVariable String id) {
        validateAdmin(token);
        try {
            recycleService.rejectRedemption(id);
            return Map.of("success", "true", "message", "Redemption rejected");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }
    
    @GetMapping("/alerts")
    public List<Alert> getAlerts(@RequestHeader("Authorization") String token) {
        validateAdmin(token);
        return alertRepository.findAllByOrderByTimestampDesc();
    }

    @GetMapping("/summary")
    public Map<String, Object> getSummary(@RequestHeader("Authorization") String token) {
        validateAdmin(token);
        List<User> users = userRepository.findAll();
// ... rest of method
        List<Transaction> transactions = transactionRepository.findAll();

        long totalUsers = users.size();
        long totalPoints = users.stream().mapToInt(User::getPoints).sum();
        List<Redemption> redemptions = redemptionRepository.findAll();
        long totalRedemptions = 0;
        long totalPointsRedeemed = 0;
        for (Redemption r : redemptions) {
            if ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus())) {
                totalRedemptions++;
                totalPointsRedeemed += r.getCost();
            }
        }

        Map<String, Long> wasteStats = new HashMap<>();
        long totalRecycledItems = 0;
        
        for (Transaction tx : transactions) {
            String type = tx.getWasteType();
            if (type != null && !type.startsWith("REDEEM_")) {
                wasteStats.put(type, wasteStats.getOrDefault(type, 0L) + 1);
                totalRecycledItems++;
            }
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalUsers", totalUsers);
        summary.put("totalPoints", totalPoints);
        summary.put("totalRedemptions", totalRedemptions);
        summary.put("totalPointsRedeemed", totalPointsRedeemed);
        summary.put("totalRecycledItems", totalRecycledItems);
        summary.put("wasteStats", wasteStats);

        return summary;
    }

    @PostMapping("/reset")
    public Map<String, String> resetSystem(@RequestHeader("Authorization") String token) {
        validateAdmin(token);
        
        // Delete all transactions
        transactionRepository.deleteAll();
        
        // Reset points for all users
        List<User> users = userRepository.findAll();
        for (User user : users) {
            user.setPoints(0);
        }
        userRepository.saveAll(users);
        
        return Map.of("message", "System transactions and points reset successfully.");
    }
}
