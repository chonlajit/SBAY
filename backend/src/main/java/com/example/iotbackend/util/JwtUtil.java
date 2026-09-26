package com.example.iotbackend.util;

import com.example.iotbackend.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtil {

    @Value("${sbay.jwt.secret:SmartBinSecureKeyForIoTBackend2024_MustBe32BytesLength}")
    private String secretString;

    private Key secretKey;
    public static final long EXPIRATION_SHORT = 5L * 60 * 60 * 1000;       // 5 Hours (18,000,000 ms)
    public static final long EXPIRATION_REMEMBER = 30L * 24 * 60 * 60 * 1000; // 30 Days (2,592,000,000 ms)
    public static final long EXPIRATION_ADMIN = 2L * 60 * 60 * 1000;        // 2 Hours strictly for Admin / Super Admin

    @PostConstruct
    public void init() {
        if (secretString == null || secretString.length() < 32) {
            throw new IllegalArgumentException("JWT secret must be at least 32 characters long");
        }
        this.secretKey = Keys.hmacShaKeyFor(secretString.getBytes());
    }

    public String generateToken(User user, boolean rememberMe) {
        boolean isAdmin = "ADMIN".equals(user.getRole()) || "SUPER_ADMIN".equals(user.getRole()) || "sbay.smartcompany@gmail.com".equalsIgnoreCase(user.getEmail());
        long expirationTime = isAdmin ? EXPIRATION_ADMIN : (rememberMe ? EXPIRATION_REMEMBER : EXPIRATION_SHORT);
        
        String effectiveRole = user.getRole();
        if ("sbay.smartcompany@gmail.com".equalsIgnoreCase(user.getEmail())) {
            effectiveRole = "SUPER_ADMIN";
        }

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", effectiveRole != null ? effectiveRole : "USER");
        claims.put("name", (user.getFirstName() != null ? user.getFirstName() : "") + " " + (user.getLastName() != null ? user.getLastName() : ""));
        claims.put("email", user.getEmail());
        claims.put("rememberMe", isAdmin ? false : rememberMe);
        
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(user.getId())
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expirationTime))
                .signWith(secretKey)
                .compact();
    }

    public String generateToken(User user) {
        return generateToken(user, false);
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(secretKey).build().parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String getUserIdFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }
    
    public String getRoleFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
            .setSigningKey(secretKey)
            .build()
            .parseClaimsJws(token)
            .getBody();
        return (String) claims.get("role");
    }
}
