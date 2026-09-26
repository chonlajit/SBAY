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

    @Autowired
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private com.example.iotbackend.service.AuditService auditService;

    @Autowired
    private com.example.iotbackend.repository.AuditLogRepository auditLogRepository;

    private User getAdminUser(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            String jwt = token.substring(7);
            String userId = jwtUtil.getUserIdFromToken(jwt);
            return userRepository.findById(userId).orElse(null);
        }
        return null;
    }

    private boolean isSuperAdmin(User user, String role) {
        if ("SUPER_ADMIN".equals(role)) return true;
        if (user != null) {
            if ("SUPER_ADMIN".equals(user.getRole())) return true;
            if ("sbay.smartcompany@gmail.com".equalsIgnoreCase(user.getEmail())) return true;
        }
        return false;
    }

    private User validateAdmin(String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing Token");
        }
        String jwt = token.substring(7);
        if (!jwtUtil.validateToken(jwt)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Token");
        }
        User user = getAdminUser(token);
        String role = jwtUtil.getRoleFromToken(jwt);
        if (user != null && "sbay.smartcompany@gmail.com".equalsIgnoreCase(user.getEmail())) {
            return user;
        }
        if (!"ADMIN".equals(role) && !"SUPER_ADMIN".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied: คุณไม่มีสิทธิ์ผู้ดูแลระบบ");
        }
        return user;
    }

    private User validateSuperAdmin(String token) {
        User user = validateAdmin(token);
        String role = jwtUtil.getRoleFromToken(token.substring(7));
        if (!isSuperAdmin(user, role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied: เฉพาะ Super Admin เท่านั้นที่สามารถดูหรือดำเนินการในส่วนนี้ได้");
        }
        return user;
    }

    @GetMapping("/audit-logs")
    public List<com.example.iotbackend.model.AuditLog> getAuditLogs(@RequestHeader("Authorization") String token) {
        // เฉพาะ Super Admin เท่านั้นที่เห็น Audit Log
        validateSuperAdmin(token);
        return auditLogRepository.findTop100ByOrderByTimestampDesc();
    }

    @PostMapping("/audit-logs/{id}/revert")
    public Map<String, Object> revertAuditLog(@RequestHeader("Authorization") String token, @PathVariable String id, jakarta.servlet.http.HttpServletRequest request) {
        User superAdmin = validateSuperAdmin(token);
        String adminEmail = superAdmin != null ? superAdmin.getEmail() : "SUPER_ADMIN";
        String adminName = superAdmin != null ? (superAdmin.getUsername() != null ? superAdmin.getUsername() : superAdmin.getFirstName()) : "SuperAdmin";

        com.example.iotbackend.model.AuditLog log = auditLogRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบรายการ Audit Log นี้"));

        if (Boolean.TRUE.equals(log.getReverted())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "รายการนี้ถูกคืนค่า (Revert) ไปแล้ว");
        }

        String action = log.getAction();
        String message = "";

        if ("ROLE_CHANGE".equals(action)) {
            String previousRole = log.getPreviousData();
            if (previousRole == null || previousRole.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ไม่มีข้อมูลสิทธิ์เดิมสำหรับการคืนค่า");
            }
            User user = userRepository.findById(log.getTargetId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบผู้ใช้เป้าหมายในระบบ"));
            user.setRole(previousRole);
            if (!"PARTNER".equals(previousRole)) {
                user.setPartnerId(null);
            }
            userRepository.save(user);
            message = "คืนค่าสิทธิ์ผู้ใช้ " + (user.getUsername() != null ? user.getUsername() : user.getEmail()) + " กลับเป็น " + previousRole + " สำเร็จ";
        } else if ("USER_DELETE".equals(action)) {
            String userJson = log.getPreviousData();
            if (userJson == null || userJson.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ไม่มีข้อมูลเดิมของผู้ใช้สำหรับการกู้คืน");
            }
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
                User restoredUser = mapper.readValue(userJson, User.class);
                userRepository.save(restoredUser);
                message = "กู้คืนบัญชีผู้ใช้ " + (restoredUser.getUsername() != null ? restoredUser.getUsername() : restoredUser.getEmail()) + " กลับคืนสู่ระบบสำเร็จ";
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "กู้คืนข้อมูลล้มเหลว: " + e.getMessage());
            }
        } else if ("DEVICE_RESET".equals(action)) {
            message = "รับทราบการยกเลิกรีเซ็ตตู้ " + log.getTargetId() + " (ตู้จะอัปเดตระดับขยะตามเซนเซอร์จริงในรอบถัดไป)";
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กิจกรรมประเภทนี้ไม่รองรับการคืนค่าอัตโนมัติ");
        }

        log.setReverted(true);
        log.setRevertedAt(java.time.LocalDateTime.now(java.time.ZoneId.of("Asia/Bangkok")));
        log.setRevertedBy(adminEmail);
        auditLogRepository.save(log);
        String superAdminId = superAdmin != null ? superAdmin.getId() : "SUPER_ADMIN";
        auditService.logAction(superAdminId, adminEmail, adminName, "ACTION_REVERT", log.getId(), log.getAction(),
                "Super Admin คืนค่า (Rollback) กิจกรรม " + log.getAction() + ": " + message, request);

        return Map.of("success", true, "message", message);
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
    public Map<String, String> resetDeviceBin(@RequestHeader("Authorization") String token, @PathVariable String id, jakarta.servlet.http.HttpServletRequest request) {
        validateAdmin(token);
        User admin = getAdminUser(token);
        String adminId = admin != null ? admin.getId() : "ADMIN";
        String adminEmail = admin != null ? admin.getEmail() : "ADMIN";
        String adminName = admin != null ? (admin.getUsername() != null ? admin.getUsername() : admin.getFirstName()) : "Admin";

        com.example.iotbackend.model.Device device = deviceRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Device not found"));
        
        device.getWasteLevels().clear();
        device.getWasteLevels().put("PLASTIC_BOTTLE", 0.0);
        device.getWasteLevels().put("ALUMINUM_CAN", 0.0);
        device.getWasteLevels().put("BEVERAGE_CARTON", 0.0);
        device.setFillLevel(0);
        device.setIsFull(false);
        device.setFullWasteType(null);
        deviceRepository.save(device);

        Map<String, Object> broadcastData = new java.util.HashMap<>();
        broadcastData.put("machineId", id);
        broadcastData.put("fillLevel", 0);
        broadcastData.put("wasteLevels", device.getWasteLevels());
        broadcastData.put("maxCapacities", device.getMaxCapacities());
        broadcastData.put("isFull", false);
        broadcastData.put("fullWasteType", "");
        broadcastData.put("status", device.getStatus() != null ? device.getStatus() : "OFFLINE");
        broadcastData.put("timestamp", java.time.LocalDateTime.now().toString());
        messagingTemplate.convertAndSend("/topic/devices", broadcastData);
        messagingTemplate.convertAndSend("/topic/devices/" + id, broadcastData);
        
        auditService.logAction(adminId, adminEmail, adminName, "DEVICE_RESET", id, device.getName() != null ? device.getName() : id, "รีเซ็ตระดับขยะในตู้ " + id + " เป็น 0%", request);

        return Map.of("message", "Device waste levels have been reset.");
    }
    
    @DeleteMapping("/user/{id}")
    public void deleteUser(@RequestHeader("Authorization") String token, @PathVariable String id, jakarta.servlet.http.HttpServletRequest request) {
        User admin = validateAdmin(token);
        String adminId = admin != null ? admin.getId() : "ADMIN";
        String adminEmail = admin != null ? admin.getEmail() : "ADMIN";
        String adminName = admin != null ? (admin.getUsername() != null ? admin.getUsername() : admin.getFirstName()) : "Admin";
        String adminRole = jwtUtil.getRoleFromToken(token.substring(7));
        boolean callerIsSuper = isSuperAdmin(admin, adminRole);

        if (adminId.equals(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ไม่สามารถลบบัญชีตัวเองได้");
        }

        User target = userRepository.findById(id).orElse(null);
        if (target == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบผู้ใช้ที่ต้องการลบ");
        }

        if ("sbay.smartcompany@gmail.com".equalsIgnoreCase(target.getEmail())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ไม่สามารถลบบัญชีเจ้าของระบบหลัก (Super Admin) ได้");
        }

        if ("ADMIN".equals(target.getRole()) || "SUPER_ADMIN".equals(target.getRole())) {
            if (!callerIsSuper) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "แอดมินทั่วไปไม่สามารถลบบัญชี Admin อื่นได้ (ต้องใช้สิทธิ์ Super Admin)");
            }
        }

        String targetName = target.getUsername() != null ? target.getUsername() : (target.getEmail() != null ? target.getEmail() : id);

        String targetJson = null;
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            targetJson = mapper.writeValueAsString(target);
        } catch (Exception ignored) {}

        userRepository.deleteById(id);
        auditService.logAction(adminId, adminEmail, adminName, "USER_DELETE", id, targetName, "ลบผู้ใช้งาน " + targetName, targetJson, request);
    }

    @PutMapping("/user/{id}/role")
    public User changeUserRole(@RequestHeader("Authorization") String token, @PathVariable String id, @RequestBody Map<String, String> payload, jakarta.servlet.http.HttpServletRequest request) {
        User admin = validateAdmin(token);
        String adminId = admin != null ? admin.getId() : "ADMIN";
        String adminEmail = admin != null ? admin.getEmail() : "ADMIN";
        String adminName = admin != null ? (admin.getUsername() != null ? admin.getUsername() : admin.getFirstName()) : "Admin";
        String adminRole = jwtUtil.getRoleFromToken(token.substring(7));
        boolean callerIsSuper = isSuperAdmin(admin, adminRole);

        User user = userRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        String oldRole = user.getRole() != null ? user.getRole() : "USER";
        String newRole = payload.get("role");

        if (newRole != null && (newRole.equals("ADMIN") || newRole.equals("SUPER_ADMIN") || newRole.equals("USER") || newRole.equals("PARTNER"))) {
            // ห้ามแอดมินทั่วไปแต่งตั้ง หรือ ปลดสิทธิ์ Admin/Super Admin
            if ("ADMIN".equals(newRole) || "SUPER_ADMIN".equals(newRole) || "ADMIN".equals(oldRole) || "SUPER_ADMIN".equals(oldRole)) {
                if (!callerIsSuper) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "แอดมินทั่วไปไม่สามารถแต่งตั้งหรือปลดสิทธิ์ระดับ ADMIN ได้ (ต้องใช้สิทธิ์ Super Admin)");
                }
            }

            user.setRole(newRole);
            if ("PARTNER".equals(newRole)) {
                String partnerId = payload.get("partnerId");
                if (partnerId != null && !partnerId.isEmpty()) {
                    user.setPartnerId(partnerId);
                }
            } else {
                user.setPartnerId(null);
            }
            User saved = userRepository.save(user);
            auditService.logAction(adminId, adminEmail, adminName, "ROLE_CHANGE", user.getId(), user.getEmail(),
                "เปลี่ยนสิทธิ์ผู้ใช้ " + (user.getUsername() != null ? user.getUsername() : user.getEmail()) + " จาก " + oldRole + " เป็น " + newRole, oldRole, request);
            return saved;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role");
    }
    
    @GetMapping("/redemptions/pending")
    public List<Redemption> getPendingRedemptions(@RequestHeader("Authorization") String token) {
        validateAdmin(token);
        return redemptionRepository.findByStatusOrderByTimestampDesc("PENDING");
    }

    @PostMapping("/redemptions/{id}/approve")
    public Map<String, String> approveRedemption(@RequestHeader("Authorization") String token, @PathVariable String id, jakarta.servlet.http.HttpServletRequest request) {
        validateAdmin(token);
        User admin = getAdminUser(token);
        String adminId = admin != null ? admin.getId() : "ADMIN";
        String adminEmail = admin != null ? admin.getEmail() : "ADMIN";
        String adminName = admin != null ? (admin.getUsername() != null ? admin.getUsername() : admin.getFirstName()) : "Admin";

        try {
            recycleService.approveRedemption(id);
            auditService.logAction(adminId, adminEmail, adminName, "REDEMPTION_APPROVE", id, "Redemption", "อนุมัติรายการแลกรางวัล ID: " + id, request);
            return Map.of("success", "true", "message", "Redemption approved");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PostMapping("/redemptions/{id}/reject")
    public Map<String, String> rejectRedemption(@RequestHeader("Authorization") String token, @PathVariable String id, @RequestBody(required=false) Map<String, String> payload, jakarta.servlet.http.HttpServletRequest request) {
        validateAdmin(token);
        User admin = getAdminUser(token);
        String adminId = admin != null ? admin.getId() : "ADMIN";
        String adminEmail = admin != null ? admin.getEmail() : "ADMIN";
        String adminName = admin != null ? (admin.getUsername() != null ? admin.getUsername() : admin.getFirstName()) : "Admin";

        String reason = (payload != null && payload.containsKey("reason")) ? payload.get("reason") : "ถูกปฏิเสธโดยผู้ดูแลระบบ";
        try {
            recycleService.rejectRedemption(id, reason);
            auditService.logAction(adminId, adminEmail, adminName, "REDEMPTION_REJECT", id, "Redemption", "ปฏิเสธรายการแลกรางวัล ID: " + id + " (เหตุผล: " + reason + ")", request);
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
        // Endpoint is permanently disabled for security to protect user data and transactions
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Endpoint นี้ถูกปิดการใช้งานเพื่อความปลอดภัยของระบบ");
    }
}
