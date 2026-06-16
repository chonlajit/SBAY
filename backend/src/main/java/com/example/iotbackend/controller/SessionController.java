package com.example.iotbackend.controller;

import com.example.iotbackend.model.DeviceSession;
import com.example.iotbackend.model.User;
import com.example.iotbackend.repository.DeviceSessionRepository;
import com.example.iotbackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    @Autowired
    private DeviceSessionRepository sessionRepository;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping("/user/{phone}")
    public ResponseEntity<?> getUserByPhone(@PathVariable String phone) {
        User user = userRepository.findByPhone(phone);
        if (user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<?> createSession(@RequestBody DeviceSession session) {
        session.setEndTime(LocalDateTime.now());
        DeviceSession savedSession = sessionRepository.save(session);
        
        // Broadcast the saved session to the dashboard
        messagingTemplate.convertAndSend("/topic/sessions", savedSession);
        
        return ResponseEntity.ok(savedSession);
    }
}
