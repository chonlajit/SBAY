package com.example.iotbackend.repository;

import com.example.iotbackend.model.DeviceSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeviceSessionRepository extends MongoRepository<DeviceSession, String> {
    List<DeviceSession> findByUserIdOrderByStartTimeDesc(String userId);
}
