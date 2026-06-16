package com.example.iotbackend.repository;

import com.example.iotbackend.model.Device;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeviceRepository extends MongoRepository<Device, String> {
}
