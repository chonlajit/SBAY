package com.example.iotbackend.repository;

import com.example.iotbackend.model.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
    List<AuditLog> findTop100ByOrderByTimestampDesc();
    List<AuditLog> findByActionOrderByTimestampDesc(String action);
}
