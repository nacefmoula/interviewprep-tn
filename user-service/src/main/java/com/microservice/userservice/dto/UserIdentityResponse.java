package com.microservice.userservice.dto;

import lombok.Data;

@Data
public class UserIdentityResponse {

    private String keycloakId;
    private String email;
    private String firstName;
    private String lastName;
}
