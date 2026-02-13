package com.example.iotbackend.repository;

import com.example.iotbackend.model.Alert;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AlertRepository extends MongoRepository<Alert, String> {
    List<Alert> findByMachineIdOrderByTimestampDesc(String machineId);
    List<Alert> findAllByOrderByTimestampDesc();
}
