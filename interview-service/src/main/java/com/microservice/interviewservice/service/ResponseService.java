// service/ResponseService.java
package com.microservice.interviewservice.service;

import com.microservice.interviewservice.dto.request.SubmitResponseRequest;
import com.microservice.interviewservice.dto.response.SubmitResponseResult;

public interface ResponseService {
    SubmitResponseResult submitResponse(Long sessionId, SubmitResponseRequest request, String userId);
}