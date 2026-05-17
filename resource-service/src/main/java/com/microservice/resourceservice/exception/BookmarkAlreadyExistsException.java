package com.microservice.resourceservice.exception;

public class BookmarkAlreadyExistsException extends RuntimeException {

    public BookmarkAlreadyExistsException(String message) {
        super(message);
    }
}
