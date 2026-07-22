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
        if (wasteTypeRepository.count() == 0) {
            WasteType plasticBottle = new WasteType();
            plasticBottle.setType("PLASTIC_BOTTLE");
            plasticBottle.setLabel("ขวดพลาสติก");
            plasticBottle.setPoints(1);

            WasteType aluminumCan = new WasteType();
            aluminumCan.setType("ALUMINUM_CAN");
            aluminumCan.setLabel("กระป๋องอลูมิเนียม");
            aluminumCan.setPoints(3);

            WasteType beverageCarton = new WasteType();
            beverageCarton.setType("BEVERAGE_CARTON");
            beverageCarton.setLabel("กล่องเครื่องดื่ม");
            beverageCarton.setPoints(1);

            List<WasteType> initialTypes = Arrays.asList(plasticBottle, aluminumCan, beverageCarton);
            wasteTypeRepository.saveAll(initialTypes);
            
            System.out.println("Initialized default Waste Types.");
        }
    }
}
