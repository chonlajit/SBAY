package com.example.iotbackend.controller;

import com.example.iotbackend.model.Alert;
import com.example.iotbackend.model.Transaction;
import com.example.iotbackend.model.User;
import com.example.iotbackend.repository.AlertRepository;
import com.example.iotbackend.repository.TransactionRepository;
import com.example.iotbackend.repository.UserRepository;
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
    private JwtUtil jwtUtil;
    
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
    
    @DeleteMapping("/user/{id}")
    public void deleteUser(@RequestHeader("Authorization") String token, @PathVariable String id) {
        validateAdmin(token);
        userRepository.deleteById(id);
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
        double totalVolunteerHours = users.stream().mapToDouble(User::getVolunteerHours).sum();
        long totalActivityCredits = users.stream().mapToInt(User::getActivityCredits).sum();

        Map<String, Long> wasteStats = new HashMap<>();
        long totalRecycledItems = 0;
        
        for (Transaction tx : transactions) {
            String type = tx.getWasteType();
            // Filter out Redemptions (which start with REDEEM_)
            if (type != null && !type.startsWith("REDEEM_")) {
                wasteStats.put(type, wasteStats.getOrDefault(type, 0L) + 1);
                totalRecycledItems++;
            }
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalUsers", totalUsers);
        summary.put("totalPoints", totalPoints);
        summary.put("totalVolunteerHours", totalVolunteerHours);
        summary.put("totalActivityCredits", totalActivityCredits);
        summary.put("totalRecycledItems", totalRecycledItems);
        summary.put("wasteStats", wasteStats);

        return summary;
    }
}
