package com.example.iotbackend.service;

import com.example.iotbackend.model.Transaction;
import com.example.iotbackend.model.User;
import com.example.iotbackend.repository.TransactionRepository;
import com.example.iotbackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class RecycleService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private com.example.iotbackend.repository.RedemptionRepository redemptionRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Map<MachineId, UserId>
    private java.util.Map<String, String> machineSessions = new java.util.concurrent.ConcurrentHashMap<>();

    public void bindUserToMachine(String machineId, String userId) {
        machineSessions.put(machineId, userId);
        messagingTemplate.convertAndSend("/topic/status/" + machineId, "User " + userId + " logged in");
    }

    public String getCurrentUser(String machineId) {
        return machineSessions.get(machineId);
    }

    public void logout(String machineId) {
        machineSessions.remove(machineId);
        messagingTemplate.convertAndSend("/topic/status/" + machineId, "Machine Ready");
    }

    public Transaction processRecycleItem(String machineId, String wasteType, int points) {
        String activeUserId = machineSessions.get(machineId);
        
        if (activeUserId == null) {
            throw new RuntimeException("No user logged in to machine " + machineId);
        }

        if (points <= 0) {
            points = calculatePoints(wasteType);
        }

        // Update User Points
        User user = userRepository.findById(activeUserId).orElseThrow();
        user.setPoints(user.getPoints() + points);
        userRepository.save(user);

        // Record Transaction
        Transaction tx = new Transaction();
        tx.setUserId(activeUserId);
        tx.setWasteType(wasteType);
        tx.setPointsEarned(points);
        tx.setTimestamp(LocalDateTime.now());
        transactionRepository.save(tx);

        // Notify Frontend: Machine Specific Topic + User Specific Topic
        messagingTemplate.convertAndSend("/topic/machine/" + machineId, tx);
        messagingTemplate.convertAndSend("/topic/user/" + activeUserId, user);

        return tx;
    }

    private int calculatePoints(String type) {
        switch (type.toUpperCase()) {
            case "CLEAR_BOTTLES": return 1;
            case "OPAQUE_BOTTLES": return 2;
            case "GLASSES_BOTTLES": return 5;
            case "STEEL_CAN": return 2;
            case "ALUMINUM_CANS": return 3;
            default: return 0;
        }
    }

    public void redeemPoints(String userId, String rewardType, int cost, double value, String details) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getPoints() < cost) {
            throw new RuntimeException("Insufficient points");
        }

        user.setPoints(user.getPoints() - cost);
        userRepository.save(user);

        // Create PENDING Redemption
        com.example.iotbackend.model.Redemption redemption = new com.example.iotbackend.model.Redemption();
        redemption.setUserId(userId);
        redemption.setRewardType(rewardType);
        redemption.setCost(cost);
        redemption.setValue(value);
        redemption.setDetails(details);
        redemption.setStatus("PENDING");
        redemption.setTimestamp(LocalDateTime.now());
        redemptionRepository.save(redemption);

        // Record Transaction
        Transaction tx = new Transaction();
        tx.setUserId(userId);
        tx.setWasteType("REDEEM_" + rewardType);
        tx.setPointsEarned(-cost);
        tx.setTimestamp(LocalDateTime.now());
        transactionRepository.save(tx);

        // Notify User Topic
        messagingTemplate.convertAndSend("/topic/user/" + userId, user);
    }

    public void approveRedemption(String redemptionId) {
        com.example.iotbackend.model.Redemption redemption = redemptionRepository.findById(redemptionId)
                .orElseThrow(() -> new RuntimeException("Redemption not found"));
        
        if (!"PENDING".equals(redemption.getStatus())) {
            throw new RuntimeException("Redemption is not pending");
        }

        User user = userRepository.findById(redemption.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if ("VOLUNTEER".equalsIgnoreCase(redemption.getRewardType())) {
            user.setVolunteerHours(user.getVolunteerHours() + redemption.getValue());
        } else if ("ACTIVITY".equalsIgnoreCase(redemption.getRewardType())) {
            user.setActivityCredits(user.getActivityCredits() + (int) redemption.getValue());
        }

        userRepository.save(user);
        
        redemption.setStatus("APPROVED");
        redemptionRepository.save(redemption);

        messagingTemplate.convertAndSend("/topic/user/" + user.getId(), user);
    }

    public void rejectRedemption(String redemptionId) {
        com.example.iotbackend.model.Redemption redemption = redemptionRepository.findById(redemptionId)
                .orElseThrow(() -> new RuntimeException("Redemption not found"));
        
        if (!"PENDING".equals(redemption.getStatus())) {
            throw new RuntimeException("Redemption is not pending");
        }

        User user = userRepository.findById(redemption.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Refund points
        user.setPoints(user.getPoints() + redemption.getCost());
        userRepository.save(user);

        redemption.setStatus("REJECTED");
        redemptionRepository.save(redemption);

        messagingTemplate.convertAndSend("/topic/user/" + user.getId(), user);
    }
}
