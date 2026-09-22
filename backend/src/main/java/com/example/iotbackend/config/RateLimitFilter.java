package com.example.iotbackend.config;

import com.example.iotbackend.service.RateLimiterService;
import com.example.iotbackend.service.RateLimiterService.ApiCategory;
import com.example.iotbackend.service.RateLimiterService.RateLimitResult;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter that enforces per-API Rate Limiting to protect the backend from flood/DoS attacks.
 * Returns HTTP 429 (Too Many Requests) with standard headers and Thai/English JSON message.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class RateLimitFilter extends OncePerRequestFilter {

    @Autowired
    private RateLimiterService rateLimiterService;

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        // Only apply rate limiting to /api/ endpoints
        if (!path.startsWith("/api")) {
            return true;
        }

        // Skip CORS pre-flight requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // Skip WebSocket upgrades
        String upgrade = request.getHeader("Upgrade");
        if ("websocket".equalsIgnoreCase(upgrade)) {
            return true;
        }

        return false;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        String clientIp = extractClientIp(request);
        ApiCategory category = determineCategory(request);

        RateLimitResult result = rateLimiterService.checkRateLimit(clientIp, category);

        // Always set informative Rate Limit headers
        response.setHeader("X-RateLimit-Limit", String.valueOf(result.getLimit()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(result.getRemaining()));

        if (result.isAllowed()) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(result.getRetryAfterSeconds()));
            response.setContentType("application/json;charset=UTF-8");

            String json = String.format(
                    "{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"คำขอมากเกินไป กรุณารอสักครู่ (กรุณารออีก %d วินาที)\",\"retryAfterSeconds\":%d}",
                    result.getRetryAfterSeconds(),
                    result.getRetryAfterSeconds()
            );

            response.getWriter().write(json);
            response.getWriter().flush();
        }
    }

    private ApiCategory determineCategory(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String method = request.getMethod().toUpperCase();

        // 1. Authentication (Strict: 10 req/min)
        if (uri.startsWith("/api/auth/")) {
            return ApiCategory.AUTH;
        }

        // 2. IoT Devices / Smart Bin (60 req/min)
        if (uri.startsWith("/api/devices") || uri.startsWith("/api/machine")) {
            return ApiCategory.DEVICE;
        }

        // 3. Transactions / Redemptions / File Uploads (20 req/min)
        if (uri.equals("/api/redeem") 
                || uri.startsWith("/api/upload")
                || (uri.contains("/redemptions/") && ("POST".equals(method) || "PUT".equals(method)))) {
            return ApiCategory.TRANSACTION;
        }

        // 4. General Queries & Profile reads (120 req/min)
        return ApiCategory.GENERAL;
    }

    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            // X-Forwarded-For may be a comma-separated list of IPs: "client, proxy1, proxy2"
            String firstIp = xForwardedFor.split(",")[0].trim();
            if (!firstIp.equalsIgnoreCase("unknown") && !firstIp.isBlank()) {
                return firstIp;
            }
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank() && !xRealIp.equalsIgnoreCase("unknown")) {
            return xRealIp.trim();
        }

        return request.getRemoteAddr();
    }
}
