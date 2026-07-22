package com.example.iotbackend.repository;

import com.example.iotbackend.model.WasteType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WasteTypeRepository extends MongoRepository<WasteType, String> {
    Optional<WasteType> findByType(String type);
}
