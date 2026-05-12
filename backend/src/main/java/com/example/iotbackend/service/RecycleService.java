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

    public void redeemPoints(String userId, String rewardType, int cost, double value) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getPoints() < cost) {
            throw new RuntimeException("Insufficient points");
        }

        user.setPoints(user.getPoints() - cost);

        if ("VOLUNTEER".equalsIgnoreCase(rewardType)) {
            user.setVolunteerHours(user.getVolunteerHours() + value);
        } else if ("ACTIVITY".equalsIgnoreCase(rewardType)) {
            user.setActivityCredits(user.getActivityCredits() + (int) value);
        }

        userRepository.save(user);

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
}
