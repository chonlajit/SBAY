package com.example.iotbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class IotBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(IotBackendApplication.class, args);
	}

}
