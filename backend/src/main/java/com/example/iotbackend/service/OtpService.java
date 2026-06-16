package com.example.iotbackend.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

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
    public void generateAndSendOtp(String email) {
        String otp = String.format("%06d", random.nextInt(1_000_000));
        long expiry = Instant.now().getEpochSecond() + OTP_EXPIRY_SECONDS;

        otpValues.put(email.toLowerCase(), otp);
        otpStore.put(email.toLowerCase(), new long[]{expiry});

        // Console mock — replace this block with real email sending
        System.out.println("=================================================");
        System.out.println("[OTP] Email: " + email);
        System.out.println("[OTP] Code:  " + otp);
        System.out.println("[OTP] Valid for " + OTP_EXPIRY_SECONDS + " seconds");
        System.out.println("=================================================");
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
            otpValues.remove(key);
            otpStore.remove(key);
            return true;
        }

        return false;
    }
}
