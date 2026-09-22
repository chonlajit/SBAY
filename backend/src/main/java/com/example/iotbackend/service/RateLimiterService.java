package com.example.iotbackend.service;

import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

/**
 * High-performance In-Memory Token Bucket Rate Limiter.
 * Provides fine-grained rate limits tailored for each API category:
 * - AUTH: 10 requests / minute (burst 5)
 * - DEVICE: 60 requests / minute (burst 20)
 * - TRANSACTION: 20 requests / minute (burst 10)
 * - GENERAL: 120 requests / minute (burst 30)
 */
@Service
@EnableScheduling
public class RateLimiterService {

    public enum ApiCategory {
        AUTH(10, 5, 60),           // 10 req/min, burst +5, window 60s
        DEVICE(60, 20, 60),        // 60 req/min, burst +20, window 60s
        TRANSACTION(20, 10, 60),   // 20 req/min, burst +10, window 60s
        GENERAL(120, 30, 60);      // 120 req/min, burst +30, window 60s

        public final int maxRequestsPerWindow;
        public final int burstAllowance;
        public final int windowSeconds;

        ApiCategory(int maxRequestsPerWindow, int burstAllowance, int windowSeconds) {
            this.maxRequestsPerWindow = maxRequestsPerWindow;
            this.burstAllowance = burstAllowance;
            this.windowSeconds = windowSeconds;
        }

        public int getTotalCapacity() {
            return maxRequestsPerWindow + burstAllowance;
        }
    }

    public static class RateLimitResult {
        private final boolean allowed;
        private final int limit;
        private final int remaining;
        private final long retryAfterSeconds;

        public RateLimitResult(boolean allowed, int limit, int remaining, long retryAfterSeconds) {
            this.allowed = allowed;
            this.limit = limit;
            this.remaining = Math.max(0, remaining);
            this.retryAfterSeconds = Math.max(0, retryAfterSeconds);
        }

        public boolean isAllowed() {
            return allowed;
        }

        public int getLimit() {
            return limit;
        }

        public int getRemaining() {
            return remaining;
        }

        public long getRetryAfterSeconds() {
            return retryAfterSeconds;
        }
    }

    private static class TokenBucket {
        private final ApiCategory category;
        private double tokens;
        private long lastRefillTimestamp;

        public TokenBucket(ApiCategory category) {
            this.category = category;
            this.tokens = category.getTotalCapacity();
            this.lastRefillTimestamp = System.currentTimeMillis();
        }

        public synchronized RateLimitResult tryAcquire() {
            refill();

            if (tokens >= 1.0) {
                tokens -= 1.0;
                return new RateLimitResult(true, category.maxRequestsPerWindow, (int) Math.floor(tokens), 0);
            } else {
                // Calculate seconds until 1 token becomes available
                double refillRatePerSec = (double) category.maxRequestsPerWindow / category.windowSeconds;
                double tokensNeeded = 1.0 - tokens;
                long retryAfterSec = Math.max(1, (long) Math.ceil(tokensNeeded / refillRatePerSec));
                return new RateLimitResult(false, category.maxRequestsPerWindow, 0, retryAfterSec);
            }
        }

        private void refill() {
            long now = System.currentTimeMillis();
            double elapsedSeconds = (now - lastRefillTimestamp) / 1000.0;
            if (elapsedSeconds > 0) {
                double refillRatePerSec = (double) category.maxRequestsPerWindow / category.windowSeconds;
                double newTokens = elapsedSeconds * refillRatePerSec;
                tokens = Math.min(category.getTotalCapacity(), tokens + newTokens);
                lastRefillTimestamp = now;
            }
        }

        public synchronized boolean isIdle(long thresholdMillis) {
            return (System.currentTimeMillis() - lastRefillTimestamp) > thresholdMillis 
                    && tokens >= category.getTotalCapacity();
        }
    }

    // Map key: "IP:CATEGORY" -> TokenBucket
    private final ConcurrentHashMap<String, TokenBucket> buckets = new ConcurrentHashMap<>();

    /**
     * Checks rate limit for the given client IP and API category.
     */
    public RateLimitResult checkRateLimit(String clientIp, ApiCategory category) {
        String key = clientIp + ":" + category.name();
        TokenBucket bucket = buckets.computeIfAbsent(key, k -> new TokenBucket(category));
        return bucket.tryAcquire();
    }

    /**
     * Periodically cleans up idle buckets every 5 minutes to prevent memory leaks under massive traffic.
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    public void cleanupIdleBuckets() {
        long fiveMinutesMillis = 300000;
        buckets.entrySet().removeIf(entry -> entry.getValue().isIdle(fiveMinutesMillis));
    }

    /**
     * Returns total active buckets currently tracked.
     */
    public int getActiveBucketsCount() {
        return buckets.size();
    }
}
