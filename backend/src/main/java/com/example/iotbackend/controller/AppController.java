package com.example.iotbackend.controller;

import com.example.iotbackend.model.User;
import com.example.iotbackend.model.Alert;
import com.example.iotbackend.repository.AlertRepository;
import com.example.iotbackend.repository.UserRepository;
import com.example.iotbackend.repository.TransactionRepository;
import com.example.iotbackend.repository.RedemptionRepository;
import com.example.iotbackend.service.OtpService;
import com.example.iotbackend.service.RecycleService;
import com.example.iotbackend.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

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
    private RedemptionRepository redemptionRepository;

    @Autowired
    private RecycleService recycleService;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private OtpService otpService;
    
    @Autowired
    private JwtUtil jwtUtil;

    // ─── OTP: Send to Email (Login — user must exist) ────────────────────────
    @PostMapping("/auth/otp/send")
    public Object sendOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        if (email == null || email.isBlank()) return Map.of("error", "Email is required");

        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase().trim());
        if (userOpt.isEmpty()) return Map.of("error", "ไม่พบอีเมลนี้ในระบบ กรุณาลงทะเบียนก่อน");

        otpService.generateAndSendOtp(email.toLowerCase().trim());
        return Map.of("success", true, "message", "ส่ง OTP ไปยัง " + email + " แล้ว");
    }

    // ─── OTP: Send to Email (Register — user must NOT exist) ─────────────────
    @PostMapping("/auth/otp/send-register")
    public Object sendRegisterOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        if (email == null || email.isBlank()) return Map.of("error", "Email is required");

        Optional<User> existing = userRepository.findByEmail(email.toLowerCase().trim());
        if (existing.isPresent()) return Map.of("error", "อีเมลนี้มีผู้ใช้ลงทะเบียนแล้ว กรุณาเข้าสู่ระบบ");

        otpService.generateAndSendOtp(email.toLowerCase().trim());
        return Map.of("success", true, "message", "ส่ง OTP ไปยัง " + email + " แล้ว");
    }

    // ─── OTP: Send to Phone (Login — user must exist) ────────────────────────
    @PostMapping("/auth/otp/send-phone")
    public Object sendPhoneOtp(@RequestBody Map<String, String> payload) {
        String phone = payload.get("phoneNumber");
        if (phone == null || phone.isBlank()) return Map.of("error", "Phone number is required");

        String normalizedPhone = phone.replaceAll("[^0-9]", "");
        Optional<User> userOpt = userRepository.findByPhoneNumber(normalizedPhone);
        if (userOpt.isEmpty()) return Map.of("error", "ไม่พบเบอร์โทรนี้ในระบบ กรุณาลงทะเบียนก่อน");

        // Use phone as the OTP key
        otpService.generateAndSendOtp("phone:" + normalizedPhone);
        return Map.of("success", true, "message", "ส่ง OTP ไปยังเบอร์ " + phone + " แล้ว (ดู Console)");
    }

    // ─── OTP: Verify Email → Login ────────────────────────────────────────────
    @PostMapping("/auth/otp/verify")
    public Object verifyOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String otp = payload.get("otp");
        String machineId = payload.getOrDefault("machineId", "default-machine");

        if (email == null || otp == null) return Map.of("error", "Email and OTP are required");

        boolean valid = otpService.verifyOtp(email.toLowerCase().trim(), otp.trim());
        if (!valid) return Map.of("error", "OTP ไม่ถูกต้องหรือหมดอายุแล้ว");

        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase().trim());
        if (userOpt.isEmpty()) return Map.of("error", "ไม่พบผู้ใช้");

        User user = userOpt.get();
        recycleService.bindUserToMachine(machineId, user.getId());
        String token = jwtUtil.generateToken(user);
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("user", user);
        response.put("token", token);
        return response;
    }

    // ─── OTP: Verify Phone → Login ────────────────────────────────────────────
    @PostMapping("/auth/otp/verify-phone")
    public Object verifyPhoneOtp(@RequestBody Map<String, String> payload) {
        String phone = payload.get("phoneNumber");
        String otp = payload.get("otp");
        String machineId = payload.getOrDefault("machineId", "default-machine");

        if (phone == null || otp == null) return Map.of("error", "Phone number and OTP are required");

        String normalizedPhone = phone.replaceAll("[^0-9]", "");
        boolean valid = otpService.verifyOtp("phone:" + normalizedPhone, otp.trim());
        if (!valid) return Map.of("error", "OTP ไม่ถูกต้องหรือหมดอายุแล้ว");

        Optional<User> userOpt = userRepository.findByPhoneNumber(normalizedPhone);
        if (userOpt.isEmpty()) return Map.of("error", "ไม่พบผู้ใช้");

        User user = userOpt.get();
        recycleService.bindUserToMachine(machineId, user.getId());
        String token = jwtUtil.generateToken(user);
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("user", user);
        response.put("token", token);
        return response;
    }

    // ─── Google OAuth Login (user must be registered) ─────────────────────────
    @PostMapping("/auth/google")
    public Object googleLogin(@RequestBody Map<String, String> payload) {
        String accessToken = payload.get("idToken");
        String machineId = payload.getOrDefault("machineId", "default-machine");

        if (accessToken == null || accessToken.isBlank()) return Map.of("error", "Google Access Token is required");

        try {
            Map<String, Object> googleInfo = fetchGoogleUserInfo(accessToken);
            if (googleInfo == null) return Map.of("error", "Google token ไม่ถูกต้องหรือหมดอายุแล้ว");

            String email = (String) googleInfo.get("email");
            if (email == null || email.isBlank()) return Map.of("error", "ไม่สามารถดึงอีเมลจาก Google ได้");

            System.out.println("[Google Login] Verified email: " + email);

            Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase().trim());
            if (userOpt.isEmpty()) return Map.of("error", "ไม่พบอีเมลนี้ในระบบ กรุณาลงทะเบียนก่อน", "email", email);

            User user = userOpt.get();
            recycleService.bindUserToMachine(machineId, user.getId());
            String token = jwtUtil.generateToken(user);
            Map<String, Object> resp = new java.util.HashMap<>();
            resp.put("user", user);
            resp.put("token", token);
            return resp;

        } catch (Exception e) {
            System.err.println("[Google Login] Error: " + e.getMessage());
            return Map.of("error", "เกิดข้อผิดพลาดในการตรวจสอบ Google token: " + e.getMessage());
        }
    }

    // ─── Google Register (verify Google + save user, no OTP needed) ───────────
    @PostMapping("/auth/register-google")
    public Object registerWithGoogle(@RequestBody Map<String, Object> payload) {
        String accessToken = (String) payload.get("idToken");
        String machineId = (String) payload.getOrDefault("machineId", "default-machine");

        if (accessToken == null || accessToken.isBlank()) return Map.of("error", "Google Access Token is required");

        try {
            Map<String, Object> googleInfo = fetchGoogleUserInfo(accessToken);
            if (googleInfo == null) return Map.of("error", "Google token ไม่ถูกต้องหรือหมดอายุแล้ว");

            String email = (String) googleInfo.get("email");
            String googleName = (String) googleInfo.get("name");
            if (email == null || email.isBlank()) return Map.of("error", "ไม่สามารถดึงอีเมลจาก Google ได้");

            // Check if already registered
            Optional<User> existing = userRepository.findByEmail(email.toLowerCase().trim());
            if (existing.isPresent()) return Map.of("error", "อีเมลนี้มีผู้ใช้ลงทะเบียนแล้ว กรุณาเข้าสู่ระบบด้วย Google", "email", email);

            System.out.println("[Google Register] Creating user for: " + email);

            // Build user from payload + Google info
            User newUser = new User();
            newUser.setEmail(email.toLowerCase().trim());
            newUser.setPhoneNumber((String) payload.get("phoneNumber"));
            newUser.setUsername((String) payload.get("username"));
            newUser.setTitle((String) payload.getOrDefault("title", "นาย"));
            newUser.setFirstName((String) payload.getOrDefault("firstName", ""));
            newUser.setLastName((String) payload.getOrDefault("lastName", ""));
            newUser.setStudentId((String) payload.get("studentId"));
            newUser.setFaculty((String) payload.get("faculty"));
            newUser.setMajor((String) payload.get("major"));
            newUser.setPoints(0);
            newUser.setRole("USER");

            userRepository.save(newUser);
            recycleService.bindUserToMachine(machineId, newUser.getId());

            String token = jwtUtil.generateToken(newUser);
            Map<String, Object> resp = new java.util.HashMap<>();
            resp.put("user", newUser);
            resp.put("token", token);
            return resp;

        } catch (Exception e) {
            System.err.println("[Google Register] Error: " + e.getMessage());
            return Map.of("error", "เกิดข้อผิดพลาด: " + e.getMessage());
        }
    }

    // ─── Register (manual — with Email OTP verification) ─────────────────────
    @PostMapping("/auth/register")
    public Object register(@RequestBody Map<String, Object> payload) {
        String machineId = (String) payload.getOrDefault("machineId", "default-machine");
        String email = (String) payload.get("email");
        String otp = (String) payload.get("otp");

        if (email == null || otp == null || otp.isBlank()) return Map.of("error", "Email and OTP are required");

        boolean valid = otpService.verifyOtp(email.toLowerCase().trim(), otp.trim());
        if (!valid) return Map.of("error", "OTP ไม่ถูกต้องหรือหมดอายุแล้ว");

        Optional<User> existing = userRepository.findByEmail(email.toLowerCase().trim());
        if (existing.isPresent()) return Map.of("error", "อีเมลนี้มีผู้ใช้ลงทะเบียนแล้ว");

        User newUser = new User();
        newUser.setPhoneNumber((String) payload.get("phoneNumber"));
        newUser.setUsername((String) payload.get("username"));
        newUser.setTitle((String) payload.get("title"));
        newUser.setFirstName((String) payload.get("firstName"));
        newUser.setLastName((String) payload.get("lastName"));
        newUser.setEmail(email.toLowerCase().trim());
        newUser.setStudentId((String) payload.get("studentId"));
        newUser.setFaculty((String) payload.get("faculty"));
        newUser.setMajor((String) payload.get("major"));
        newUser.setPoints(0);
        newUser.setRole("USER");

        String password = (String) payload.get("password");
        if (password != null && !password.isBlank()) {
            newUser.setPassword(hashPassword(password));
        }

        userRepository.save(newUser);
        recycleService.bindUserToMachine(machineId, newUser.getId());

        String token = jwtUtil.generateToken(newUser);
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("user", newUser);
        response.put("token", token);
        return response;
    }

    // ─── Temporary Admin Promotion Endpoint ──────────────────────────────────────
    @GetMapping("/auth/promote")
    public Object promoteToAdmin(@RequestParam("email") String email) {
        if (email == null || email.isBlank()) {
            return Map.of("error", "Email is required");
        }
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase().trim());
        if (userOpt.isPresent()) {
            User u = userOpt.get();
            u.setRole("ADMIN");
            userRepository.save(u);
            return Map.of("success", true, "message", "Promoted user with email " + email + " to ADMIN.");
        }
        return Map.of("error", "User not found with email: " + email);
    }

    // ─── Legacy phone login (IoT backward compat) ─────────────────────────────
    @PostMapping("/auth/login")
    public Object login(@RequestBody Map<String, String> payload) {
        String phone = payload.get("phoneNumber");
        String machineId = payload.getOrDefault("machineId", "default-machine");
        Optional<User> userOpt = userRepository.findByPhoneNumber(phone);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            recycleService.bindUserToMachine(machineId, user.getId());
            String token = jwtUtil.generateToken(user);
            Map<String, Object> response = new java.util.HashMap<>();
            response.put("user", user);
            response.put("token", token);
            return response;
        }
        return Map.of("error", "User not found", "status", 404);
    }

    // ─── Password Login ───────────────────────────────────────────────────────
    @PostMapping("/auth/login-password")
    public Object loginWithPassword(@RequestBody Map<String, String> payload) {
        String identifier = payload.get("identifier");
        String password = payload.get("password");
        String machineId = payload.getOrDefault("machineId", "default-machine");

        if (identifier == null || identifier.isBlank() || password == null || password.isBlank()) {
            return Map.of("error", "Email/Phone and Password are required");
        }

        identifier = identifier.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(identifier);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(identifier);
        }
        if (userOpt.isEmpty()) {
            String phone = identifier.replaceAll("[^0-9]", "");
            if (!phone.isEmpty()) {
                userOpt = userRepository.findByPhoneNumber(phone);
            }
        }

        if (userOpt.isEmpty()) {
            return Map.of("error", "ไม่พบผู้ใช้นี้ในระบบ");
        }

        User user = userOpt.get();
        if (user.getPassword() == null) {
            return Map.of("error", "บัญชีนี้ไม่ได้ตั้งรหัสผ่าน กรุณาเข้าสู่ระบบด้วย Google");
        }

        String hashedAttempt = hashPassword(password);
        if (!user.getPassword().equals(hashedAttempt)) {
            return Map.of("error", "รหัสผ่านไม่ถูกต้อง");
        }

        recycleService.bindUserToMachine(machineId, user.getId());
        String token = jwtUtil.generateToken(user);
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("user", user);
        response.put("token", token);
        return response;
    }

    // ─── Helper: hash password (SHA-256) ───────────────────────────────────────
    private String hashPassword(String password) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest(password.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * encodedhash.length);
            for (byte b : encodedhash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error hashing password", e);
        }
    }

    // ─── Helper: fetch Google userinfo via access token ────────────────────────
    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchGoogleUserInfo(String accessToken) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Authorization", "Bearer " + accessToken);
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);
            org.springframework.http.ResponseEntity<java.util.Map> resp = restTemplate.exchange(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                org.springframework.http.HttpMethod.GET, entity, java.util.Map.class
            );
            return resp.getBody();
        } catch (Exception e) {
            System.err.println("[Google] fetchUserInfo error: " + e.getMessage());
            return null;
        }
    }

    @PostMapping("/auth/logout")
    public void logout(@RequestBody Map<String, String> payload) {
        String machineId = payload.getOrDefault("machineId", "default-machine");
        System.out.println("Processing Logout for Machine: " + machineId);
        recycleService.logout(machineId);
    }

    @GetMapping("/user/{id}")
    public User getUser(@PathVariable("id") String id) {
        return userRepository.findById(id).orElseThrow();
    }

    // Called by IoT Device
    @PostMapping("/machine/recycle")
    public void receiveRecycleItem(@RequestBody Map<String, Object> payload) {
        String type = (String) payload.get("type"); 
        String machineId = (String) payload.getOrDefault("machineId", "default-machine");
        
        // Use the type string sent directly from the IoT device
        // Format is expected to match WasteType (e.g. PLASTIC_BOTTLE, ALUMINUM_CAN, BEVERAGE_CARTON)
        // Ensure uppercase for consistency
        if (type != null) {
            type = type.toUpperCase();
        }
        
        int points = 0;
        Object scoreObj = payload.get("score");
        if (scoreObj == null) scoreObj = payload.get("points"); // Fallback
        
        if (scoreObj != null) {
            try {
                points = (int) Math.round(Double.parseDouble(String.valueOf(scoreObj)));
            } catch (NumberFormatException e) {
                System.err.println("Invalid score/points value from IoT: " + scoreObj);
            }
        }
        
        recycleService.processRecycleItem(machineId, type, points);
    }
    
    @GetMapping("/transactions/user/{userId}")
    public List<com.example.iotbackend.model.Transaction> getUserTransactions(@PathVariable("userId") String userId) {
        return transactionRepository.findByUserIdOrderByTimestampDesc(userId);
    }
    
    @GetMapping("/redemptions/user/{userId}")
    public List<com.example.iotbackend.model.Redemption> getUserRedemptions(@PathVariable("userId") String userId) {
        return redemptionRepository.findByUserIdOrderByTimestampDesc(userId);
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
    public Map<String, String> getMachineStatus(@PathVariable("id") String id) {
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
        double value = Double.parseDouble(String.valueOf(payload.get("value")));
        String details = (String) payload.get("details");
        
        String title = (String) payload.get("title");
        String firstName = (String) payload.get("firstName");
        String lastName = (String) payload.get("lastName");
        String studentId = (String) payload.get("studentId");
        String faculty = (String) payload.get("faculty");
        String major = (String) payload.get("major");
        
        recycleService.redeemPoints(userId, rewardType, cost, value, details, 
                                    title, firstName, lastName, studentId, faculty, major);
    }

    @PutMapping("/user/{id}")
    public User updateUser(@PathVariable("id") String id, @RequestBody Map<String, Object> payload) {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));
        
        if (payload.containsKey("title")) existing.setTitle((String) payload.get("title"));
        if (payload.containsKey("firstName")) existing.setFirstName((String) payload.get("firstName"));
        if (payload.containsKey("lastName")) existing.setLastName((String) payload.get("lastName"));
        if (payload.containsKey("studentId")) existing.setStudentId((String) payload.get("studentId"));
        if (payload.containsKey("faculty")) existing.setFaculty((String) payload.get("faculty"));
        if (payload.containsKey("major")) existing.setMajor((String) payload.get("major"));
        if (payload.containsKey("username")) existing.setUsername((String) payload.get("username"));
        if (payload.containsKey("phoneNumber")) existing.setPhoneNumber((String) payload.get("phoneNumber"));
        
        return userRepository.save(existing);
    }
}
