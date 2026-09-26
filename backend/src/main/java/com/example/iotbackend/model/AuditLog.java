package com.example.iotbackend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "audit_logs")
public class AuditLog {
    @Id
    private String id;

    private LocalDateTime timestamp;
    private String adminId;
    private String adminEmail;
    private String adminName;
    private String action;       // ADMIN_LOGIN, ROLE_CHANGE, USER_DELETE, REDEMPTION_APPROVE, REDEMPTION_REJECT, DEVICE_RESET, etc.
    private String targetId;     // Target user/device/redemption ID
    private String targetName;   // Target name or description
    private String details;      // Human-readable detail
    private String ipAddress;
    private String userAgent;
    private String status;       // SUCCESS, FAILED

    // Rollback / Revert tracking for Super Admin
    private String previousData; // Snapshot of previous state (JSON or value) to allow undo
    private Boolean reverted;    // true if reverted
    private LocalDateTime revertedAt;
    private String revertedBy;   // Super Admin email
}
