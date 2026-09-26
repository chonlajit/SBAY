package com.example.iotbackend.service;

import com.example.iotbackend.model.AuditLog;
import com.example.iotbackend.model.User;
import com.example.iotbackend.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class AuditService {

    private static final String NOTIFICATION_EMAIL = "sbay.smartcompany@gmail.com";
    private static final DateTimeFormatter THAI_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
    private static final ZoneId THAI_ZONE = ZoneId.of("Asia/Bangkok");

    private final ExecutorService executor = Executors.newFixedThreadPool(3);

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String senderEmail;

    /**
     * ดึง Real IP Address ของผู้เรียก แม้อยู่หลัง Cloudflare หรือ Nginx Reverse Proxy
     */
    public String getClientIp(HttpServletRequest request) {
        if (request == null) return "Unknown";

        String[] headers = {
            "CF-Connecting-IP",
            "X-Forwarded-For",
            "X-Real-IP",
            "Proxy-Client-IP",
            "WL-Proxy-Client-IP"
        };

        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                // หากมีหลาย IP ใน X-Forwarded-For (คั่นด้วย comma) ให้เอา IP ตัวแรก
                if (ip.contains(",")) {
                    ip = ip.split(",")[0].trim();
                }
                return ip;
            }
        }

        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "Unknown";
    }

    /**
     * ดึง User-Agent (เบราว์เซอร์ / อุปกรณ์)
     */
    public String getUserAgent(HttpServletRequest request) {
        if (request == null) return "Unknown";
        String ua = request.getHeader("User-Agent");
        return ua != null && !ua.isBlank() ? ua : "Unknown";
    }

    /**
     * บันทึก Audit Log และส่งการแจ้งเตือนทาง Email เมื่อมีการ Login ของ Admin
     */
    public void logAdminLogin(User admin, HttpServletRequest request, String loginMethod) {
        String ip = getClientIp(request);
        String ua = getUserAgent(request);
        LocalDateTime now = LocalDateTime.now(THAI_ZONE);

        // 1. บันทึกลงฐานข้อมูล Audit Log
        AuditLog log = AuditLog.builder()
                .timestamp(now)
                .adminId(admin.getId())
                .adminEmail(admin.getEmail())
                .adminName(admin.getUsername() != null ? admin.getUsername() : admin.getFirstName())
                .action("ADMIN_LOGIN")
                .targetId(admin.getId())
                .targetName(admin.getEmail())
                .details("Admin เข้าสู่ระบบสำเร็จ (" + loginMethod + ")")
                .ipAddress(ip)
                .userAgent(ua)
                .status("SUCCESS")
                .build();

        try {
            auditLogRepository.save(log);
        } catch (Exception e) {
            System.err.println("[AuditService] Failed to save login audit log: " + e.getMessage());
        }

        // 2. ส่ง Email แจ้งเตือนไปยัง sbay.smartcompany@gmail.com แบบ Asynchronous
        executor.submit(() -> sendLoginAlertEmail(admin, ip, ua, loginMethod, now));
    }

    /**
     * บันทึกการกระทำทั่วไปของ Admin (Role Change, Delete User, Reset Device, ฯลฯ) พร้อมบันทึก Previous Data สำหรับ Rollback
     */
    public void logAction(String adminId, String adminEmail, String adminName,
                          String action, String targetId, String targetName,
                          String details, String previousData, HttpServletRequest request) {
        String ip = getClientIp(request);
        String ua = getUserAgent(request);
        LocalDateTime now = LocalDateTime.now(THAI_ZONE);

        AuditLog log = AuditLog.builder()
                .timestamp(now)
                .adminId(adminId)
                .adminEmail(adminEmail)
                .adminName(adminName)
                .action(action)
                .targetId(targetId)
                .targetName(targetName)
                .details(details)
                .previousData(previousData)
                .reverted(false)
                .ipAddress(ip)
                .userAgent(ua)
                .status("SUCCESS")
                .build();

        try {
            auditLogRepository.save(log);
        } catch (Exception e) {
            System.err.println("[AuditService] Failed to save audit log: " + e.getMessage());
        }
    }

    public void logAction(String adminId, String adminEmail, String adminName,
                          String action, String targetId, String targetName,
                          String details, HttpServletRequest request) {
        logAction(adminId, adminEmail, adminName, action, targetId, targetName, details, null, request);
    }

    /**
     * ส่งอีเมลแจ้งเตือนเมื่อเกิด Account Lockout จากการกรอกรหัสผิดเกิน 5 ครั้ง
     */
    public void sendLockoutAlert(String identifier, HttpServletRequest request) {
        String ip = getClientIp(request);
        String ua = getUserAgent(request);
        LocalDateTime now = LocalDateTime.now(THAI_ZONE);
        String timeStr = now.format(THAI_TIME_FORMATTER);

        System.out.println("=================================================");
        System.out.println("[LOCKOUT ALERT] Target: " + identifier + ", IP: " + ip);
        System.out.println("=================================================");

        executor.submit(() -> {
            try {
                if (mailSender != null && senderEmail != null && !senderEmail.isBlank()) {
                    SimpleMailMessage message = new SimpleMailMessage();
                    message.setFrom(senderEmail);
                    message.setTo(NOTIFICATION_EMAIL);
                    message.setSubject("🚨 [SBAY URGENT] บัญชีถูกล็อคเนื่องจากพยายามสุ่มรหัสผ่านผิดเกิน 5 ครั้ง");
                    message.setText(
                        "เรียน ผู้ดูแลระบบ SBAY,\n\n" +
                        "ระบบตรวจพบการพยายามสุ่มรหัสผ่านผิดติดต่อกันเกิน 5 ครั้ง บัญชีได้ถูกล็อคชั่วคราวเป็นเวลา 15 นาที เพื่อความปลอดภัย\n\n" +
                        "• บัญชีเป้าหมาย:  " + identifier + "\n" +
                        "• เวลาที่ตรวจพบ: " + timeStr + "\n" +
                        "• IP Address:   " + ip + "\n" +
                        "• อุปกรณ์:       " + ua + "\n\n" +
                        "โปรดตรวจสอบว่าเป็นการกระทำของท่านหรือมีความพยายามเจาะระบบจากภายนอก\n\n" +
                        "SBAY Security Guard"
                    );
                    mailSender.send(message);
                }
            } catch (Exception e) {
                System.err.println("[AuditService] Failed to send lockout email: " + e.getMessage());
            }
        });
    }

    /**
     * ส่งรหัส OTP 2FA ยืนยันตัวตนสำหรับ Admin ไปยังอีเมล
     */
    public void send2faOtpEmail(String recipientEmail, String otp) {
        executor.submit(() -> {
            try {
                if (mailSender != null && senderEmail != null && !senderEmail.isBlank()) {
                    SimpleMailMessage message = new SimpleMailMessage();
                    message.setFrom(senderEmail);
                    message.setTo(recipientEmail);
                    message.setSubject("🔐 [SBAY Security] รหัส OTP ยืนยันตัวตน 2 ขั้นตอน (2FA) สำหรับ Admin");
                    message.setText(
                        "เรียน ผู้ดูแลระบบ SBAY,\n\n" +
                        "มีการร้องขอเข้าสู่ระบบ Admin บนแพลตฟอร์ม SBAY\n" +
                        "รหัสความปลอดภัยสำหรับการเข้าใช้งานคือ:\n\n" +
                        "       >>>  " + otp + "  <<<\n\n" +
                        "รหัสนี้มีอายุการใช้งาน 5 นาที\n" +
                        "หากท่านไม่ได้ร้องขอการเข้าสู่ระบบ กรุณาเปลี่ยนรหัสผ่านทันทีเนื่องจากอาจมีผู้ล่วงรู้รหัสผ่านของท่าน\n\n" +
                        "SBAY Security Platform"
                    );
                    mailSender.send(message);
                }
            } catch (Exception e) {
                System.err.println("[AuditService] Failed to send 2FA OTP email: " + e.getMessage());
            }
        });
    }

    /**
     * ส่งอีเมลแจ้งเตือนการเข้าใช้งานของ Admin
     */
    private void sendLoginAlertEmail(User admin, String ip, String userAgent, String loginMethod, LocalDateTime time) {
        String timeStr = time.format(THAI_TIME_FORMATTER);
        String adminIdentifier = admin.getEmail() != null ? admin.getEmail() : (admin.getUsername() != null ? admin.getUsername() : admin.getId());
        String adminDisplayName = (admin.getUsername() != null ? admin.getUsername() : "") + 
                (admin.getFirstName() != null ? " (" + admin.getFirstName() + " " + (admin.getLastName() != null ? admin.getLastName() : "") + ")" : "");

        System.out.println("=================================================");
        System.out.println("[ADMIN LOGIN ALERT] Sending security notification to " + NOTIFICATION_EMAIL);
        System.out.println("Admin Account: " + adminIdentifier);
        System.out.println("Time:          " + timeStr);
        System.out.println("IP Address:    " + ip);
        System.out.println("Method:        " + loginMethod);
        System.out.println("=================================================");

        if (mailSender == null) {
            System.out.println("[AuditService] JavaMailSender is not available. Skipping real email send.");
            return;
        }

        if (senderEmail == null || senderEmail.isBlank()) {
            System.out.println("[AuditService] SMTP username is empty in environment. Skipping real email send.");
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(senderEmail);
            message.setTo(NOTIFICATION_EMAIL);
            message.setSubject("🚨 [SBAY Security Alert] ตรวจพบการเข้าสู่ระบบบัญชี Admin");
            message.setText(
                "เรียน ผู้ดูแลระบบ SBAY,\n\n" +
                "ระบบตรวจพบการเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ (Admin) โดยมีรายละเอียดดังต่อไปนี้:\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                "• บัญชี Admin:       " + adminIdentifier + (adminDisplayName.isBlank() ? "" : " " + adminDisplayName) + "\n" +
                "• วันที่และเวลา:     " + timeStr + " (เวลาประเทศไทย ICT)\n" +
                "• หมายเลข IP:        " + ip + "\n" +
                "• วิธีการเข้าสู่ระบบ: " + loginMethod + "\n" +
                "• อุปกรณ์/เบราว์เซอร์: " + userAgent + "\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "⚠️ คำเตือนความปลอดภัย:\n" +
                "หากการเข้าสู่ระบบนี้เกิดจากตัวท่าน ท่านสามารถเพิกเฉยต่อข้อความนี้ได้\n" +
                "หากท่านไม่ได้เป็นผู้เข้าสู่ระบบ อาจมีผู้อื่นล่วงรู้รหัสผ่านของท่าน กรุณาเข้าสู่ระบบเพื่อเปลี่ยนรหัสผ่านทันที\n\n" +
                "ระบบรักษาความปลอดภัยอัตโนมัติ\n" +
                "SBAY Smart Recycling Platform"
            );

            mailSender.send(message);
            System.out.println("[AuditService] Security alert email sent successfully to " + NOTIFICATION_EMAIL);
        } catch (Exception e) {
            System.err.println("[AuditService] Failed to send admin login alert email: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
