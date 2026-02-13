package com.example.iotbackend.controller;

import com.example.iotbackend.model.User;
import com.example.iotbackend.model.Alert;
import com.example.iotbackend.repository.AlertRepository;
import com.example.iotbackend.repository.UserRepository;
import com.example.iotbackend.repository.TransactionRepository;
import com.example.iotbackend.service.RecycleService;
import com.example.iotbackend.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class AppController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private RecycleService recycleService;

    @Autowired
    private AlertRepository alertRepository;
    
    @Autowired
    private JwtUtil jwtUtil;

    // Check Phone (Login)
    @PostMapping("/auth/login")
    public Object login(@RequestBody Map<String, String> payload) {
        String phone = payload.get("phoneNumber");
        String machineId = payload.getOrDefault("machineId", "default-machine");
        
        Optional<User> userOpt = userRepository.findByPhoneNumber(phone);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            recycleService.bindUserToMachine(machineId, user.getId());
            
            // Generate Token
            String token = jwtUtil.generateToken(user);
            
            Map<String, Object> response = new java.util.HashMap<>();
            response.put("user", user);
            response.put("token", token);
            return response;
        } else {
            return Map.of("error", "User not found", "status", 404);
        }
    }

    // Register
    @PostMapping("/auth/register")
    public Object register(@RequestBody Map<String, Object> payload) {
        String machineId = (String) payload.getOrDefault("machineId", "default-machine");
        
        User newUser = new User();
        newUser.setPhoneNumber((String) payload.get("phoneNumber"));
        String firstName = (String) payload.get("firstName");
        newUser.setFirstName(firstName);
        newUser.setLastName((String) payload.get("lastName"));
        newUser.setStudentId((String) payload.get("studentId"));
        newUser.setPoints(0);
        
        // Role Logic
        if ("Admin".equalsIgnoreCase(firstName)) {
            newUser.setRole("ADMIN");
        } else {
            newUser.setRole("USER");
        }
        
        userRepository.save(newUser);
        recycleService.bindUserToMachine(machineId, newUser.getId());
        
        String token = jwtUtil.generateToken(newUser);
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("user", newUser);
        response.put("token", token);
        return response;
    }
    
    @PostMapping("/auth/logout")
    public void logout(@RequestBody Map<String, String> payload) {
        String machineId = payload.getOrDefault("machineId", "default-machine");
        System.out.println("Processing Logout for Machine: " + machineId);
        recycleService.logout(machineId);
    }

    @GetMapping("/user/{id}")
    public User getUser(@PathVariable String id) {
        return userRepository.findById(id).orElseThrow();
    }

    // Called by IoT Device
    @PostMapping("/machine/recycle")
    public void receiveRecycleItem(@RequestBody Map<String, String> payload) {
        String type = payload.get("type"); 
        String machineId = payload.getOrDefault("machineId", "default-machine");
        recycleService.processRecycleItem(machineId, type);
    }
    
    @GetMapping("/transactions/user/{userId}")
    public List<com.example.iotbackend.model.Transaction> getUserTransactions(@PathVariable String userId) {
        return transactionRepository.findByUserIdOrderByTimestampDesc(userId);
    }
    
    // Called by IoT Device
    @PostMapping("/machine/alert")
    public void receiveAlert(@RequestBody Map<String, String> payload) {
        String message = payload.get("message");
        String machineId = payload.getOrDefault("machineId", "default-machine");
        
        System.out.println("ALERT FROM MACHINE " + machineId + ": " + message);
        
        Alert alert = new Alert();
        alert.setMachineId(machineId);
        alert.setMessage(message);
        alert.setType("WARNING"); // Default type
        alert.setTimestamp(java.time.LocalDateTime.now());
        
        alertRepository.save(alert);
    }

    @GetMapping("/machine/{id}/status")
    public Map<String, String> getMachineStatus(@PathVariable String id) {
        String userId = recycleService.getCurrentUser(id);
        System.out.println("Checking status for Machine " + id + ": User=" + userId);
        if (userId != null) {
            return Map.of("status", "ACTIVE", "userId", userId);
        } else {
            return Map.of("status", "IDLE");
        }
    }

    @PostMapping("/redeem")
    public void redeemReward(@RequestBody Map<String, Object> payload) {
        String userId = (String) payload.get("userId");
        String rewardType = (String) payload.get("rewardType");
        int cost = (int) payload.get("cost");
        // Handle double/int conversion safely from JSON
        double value = Double.parseDouble(String.valueOf(payload.get("value")));
        
        recycleService.redeemPoints(userId, rewardType, cost, value);
    }
}
