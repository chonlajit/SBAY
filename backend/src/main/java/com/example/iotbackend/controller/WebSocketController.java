package com.example.iotbackend.controller;

import com.example.iotbackend.service.RecycleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

@Controller
public class WebSocketController {

    @Autowired
    private RecycleService recycleService;

    // Frontend sends login signal via WebSocket here
    @MessageMapping("/login/{machineId}")
    public void handleLogin(@DestinationVariable String machineId, @Payload String userId, org.springframework.messaging.simp.SimpMessageHeaderAccessor headerAccessor) {
        System.out.println("WebSocket Login: Machine=" + machineId + ", User=" + userId);
        recycleService.bindUserToMachine(machineId, userId);
        headerAccessor.getSessionAttributes().put("machineId", machineId);
    }
}
