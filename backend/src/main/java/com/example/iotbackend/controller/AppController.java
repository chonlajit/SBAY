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

    @Autowired
    private com.example.iotbackend.service.AuditService auditService;

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
        boolean rememberMe = "true".equalsIgnoreCase(payload.get("rememberMe"));
        recycleService.bindUserToMachine(machineId, user.getId());
        String token = jwtUtil.generateToken(user, rememberMe);
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
        boolean rememberMe = "true".equalsIgnoreCase(payload.get("rememberMe"));
        recycleService.bindUserToMachine(machineId, user.getId());
        String token = jwtUtil.generateToken(user, rememberMe);
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("user", user);
        response.put("token", token);
        return response;
    }

    // ─── Google OAuth Login (user must be registered) ─────────────────────────
    @PostMapping("/auth/google")
    public Object googleLogin(@RequestBody Map<String, String> payload, jakarta.servlet.http.HttpServletRequest request) {
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
            if ("ADMIN".equals(user.getRole())) {
                auditService.logAdminLogin(user, request, "Google OAuth");
            }
            boolean rememberMe = "true".equalsIgnoreCase(payload.get("rememberMe"));
            recycleService.bindUserToMachine(machineId, user.getId());
            String token = jwtUtil.generateToken(user, rememberMe);
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
            newUser.setPoints(0);
            newUser.setRole("USER");


            String firstName = cleanString(payload.get("firstName"));
            if (firstName != null) newUser.setFirstName(firstName);

            String lastName = cleanString(payload.get("lastName"));
            if (lastName != null) newUser.setLastName(lastName);

            String studentId = cleanString(payload.get("studentId"));
            if (studentId != null) newUser.setStudentId(studentId);

            String faculty = cleanString(payload.get("faculty"));
            if (faculty != null) newUser.setFaculty(faculty);

            String major = cleanString(payload.get("major"));
            if (major != null) newUser.setMajor(major);

            userRepository.save(newUser);
            recycleService.bindUserToMachine(machineId, newUser.getId());

            String token = jwtUtil.generateToken(newUser, true);
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

        String phoneNumber = (String) payload.get("phoneNumber");
        if (phoneNumber != null) {
            Optional<User> existingPhone = userRepository.findByPhoneNumber(phoneNumber.replaceAll("[^0-9]", ""));
            if (existingPhone.isPresent()) {
                return Map.of("error", "เบอร์โทรศัพท์นี้ถูกใช้งานไปแล้ว กรุณาใช้เบอร์อื่น");
            }
        }

        User newUser = new User();
        newUser.setPhoneNumber((String) payload.get("phoneNumber"));
        newUser.setUsername((String) payload.get("username"));
        newUser.setEmail(email.toLowerCase().trim());
        newUser.setPoints(0);
        newUser.setRole("USER");

        String password = (String) payload.get("password");
        if (password != null && !password.isBlank()) {
            newUser.setPassword(hashPassword(password));
        }


        String firstName = cleanString(payload.get("firstName"));
        if (firstName != null) newUser.setFirstName(firstName);

        String lastName = cleanString(payload.get("lastName"));
        if (lastName != null) newUser.setLastName(lastName);

        String studentId = cleanString(payload.get("studentId"));
        if (studentId != null) newUser.setStudentId(studentId);

        String faculty = cleanString(payload.get("faculty"));
        if (faculty != null) newUser.setFaculty(faculty);

        String major = cleanString(payload.get("major"));
        if (major != null) newUser.setMajor(major);

        userRepository.save(newUser);
        recycleService.bindUserToMachine(machineId, newUser.getId());

        String token = jwtUtil.generateToken(newUser, true);
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("user", newUser);
        response.put("token", token);
        return response;
    }

    // ─── Admin Promotion Endpoint (Disabled for security) ─────────────────────
    @GetMapping("/auth/promote")
    public Object promoteToAdmin(@RequestParam("email") String email) {
        throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.FORBIDDEN, "Endpoint นี้ถูกปิดการใช้งานเพื่อความปลอดภัย"
        );
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

    private final org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder passwordEncoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();

    // ─── Password Login (with BCrypt, Brute-force protection & Admin 2FA) ──────
    @PostMapping("/auth/login-password")
    public Object loginWithPassword(@RequestBody Map<String, String> payload, jakarta.servlet.http.HttpServletRequest request) {
        String identifier = payload.get("identifier");
        String password = payload.get("password");
        String machineId = payload.getOrDefault("machineId", "default-machine");

        if (identifier == null || identifier.isBlank() || password == null || password.isBlank()) {
            return Map.of("error", "Email/Phone and Password are required");
        }

        String rawIdentifier = identifier.trim();
        identifier = rawIdentifier.toLowerCase();
        
        Optional<User> userOpt = userRepository.findByEmail(identifier);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(rawIdentifier);
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

        // 1. ตรวจสอบการถูก Lockout จากการกรอกรหัสผ่านผิดเกิน 5 ครั้ง
        if (user.getLockoutUntil() != null && user.getLockoutUntil().isAfter(java.time.LocalDateTime.now())) {
            long minutesLeft = java.time.Duration.between(java.time.LocalDateTime.now(), user.getLockoutUntil()).toMinutes() + 1;
            return Map.of("error", "บัญชีนี้ถูกระงับชั่วคราวเนื่องจากกรอกรหัสผ่านผิดเกิน 5 ครั้ง กรุณาลองใหม่ในอีก " + minutesLeft + " นาที");
        }

        if (user.getPassword() == null) {
            return Map.of("error", "บัญชีนี้ไม่ได้ตั้งรหัสผ่าน กรุณาเข้าสู่ระบบด้วย Google");
        }

        // 2. ตรวจสอบรหัสผ่าน (BCrypt พร้อม Backward Compatibility รองรับ SHA-256 เดิม)
        String storedPassword = user.getPassword();
        boolean passwordMatches = false;
        if (storedPassword != null) {
            if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
                passwordMatches = passwordEncoder.matches(password, storedPassword);
            } else {
                // Legacy SHA-256 fallback
                if (storedPassword.equals(hashLegacySha256(password))) {
                    passwordMatches = true;
                    // อัปเกรดรหัสผ่านเป็น BCrypt ทันทีอย่างแนบเนียน
                    user.setPassword(passwordEncoder.encode(password));
                    userRepository.save(user);
                }
            }
        }

        // หากรหัสผ่านไม่ถูกต้อง
        if (!passwordMatches) {
            int failed = (user.getFailedLoginAttempts() != null ? user.getFailedLoginAttempts() : 0) + 1;
            user.setFailedLoginAttempts(failed);
            if (failed >= 5) {
                user.setLockoutUntil(java.time.LocalDateTime.now().plusMinutes(15));
                userRepository.save(user);
                auditService.sendLockoutAlert(rawIdentifier, request);
                return Map.of("error", "รหัสผ่านไม่ถูกต้องเกิน 5 ครั้ง บัญชีนี้ถูกระงับการเข้าสู่ระบบชั่วคราว 15 นาที เพื่อความปลอดภัย");
            } else {
                userRepository.save(user);
                int remaining = 5 - failed;
                return Map.of("error", "รหัสผ่านไม่ถูกต้อง (เหลือโอกาสอีก " + remaining + " ครั้ง ก่อนที่บัญชีจะถูกระงับชั่วคราว)");
            }
        }

        // 3. รหัสผ่านถูกต้อง -> รีเซ็ตจำนวนครั้งที่ผิด
        user.setFailedLoginAttempts(0);
        user.setLockoutUntil(null);
        userRepository.save(user);

        boolean rememberMe = "true".equalsIgnoreCase(payload.get("rememberMe"));
        boolean isAdmin = "ADMIN".equals(user.getRole()) || "SUPER_ADMIN".equals(user.getRole()) || "sbay.smartcompany@gmail.com".equalsIgnoreCase(user.getEmail());
        boolean require2fa = isAdmin || Boolean.TRUE.equals(user.getTwoFactorEnabled());

        // 4. หากเป็น Admin / Super Admin หรือผู้ใช้เปิด 2FA ให้บังคับใช้ระบบ 2FA Email OTP
        if (require2fa) {
            String targetEmail = user.getEmail() != null && !user.getEmail().isBlank() ? user.getEmail() : "sbay.smartcompany@gmail.com";
            String otp = otpService.generateAndSendOtp(targetEmail);
            auditService.send2faOtpEmail(targetEmail, otp);
            Map<String, Object> resp = new java.util.HashMap<>();
            resp.put("require2fa", true);
            resp.put("email", targetEmail);
            resp.put("maskedEmail", maskEmail(targetEmail));
            resp.put("identifier", rawIdentifier);
            resp.put("rememberMe", rememberMe);
            resp.put("isAdmin", isAdmin);
            resp.put("message", "เพื่อความปลอดภัย กรุณากรอกรหัส OTP 6 หลักที่ส่งไปยังอีเมล " + maskEmail(targetEmail));
            return resp;
        }

        // สำหรับผู้ใช้ทั่วไป ออก Token ปกติ
        recycleService.bindUserToMachine(machineId, user.getId());
        String token = jwtUtil.generateToken(user, rememberMe);
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("user", user);
        response.put("token", token);
        return response;
    }

    // ─── 2FA: Verify OTP & Issue Token (Supports Admin & All Users) ───────────
    @PostMapping({"/auth/admin-2fa/verify", "/auth/2fa/verify"})
    public Object verifyAdmin2fa(@RequestBody Map<String, String> payload, jakarta.servlet.http.HttpServletRequest request) {
        String email = payload.get("email");
        String otp = payload.get("otp");
        String machineId = payload.getOrDefault("machineId", "default-machine");
        boolean rememberMe = "true".equalsIgnoreCase(payload.get("rememberMe"));

        if (email == null || otp == null) {
            return Map.of("error", "Email and OTP are required");
        }

        boolean valid = otpService.verifyOtp(email.toLowerCase().trim(), otp.trim());
        if (!valid) {
            return Map.of("error", "รหัส OTP 2FA ไม่ถูกต้องหรือหมดอายุแล้ว");
        }

        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase().trim());
        if (userOpt.isEmpty()) {
            return Map.of("error", "ไม่พบข้อมูลผู้ใช้งาน");
        }

        User user = userOpt.get();
        boolean isAdmin = "ADMIN".equals(user.getRole()) || "SUPER_ADMIN".equals(user.getRole()) || "sbay.smartcompany@gmail.com".equalsIgnoreCase(user.getEmail());
        if (isAdmin) {
            auditService.logAdminLogin(user, request, "2FA Password (Admin Verified)");
        }
        recycleService.bindUserToMachine(machineId, user.getId());
        String token = jwtUtil.generateToken(user, rememberMe);

        Map<String, Object> response = new java.util.HashMap<>();
        response.put("user", user);
        response.put("token", token);
        return response;
    }

    // ─── 2FA: Resend OTP ───────────────────────────────────────────────────────
    @PostMapping({"/auth/admin-2fa/resend", "/auth/2fa/resend"})
    public Object resendAdmin2fa(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        if (email == null || email.isBlank()) {
            return Map.of("error", "Email is required");
        }
        String otp = otpService.generateAndSendOtp(email.toLowerCase().trim());
        auditService.send2faOtpEmail(email.toLowerCase().trim(), otp);
        return Map.of("success", true, "message", "ส่งรหัส OTP 2FA ใหม่เรียบร้อยแล้ว");
    }

    // ─── Helper: Mask Email for Security Display ──────────────────────────────
    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        String[] parts = email.split("@");
        String name = parts[0];
        String domain = parts[1];
        if (name.length() <= 2) {
            return name.charAt(0) + "***@" + domain;
        }
        return name.substring(0, 2) + "***" + name.charAt(name.length() - 1) + "@" + domain;
    }

    // ─── Helper: hash password (BCrypt) ────────────────────────────────────────
    private String hashPassword(String password) {
        return passwordEncoder.encode(password);
    }

    // ─── Helper: legacy hash (SHA-256 for backward compatibility) ──────────────
    private String hashLegacySha256(String password) {
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
        
        String username = (String) payload.get("username");
        String title = (String) payload.get("title");
        String firstName = (String) payload.get("firstName");
        String lastName = (String) payload.get("lastName");
        String studentId = (String) payload.get("studentId");
        String faculty = (String) payload.get("faculty");
        String major = (String) payload.get("major");
        String academicYear = (String) payload.get("academicYear");

        String address = (String) payload.get("address");
        Integer age = null;
        if (payload.containsKey("age")) {
            Object ageObj = payload.get("age");
            if (ageObj instanceof Integer) {
                age = (Integer) ageObj;
            } else if (ageObj instanceof String) {
                try {
                    age = Integer.parseInt((String) ageObj);
                } catch (NumberFormatException ignored) {}
            }
        }
        String email = (String) payload.get("email");
        String phoneNumber = (String) payload.get("phoneNumber");

        String partnerId = (String) payload.get("partnerId");
        String partnerRewardId = (String) payload.get("partnerRewardId");
        
        recycleService.redeemPoints(userId, rewardType, cost, value, details, 
                                    username, title, firstName, lastName, studentId, faculty, major,
                                    academicYear, address, age, email, phoneNumber,
                                    partnerId, partnerRewardId);
    }

    @PutMapping("/user/{id}")
    public User updateUser(@PathVariable("id") String id, @RequestBody Map<String, Object> payload) {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));
        
        if (payload.containsKey("firstName")) existing.setFirstName(cleanString(payload.get("firstName")));
        if (payload.containsKey("lastName")) existing.setLastName(cleanString(payload.get("lastName")));
        if (payload.containsKey("studentId")) existing.setStudentId(cleanString(payload.get("studentId")));
        if (payload.containsKey("faculty")) existing.setFaculty(cleanString(payload.get("faculty")));
        if (payload.containsKey("major")) existing.setMajor(cleanString(payload.get("major")));
        if (payload.containsKey("academicYear")) existing.setAcademicYear(cleanString(payload.get("academicYear")));
        if (payload.containsKey("username")) {
            String u = cleanString(payload.get("username"));
            if (u != null) existing.setUsername(u);
        }
        if (payload.containsKey("phoneNumber")) {
            String p = cleanString(payload.get("phoneNumber"));
            if (p != null) existing.setPhoneNumber(p);
        }
        if (payload.containsKey("address")) existing.setAddress(cleanString(payload.get("address")));
        if (payload.containsKey("profileImageUrl")) existing.setProfileImageUrl(cleanString(payload.get("profileImageUrl")));
        if (payload.containsKey("age")) {
            Object ageObj = payload.get("age");
            if (ageObj instanceof Integer) {
                existing.setAge((Integer) ageObj);
            } else if (ageObj instanceof String && !((String) ageObj).isBlank()) {
                try {
                    existing.setAge(Integer.parseInt(((String) ageObj).trim()));
                } catch (NumberFormatException ignored) {
                    existing.setAge(null);
                }
            } else {
                existing.setAge(null);
            }
        }
        
        return userRepository.save(existing);
    }

    private String cleanString(Object val) {
        if (val == null) return null;
        String s = val.toString().trim();
        return s.isBlank() ? null : s;
    }

    // ─── Forgot Password ───────────────────────────────────────────────────────
    @PostMapping("/auth/forgot-password")
    public Object forgotPassword(@RequestBody Map<String, String> payload) {
        String identifier = payload.get("identifier");
        if (identifier == null || identifier.isBlank()) return Map.of("error", "Email or Phone is required");
        
        String rawIdentifier = identifier.trim();
        identifier = rawIdentifier.toLowerCase();
        
        Optional<User> userOpt = userRepository.findByEmail(identifier);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(rawIdentifier);
        }
        if (userOpt.isEmpty()) {
            String phone = identifier.replaceAll("[^0-9]", "");
            if (!phone.isEmpty()) {
                userOpt = userRepository.findByPhoneNumber(phone);
            }
        }
        
        if (userOpt.isEmpty()) return Map.of("error", "ไม่พบผู้ใช้ในระบบ");
        
        User user = userOpt.get();
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            otpService.generateAndSendOtp(user.getEmail());
            return Map.of("success", true, "message", "รหัส OTP ถูกส่งไปยังอีเมลของคุณแล้ว", "email", user.getEmail());
        } else if (user.getPhoneNumber() != null && !user.getPhoneNumber().isBlank()) {
            otpService.generateAndSendOtp("phone:" + user.getPhoneNumber());
            return Map.of("success", true, "message", "รหัส OTP ถูกส่งไปยังเบอร์โทรของคุณแล้ว (จำลอง)", "phone", user.getPhoneNumber());
        } else {
            return Map.of("error", "ไม่สามารถส่ง OTP ได้เนื่องจากผู้ใช้ไม่มีอีเมลหรือเบอร์โทร");
        }
    }

    @PostMapping("/auth/reset-password")
    public Object resetPassword(@RequestBody Map<String, String> payload) {
        String identifier = payload.get("identifier");
        String otp = payload.get("otp");
        String newPassword = payload.get("newPassword");
        
        if (identifier == null || newPassword == null || newPassword.isBlank()) {
            return Map.of("error", "กรุณากรอกข้อมูลให้ครบถ้วน");
        }
        
        String rawIdentifier = identifier.trim();
        identifier = rawIdentifier.toLowerCase();
        
        Optional<User> userOpt = userRepository.findByEmail(identifier);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(rawIdentifier);
        }
        if (userOpt.isEmpty()) {
            String phone = identifier.replaceAll("[^0-9]", "");
            if (!phone.isEmpty()) {
                userOpt = userRepository.findByPhoneNumber(phone);
            }
        }
        
        if (userOpt.isEmpty()) return Map.of("error", "ไม่พบผู้ใช้ในระบบ");
        User user = userOpt.get();
        
        user.setPassword(hashPassword(newPassword));
        userRepository.save(user);
        
        return Map.of("success", true, "message", "เปลี่ยนรหัสผ่านสำเร็จ");
    }

    // ─── Change Contact OTP ──────────────────────────────────────────────────
    @PostMapping("/auth/request-change-contact")
    public Object requestChangeContact(@RequestBody Map<String, String> payload) {
        String type = payload.get("type"); // "email" or "phone"
        String newValue = payload.get("newValue");
        
        if (type == null || newValue == null || newValue.isBlank()) {
            return Map.of("error", "กรุณากรอกข้อมูลให้ครบถ้วน");
        }
        
        if ("email".equals(type)) {
            otpService.generateAndSendOtp(newValue);
            return Map.of("success", true, "message", "รหัส OTP ถูกส่งไปยังอีเมลใหม่ของคุณแล้ว");
        } else if ("phone".equals(type)) {
            otpService.generateAndSendOtp("phone:" + newValue);
            return Map.of("success", true, "message", "รหัส OTP ถูกส่งไปยังเบอร์โทรใหม่ของคุณแล้ว (จำลอง)");
        } else {
            return Map.of("error", "ประเภทไม่ถูกต้อง");
        }
    }

    @PostMapping("/auth/confirm-change-contact")
    public Object confirmChangeContact(@RequestBody Map<String, String> payload) {
        String userId = payload.get("userId");
        String type = payload.get("type"); // "email" or "phone"
        String newValue = payload.get("newValue");
        String otp = payload.get("otp");
        
        if (userId == null || type == null || newValue == null || otp == null) {
            return Map.of("error", "กรุณากรอกข้อมูลให้ครบถ้วน");
        }
        
        boolean isValid = false;
        if ("email".equals(type)) {
            isValid = otpService.verifyOtp(newValue, otp);
        } else if ("phone".equals(type)) {
            isValid = otpService.verifyOtp("phone:" + newValue, otp);
        }
        
        if (!isValid) {
            return Map.of("error", "รหัส OTP ไม่ถูกต้องหรือหมดอายุ");
        }
        
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return Map.of("error", "ไม่พบผู้ใช้งาน");
        }
        
        if ("email".equals(type)) {
            user.setEmail(newValue);
        } else if ("phone".equals(type)) {
            user.setPhoneNumber(newValue);
        }
        userRepository.save(user);
        
        return Map.of("success", true, "message", "อัปเดตข้อมูลสำเร็จ");
    }

    // ─── User Profile: Security Management ────────────────────────────────────
    @GetMapping("/user/{id}/security-status")
    public Object getUserSecurityStatus(@PathVariable("id") String id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) return Map.of("error", "ไม่พบผู้ใช้");
        User user = userOpt.get();
        Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("hasPassword", user.isHasPassword());
        resp.put("twoFactorEnabled", user.getTwoFactorEnabled());
        resp.put("email", user.getEmail());
        resp.put("maskedEmail", maskEmail(user.getEmail()));
        boolean isAdmin = "ADMIN".equals(user.getRole()) || "SUPER_ADMIN".equals(user.getRole()) || "sbay.smartcompany@gmail.com".equalsIgnoreCase(user.getEmail());
        resp.put("isAdmin", isAdmin);
        return resp;
    }

    @PostMapping("/user/{id}/security-otp")
    public Object sendSecurityOtp(@PathVariable("id") String id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) return Map.of("error", "ไม่พบผู้ใช้");
        User user = userOpt.get();
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return Map.of("error", "ไม่พบบัญชีอีเมลที่ผูกไว้ กรุณาตั้งค่าอีเมลในหน้าข้อมูลส่วนตัวก่อน");
        }
        String targetEmail = user.getEmail().trim().toLowerCase();
        String otp = otpService.generateAndSendOtp(targetEmail);
        auditService.send2faOtpEmail(targetEmail, otp);
        return Map.of(
            "success", true,
            "message", "ส่งรหัส OTP 6 หลักไปยังอีเมล " + maskEmail(targetEmail) + " เรียบร้อยแล้ว",
            "maskedEmail", maskEmail(targetEmail)
        );
    }

    @PostMapping("/user/{id}/set-password")
    public Object setUserPassword(@PathVariable("id") String id, @RequestBody Map<String, String> payload, jakarta.servlet.http.HttpServletRequest request) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) return Map.of("error", "ไม่พบผู้ใช้");
        User user = userOpt.get();

        String newPassword = payload.get("newPassword");
        String otp = payload.get("otp");

        if (newPassword == null || newPassword.length() < 8 || newPassword.length() > 20) {
            return Map.of("error", "รหัสผ่านต้องมีความยาวระหว่าง 8-20 ตัวอักษร");
        }
        if (otp == null || otp.isBlank()) {
            return Map.of("error", "กรุณาระบุรหัส OTP ที่ได้รับทางอีเมล");
        }

        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return Map.of("error", "ไม่พบบัญชีอีเมล กรุณาผูกอีเมลก่อนตั้งรหัสผ่าน");
        }

        boolean validOtp = otpService.verifyOtp(user.getEmail().toLowerCase().trim(), otp.trim());
        if (!validOtp) {
            return Map.of("error", "รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setFailedLoginAttempts(0);
        user.setLockoutUntil(null);
        userRepository.save(user);

        auditService.logAction(
            user.getId(),
            user.getEmail() != null ? user.getEmail() : user.getUsername(),
            user.getUsername() != null ? user.getUsername() : user.getFirstName(),
            "SET_PASSWORD",
            user.getId(),
            user.getEmail(),
            "ผู้ใช้ตั้งรหัสผ่านสำเร็จผ่านการยืนยัน Email OTP",
            null,
            request
        );

        return Map.of("success", true, "message", "ตั้งรหัสผ่านสำเร็จ ตอนนี้คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านได้แล้ว", "hasPassword", true);
    }

    @PostMapping("/user/{id}/change-password")
    public Object changeUserPassword(@PathVariable("id") String id, @RequestBody Map<String, String> payload, jakarta.servlet.http.HttpServletRequest request) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) return Map.of("error", "ไม่พบผู้ใช้");
        User user = userOpt.get();

        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");
        String otp = payload.get("otp");

        if (newPassword == null || newPassword.length() < 8 || newPassword.length() > 20) {
            return Map.of("error", "รหัสผ่านใหม่ต้องมีความยาวระหว่าง 8-20 ตัวอักษร");
        }

        boolean verified = false;

        // Verify via current password if provided
        if (currentPassword != null && !currentPassword.isBlank()) {
            String storedPassword = user.getPassword();
            if (storedPassword != null) {
                if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
                    verified = passwordEncoder.matches(currentPassword, storedPassword);
                } else {
                    verified = storedPassword.equals(hashLegacySha256(currentPassword));
                }
            }
            if (!verified) {
                return Map.of("error", "รหัสผ่านเดิมไม่ถูกต้อง");
            }
        } else if (otp != null && !otp.isBlank()) {
            // Verify via OTP
            if (user.getEmail() == null || user.getEmail().isBlank()) {
                return Map.of("error", "ไม่พบบัญชีอีเมล");
            }
            verified = otpService.verifyOtp(user.getEmail().toLowerCase().trim(), otp.trim());
            if (!verified) {
                return Map.of("error", "รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว");
            }
        } else {
            return Map.of("error", "กรุณากรอกรหัสผ่านเดิม หรือยืนยันตัวตนด้วยรหัส OTP ทางอีเมล");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setFailedLoginAttempts(0);
        user.setLockoutUntil(null);
        userRepository.save(user);

        auditService.logAction(
            user.getId(),
            user.getEmail() != null ? user.getEmail() : user.getUsername(),
            user.getUsername() != null ? user.getUsername() : user.getFirstName(),
            "CHANGE_PASSWORD",
            user.getId(),
            user.getEmail(),
            "ผู้ใช้เปลี่ยนรหัสผ่านสำเร็จ",
            null,
            request
        );

        return Map.of("success", true, "message", "เปลี่ยนรหัสผ่านสำเร็จ");
    }

    @PostMapping("/user/{id}/toggle-2fa")
    public Object toggleUser2fa(@PathVariable("id") String id, @RequestBody Map<String, Object> payload, jakarta.servlet.http.HttpServletRequest request) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) return Map.of("error", "ไม่พบผู้ใช้");
        User user = userOpt.get();

        boolean enable = Boolean.parseBoolean(String.valueOf(payload.get("enabled")));
        String otp = (String) payload.get("otp");

        boolean isAdmin = "ADMIN".equals(user.getRole()) || "SUPER_ADMIN".equals(user.getRole()) || "sbay.smartcompany@gmail.com".equalsIgnoreCase(user.getEmail());
        if (isAdmin && !enable) {
            return Map.of("error", "บัญชีผู้ดูแลระบบ (Admin) ต้องเปิดใช้งาน 2FA เสมอตามนโยบายความปลอดภัย ไม่สามารถปิดได้");
        }

        if (otp == null || otp.isBlank()) {
            return Map.of("error", "กรุณาระบุรหัส OTP ที่ได้รับทางอีเมลเพื่อยืนยันการตั้งค่าความปลอดภัย");
        }

        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return Map.of("error", "ไม่พบบัญชีอีเมล กรุณาผูกอีเมลก่อนตั้งค่า 2FA");
        }

        boolean validOtp = otpService.verifyOtp(user.getEmail().toLowerCase().trim(), otp.trim());
        if (!validOtp) {
            return Map.of("error", "รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว");
        }

        user.setTwoFactorEnabled(enable);
        userRepository.save(user);

        auditService.logAction(
            user.getId(),
            user.getEmail() != null ? user.getEmail() : user.getUsername(),
            user.getUsername() != null ? user.getUsername() : user.getFirstName(),
            enable ? "ENABLE_2FA" : "DISABLE_2FA",
            user.getId(),
            user.getEmail(),
            enable ? "ผู้ใช้เปิดใช้งานการยืนยันตัวตน 2 ขั้นตอน (2FA) ทางอีเมล" : "ผู้ใช้ปิดใช้งานการยืนยันตัวตน 2 ขั้นตอน (2FA)",
            null,
            request
        );

        return Map.of(
            "success", true,
            "twoFactorEnabled", enable,
            "message", enable ? "เปิดใช้งานการยืนยันตัวตน 2 ขั้นตอน (2FA) สำเร็จ" : "ปิดใช้งาน 2FA เรียบร้อยแล้ว"
        );
    }
}
