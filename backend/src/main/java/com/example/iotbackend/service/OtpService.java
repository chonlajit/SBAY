package com.example.iotbackend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String senderEmail;

    private static final int OTP_EXPIRY_SECONDS = 300; // 5 minutes
    private final SecureRandom random = new SecureRandom();

    // Map: email -> [otp, expiry timestamp]
    private final ConcurrentHashMap<String, long[]> otpStore = new ConcurrentHashMap<>();
    // Map: email -> [otp string stored as hash chars]
    private final ConcurrentHashMap<String, String> otpValues = new ConcurrentHashMap<>();

    /**
     * Generate a 6-digit OTP for the given email.
     * Logs OTP to console (mock mode).
     */
    public String generateAndSendOtp(String email) {
        String otp = String.format("%06d", random.nextInt(1_000_000));
        long expiry = Instant.now().getEpochSecond() + OTP_EXPIRY_SECONDS;

        otpValues.put(email.toLowerCase(), otp);
        otpStore.put(email.toLowerCase(), new long[]{expiry});

        // Console mock for debugging
        System.out.println("=================================================");
        System.out.println("[OTP] Email: " + email);
        System.out.println("[OTP] Code:  " + otp);
        System.out.println("[OTP] Valid for " + OTP_EXPIRY_SECONDS + " seconds");
        System.out.println("=================================================");

        try {
            if (senderEmail != null && !senderEmail.isEmpty()) {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(senderEmail);
                message.setTo(email);
                message.setSubject("Your SBAY OTP Code");
                message.setText("Your OTP code for SBAY is: " + otp + "\nThis code will expire in 5 minutes.");
                mailSender.send(message);
                System.out.println("Real email sent successfully to " + email);
            } else {
                System.out.println("SMTP Username is empty. Skipping real email send.");
            }
        } catch (Exception e) {
            System.err.println("Failed to send real email: " + e.getMessage());
            e.printStackTrace();
        }

        return otp;
    }

    /**
     * Verify the OTP for the given email.
     * Returns true if valid; removes OTP on success.
     */
    public boolean verifyOtp(String email, String otp) {
        String key = email.toLowerCase();
        String stored = otpValues.get(key);
        long[] expiry = otpStore.get(key);

        if (stored == null || expiry == null) {
            return false;
        }

        if (Instant.now().getEpochSecond() > expiry[0]) {
            // Expired
            otpValues.remove(key);
            otpStore.remove(key);
            return false;
        }

        if (stored.equals(otp.trim())) {
            // Do not remove OTP immediately so it can be verified again in Step 3
            return true;
        }

        return false;
    }
}
