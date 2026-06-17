package com.example.iotbackend.controller;

import com.example.iotbackend.model.DeviceSession;
import com.example.iotbackend.model.SessionItem;
import com.example.iotbackend.model.Transaction;
import com.example.iotbackend.model.User;
import com.example.iotbackend.repository.DeviceSessionRepository;
import com.example.iotbackend.repository.TransactionRepository;
import com.example.iotbackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    @Autowired
    private DeviceSessionRepository sessionRepository;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private TransactionRepository transactionRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping("/user/{phone}")
    public ResponseEntity<?> getUserByPhone(@PathVariable String phone) {
        Optional<User> userOpt = userRepository.findByPhoneNumber(phone);
        if (userOpt.isPresent()) {
            return ResponseEntity.ok(userOpt.get());
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<?> createSession(@RequestBody DeviceSession session) {
        session.setEndTime(LocalDateTime.now());
        DeviceSession savedSession = sessionRepository.save(session);
        
        // Update user points if userId is provided
        if (session.getUserId() != null && !session.getUserId().isEmpty()) {
            Optional<User> userOpt = userRepository.findById(session.getUserId());
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                if (session.getTotalScore() != null) {
                    user.setPoints(user.getPoints() + (int) Math.round(session.getTotalScore()));
                }
                userRepository.save(user);
                
                // Broadcast updated user info
                messagingTemplate.convertAndSend("/topic/user/" + user.getId(), user);
            }
        }
        
        // Create Transaction records for the Dashboard
        if (session.getItems() != null && session.getUserId() != null && !session.getUserId().isEmpty()) {
            for (SessionItem item : session.getItems()) {
                Transaction tx = new Transaction();
                tx.setUserId(session.getUserId());
                tx.setWasteType(item.getType());
                tx.setPointsEarned(item.getScore() != null ? (int) Math.round(item.getScore()) : 0);
                tx.setTimestamp(item.getTimestamp() != null ? item.getTimestamp() : LocalDateTime.now());
                transactionRepository.save(tx);
            }
        }
        
        // Broadcast the saved session to the dashboard
        messagingTemplate.convertAndSend("/topic/sessions", savedSession);
        
        return ResponseEntity.ok(savedSession);
    }
}
