package com.equio.backend.shared.exceptions;

public class ResultSetTooLargeException extends RuntimeException {
    public ResultSetTooLargeException(int maximumResults) {
        super("The query exceeds the maximum of " + maximumResults
                + " results. Apply narrower filters.");
    }
}
