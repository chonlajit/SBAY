package com.example.iotbackend.config;

import com.example.iotbackend.model.WasteType;
import com.example.iotbackend.repository.WasteTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private WasteTypeRepository wasteTypeRepository;

    @Override
    public void run(String... args) throws Exception {
        ensureWasteTypePricing("PLASTIC_BOTTLE", "ขวดพลาสติก", 10.0, 1);
        ensureWasteTypePricing("ALUMINUM_CAN", "กระป๋องอลูมิเนียม", 40.0, 3);
        ensureWasteTypePricing("BEVERAGE_CARTON", "กล่องเครื่องดื่ม", 9.0, 1);
    }

    private void ensureWasteTypePricing(String type, String label, double defaultPricePerKg, int defaultPoints) {
        WasteType wt = wasteTypeRepository.findByType(type).orElse(new WasteType());
        wt.setType(type);
        wt.setLabel(label);
        if (wt.getPoints() <= 0) {
            wt.setPoints(defaultPoints);
        }
        if (wt.getPricePerKg() == null || wt.getPricePerKg() <= 0) {
            wt.setPricePerKg(defaultPricePerKg);
        }
        if (wt.getUserPointRate() == null || wt.getUserPointRate() <= 0) {
            wt.setUserPointRate(0.80);
        }

        double rate = wt.getUserPointRate();
        double price = wt.getPricePerKg();
        double pointsKg = price * rate * 100.0;
        double scoreGram = pointsKg / 1000.0;
        double profitKg = price * (1.0 - rate);

        wt.setPointsPerKg(Math.round(pointsKg * 100.0) / 100.0);
        wt.setScorePerGram(Math.round(scoreGram * 10000.0) / 10000.0);
        wt.setProfitPerKg(Math.round(profitKg * 100.0) / 100.0);
        wt.setProfitPointsPerKg(Math.round(profitKg * 100.0 * 100.0) / 100.0);
        if (wt.getUpdatedAt() == null) {
            wt.setUpdatedAt(java.time.LocalDateTime.now());
            wt.setUpdatedBy("SYSTEM_INIT");
        }
        wasteTypeRepository.save(wt);
    }
}
