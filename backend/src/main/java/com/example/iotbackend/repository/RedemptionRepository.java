package com.example.iotbackend.repository;

import com.example.iotbackend.model.Redemption;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface RedemptionRepository extends MongoRepository<Redemption, String> {
    List<Redemption> findByStatusOrderByTimestampDesc(String status);
    List<Redemption> findByUserIdOrderByTimestampDesc(String userId);
    long countByPartnerId(String partnerId);
    List<Redemption> findByPartnerId(String partnerId);
    List<Redemption> findByPartnerIdAndStatusOrderByTimestampDesc(String partnerId, String status);
}
