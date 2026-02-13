package com.example.iotbackend.listener;

import com.example.iotbackend.service.RecycleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketEventListener {

    @Autowired
    private RecycleService recycleService;

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String machineId = (String) headerAccessor.getSessionAttributes().get("machineId");

        if (machineId != null) {
            System.out.println("User Disconnected! Releasing machine: " + machineId);
            recycleService.logout(machineId);
        }
    }
}
