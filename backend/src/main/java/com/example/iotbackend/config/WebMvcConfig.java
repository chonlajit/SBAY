package com.example.iotbackend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Autowired
    private DeviceAuthInterceptor deviceAuthInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Protect endpoints that the IoT Device calls
        // registry.addInterceptor(deviceAuthInterceptor)
        //         .addPathPatterns("/api/sessions")
        //         .addPathPatterns("/api/sessions/user/**")
        //         .addPathPatterns("/api/devices/**");
    }

    @Override
    public void addResourceHandlers(org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry registry) {
        // Serve files from the uploads directory
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
    }
}
