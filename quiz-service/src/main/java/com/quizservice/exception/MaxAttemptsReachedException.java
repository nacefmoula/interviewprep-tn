package com.quizservice.exception;

public class MaxAttemptsReachedException extends RuntimeException {
    public MaxAttemptsReachedException(String message) {
        super(message);
    }
}