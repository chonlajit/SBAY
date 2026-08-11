package com.example.iotbackend.controller;

import com.example.iotbackend.model.Partner;
import com.example.iotbackend.model.PartnerReward;
import com.example.iotbackend.model.Redemption;
import com.example.iotbackend.repository.PartnerRepository;
import com.example.iotbackend.repository.UserRepository;
import com.example.iotbackend.repository.RedemptionRepository;
import com.example.iotbackend.service.RecycleService;
import com.example.iotbackend.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@CrossOrigin(origins = "*")
public class PartnerController {

    @Autowired
    private PartnerRepository partnerRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RedemptionRepository redemptionRepository;

    @Autowired
    private RecycleService recycleService;

    @Autowired
    private JwtUtil jwtUtil;

    private void validateAdmin(String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing Token");
        }
        String jwt = token.substring(7);
        if (!jwtUtil.validateToken(jwt)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Token");
        }
        String role = jwtUtil.getRoleFromToken(jwt);
        if (!"ADMIN".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied");
        }
    }

    /** ตรวจสอบว่า token นี้เป็น PARTNER และคืน partnerId สำหรับใช้ตรวจสอบสิทธิ์ */
    private String validatePartnerAndGetPartnerId(String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing Token");
        }
        String jwt = token.substring(7);
        if (!jwtUtil.validateToken(jwt)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Token");
        }
        String role = jwtUtil.getRoleFromToken(jwt);
        if (!"PARTNER".equals(role) && !"ADMIN".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied: Partner only");
        }
        String userId = jwtUtil.getUserIdFromToken(jwt);
        com.example.iotbackend.model.User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.getPartnerId() == null || user.getPartnerId().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No partner store linked to this account");
        }
        return user.getPartnerId();
    }

    // ========== Public Endpoints (ผู้ใช้ทั่วไปดูได้) ==========

    /** ดึงรายการร้านที่เปิดใช้งาน (สำหรับแสดงในหน้า Redeem) */
    @GetMapping("/api/partners")
    public List<Partner> getActivePartners() {
        return partnerRepository.findByActiveTrue();
    }

    /** ดึงจำนวนการแลกคะแนนต่อร้าน (สำหรับเรียงร้านตามความนิยม) */
    @GetMapping("/api/partners/redemption-counts")
    public Map<String, Long> getPartnerRedemptionCounts() {
        List<Partner> allPartners = partnerRepository.findByActiveTrue();
        Map<String, Long> counts = new java.util.HashMap<>();
        for (Partner p : allPartners) {
            long count = redemptionRepository.countByPartnerId(p.getId());
            counts.put(p.getId(), count);
        }
        return counts;
    }

    // ========== Admin Endpoints ==========

    /** ดึงร้านทั้งหมด (รวมที่ปิดอยู่) */
    @GetMapping("/api/admin/partners")
    public List<Partner> getAllPartners(@RequestHeader("Authorization") String token) {
        validateAdmin(token);
        return partnerRepository.findAll();
    }

    /** เพิ่มร้านใหม่ */
    @PostMapping("/api/admin/partners")
    public Partner createPartner(@RequestHeader("Authorization") String token, @RequestBody Partner partner) {
        validateAdmin(token);
        partner.setId(null); // Let MongoDB generate ID
        partner.setCreatedAt(LocalDateTime.now());
        if (partner.getRewards() == null) partner.setRewards(new java.util.ArrayList<>());
        return partnerRepository.save(partner);
    }

    /** แก้ไขข้อมูลร้าน */
    @PutMapping("/api/admin/partners/{id}")
    public Partner updatePartner(@RequestHeader("Authorization") String token,
                                  @PathVariable String id,
                                  @RequestBody Partner updated) {
        validateAdmin(token);
        Partner existing = partnerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Partner not found"));
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        existing.setLogoUrl(updated.getLogoUrl());
        existing.setCategory(updated.getCategory());
        existing.setActive(updated.isActive());
        return partnerRepository.save(existing);
    }

    /** ลบร้าน */
    @DeleteMapping("/api/admin/partners/{id}")
    public Map<String, String> deletePartner(@RequestHeader("Authorization") String token, @PathVariable String id) {
        validateAdmin(token);
        partnerRepository.deleteById(id);
        return Map.of("message", "Partner deleted");
    }

    /** เพิ่มของรางวัลให้กับร้าน */
    @PostMapping("/api/admin/partners/{id}/rewards")
    public Partner addReward(@RequestHeader("Authorization") String token,
                              @PathVariable String id,
                              @RequestBody PartnerReward reward) {
        validateAdmin(token);
        Partner partner = partnerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Partner not found"));
        reward.setId(UUID.randomUUID().toString());
        if (reward.getStock() == 0) reward.setStock(-1); // default infinite
        partner.getRewards().add(reward);
        return partnerRepository.save(partner);
    }

    /** แก้ไขของรางวัลในร้าน */
    @PutMapping("/api/admin/partners/{partnerId}/rewards/{rewardId}")
    public Partner updateReward(@RequestHeader("Authorization") String token,
                                 @PathVariable String partnerId,
                                 @PathVariable String rewardId,
                                 @RequestBody PartnerReward updatedReward) {
        validateAdmin(token);
        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Partner not found"));
        partner.getRewards().replaceAll(r -> r.getId().equals(rewardId) ? updatedReward : r);
        updatedReward.setId(rewardId);
        return partnerRepository.save(partner);
    }

    /** ลบของรางวัลออกจากร้าน */
    @DeleteMapping("/api/admin/partners/{partnerId}/rewards/{rewardId}")
    public Partner deleteReward(@RequestHeader("Authorization") String token,
                                 @PathVariable String partnerId,
                                 @PathVariable String rewardId) {
        validateAdmin(token);
        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Partner not found"));
        partner.getRewards().removeIf(r -> r.getId().equals(rewardId));
        return partnerRepository.save(partner);
    }

    // ========== Partner Self-Service Endpoints (PARTNER role) ==========

    /** Partner ดูข้อมูลร้านตัวเอง */
    @GetMapping("/api/partner/me")
    public Partner getMyPartner(@RequestHeader("Authorization") String token) {
        String partnerId = validatePartnerAndGetPartnerId(token);
        return partnerRepository.findById(partnerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Partner store not found"));
    }

    /** Partner แก้ไขข้อมูลร้านตัวเอง (ไม่อนุญาตแก้ active status) */
    @PutMapping("/api/partner/me")
    public Partner updateMyPartner(@RequestHeader("Authorization") String token, @RequestBody Partner updated) {
        String partnerId = validatePartnerAndGetPartnerId(token);
        Partner existing = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Partner store not found"));
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        existing.setLogoUrl(updated.getLogoUrl());
        existing.setCategory(updated.getCategory());
        // ไม่อนุญาตให้ Partner เปลี่ยน active status เอง
        return partnerRepository.save(existing);
    }

    /** Partner เพิ่มของรางวัล */
    @PostMapping("/api/partner/me/rewards")
    public Partner addMyReward(@RequestHeader("Authorization") String token, @RequestBody PartnerReward reward) {
        String partnerId = validatePartnerAndGetPartnerId(token);
        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Partner store not found"));
        reward.setId(UUID.randomUUID().toString());
        if (reward.getStock() == 0) reward.setStock(-1);
        partner.getRewards().add(reward);
        return partnerRepository.save(partner);
    }

    /** Partner แก้ไขของรางวัล */
    @PutMapping("/api/partner/me/rewards/{rewardId}")
    public Partner updateMyReward(@RequestHeader("Authorization") String token,
                                    @PathVariable String rewardId,
                                    @RequestBody PartnerReward updatedReward) {
        String partnerId = validatePartnerAndGetPartnerId(token);
        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Partner store not found"));
        updatedReward.setId(rewardId);
        partner.getRewards().replaceAll(r -> r.getId().equals(rewardId) ? updatedReward : r);
        return partnerRepository.save(partner);
    }

    /** Partner ลบของรางวัล */
    @DeleteMapping("/api/partner/me/rewards/{rewardId}")
    public Partner deleteMyReward(@RequestHeader("Authorization") String token, @PathVariable String rewardId) {
        String partnerId = validatePartnerAndGetPartnerId(token);
        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Partner store not found"));
        partner.getRewards().removeIf(r -> r.getId().equals(rewardId));
        return partnerRepository.save(partner);
    }

    /** ดึงรายการแลกแต้มของนักศึกษาที่รออนุมัติ */
    @GetMapping("/api/partner/redemptions/pending")
    public List<Redemption> getPartnerPendingRedemptions(@RequestHeader("Authorization") String token) {
        String partnerId = validatePartnerAndGetPartnerId(token);
        List<Redemption> redemptions = redemptionRepository.findByPartnerIdAndStatusOrderByTimestampDesc(partnerId, "PENDING");
        for (Redemption r : redemptions) {
            if (r.getUsername() == null && r.getUserId() != null) {
                userRepository.findById(r.getUserId()).ifPresent(u -> r.setUsername(u.getUsername()));
            }
        }
        return redemptions;
    }

    /** ดึงรายการแลกแต้มที่อนุมัติแล้ว */
    @GetMapping("/api/partner/redemptions/approved")
    public List<Redemption> getPartnerApprovedRedemptions(@RequestHeader("Authorization") String token) {
        String partnerId = validatePartnerAndGetPartnerId(token);
        List<Redemption> redemptions = redemptionRepository.findByPartnerIdAndStatusOrderByTimestampDesc(partnerId, "APPROVED");
        for (Redemption r : redemptions) {
            if (r.getUsername() == null && r.getUserId() != null) {
                userRepository.findById(r.getUserId()).ifPresent(u -> r.setUsername(u.getUsername()));
            }
        }
        return redemptions;
    }

    /** Partner อนุมัติการแลกคะแนน */
    @PostMapping("/api/partner/redemptions/{id}/approve")
    public Map<String, String> partnerApproveRedemption(@RequestHeader("Authorization") String token, @PathVariable("id") String id) {
        validatePartnerAndGetPartnerId(token);
        try {
            recycleService.approveRedemption(id);
            return Map.of("success", "true", "message", "Redemption approved");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    /** Partner ปฏิเสธการแลกคะแนน */
    @PostMapping("/api/partner/redemptions/{id}/reject")
    public Map<String, String> partnerRejectRedemption(@RequestHeader("Authorization") String token, @PathVariable("id") String id, @RequestBody(required=false) Map<String, String> request) {
        validatePartnerAndGetPartnerId(token);
        String reason = (request != null && request.containsKey("reason")) ? request.get("reason") : "ถูกปฏิเสธโดยร้านค้า";
        try {
            recycleService.rejectRedemption(id, reason);
            return Map.of("success", "true", "message", "Redemption rejected");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }
}
