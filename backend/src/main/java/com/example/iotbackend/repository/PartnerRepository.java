package com.example.iotbackend.repository;

import com.example.iotbackend.model.Partner;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PartnerRepository extends MongoRepository<Partner, String> {
    List<Partner> findByActiveTrue();
}
