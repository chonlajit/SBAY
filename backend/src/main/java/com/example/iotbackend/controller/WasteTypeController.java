package com.example.iotbackend.controller;

import com.example.iotbackend.model.WasteType;
import com.example.iotbackend.repository.WasteTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wastetypes")
@CrossOrigin(origins = "*")
public class WasteTypeController {

    @Autowired
    private WasteTypeRepository wasteTypeRepository;

    @GetMapping
    public List<WasteType> getAllWasteTypes() {
        return wasteTypeRepository.findAll();
    }

    @PostMapping
    public WasteType addWasteType(@RequestBody WasteType wasteType) {
        return wasteTypeRepository.save(wasteType);
    }
}
