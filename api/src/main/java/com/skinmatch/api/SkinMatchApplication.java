package com.skinmatch.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class SkinMatchApplication {

    public static void main(String[] args) {
        SpringApplication.run(SkinMatchApplication.class, args);
    }
}
