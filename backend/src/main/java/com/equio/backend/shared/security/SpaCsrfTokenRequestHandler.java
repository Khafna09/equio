package com.equio.backend.shared.security;

import jakarta.servlet.http.*;
import org.springframework.security.web.csrf.*;
import org.springframework.util.StringUtils;

import java.util.function.Supplier;

public final class SpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {
    private final CsrfTokenRequestHandler plain =
            new CsrfTokenRequestAttributeHandler();
    private final CsrfTokenRequestHandler xor =
            new XorCsrfTokenRequestAttributeHandler();

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            Supplier<CsrfToken> csrfToken
    ) {
        // The JSON bootstrap returns the plain header token, not an HTML XOR token.
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if ("/api/v1/auth/csrf".equals(path)) plain.handle(request, response, csrfToken);
        else xor.handle(request, response, csrfToken);
        csrfToken.get();
    }

    @Override
    public String resolveCsrfTokenValue(
            HttpServletRequest request,
            CsrfToken csrfToken
    ) {
        return StringUtils.hasText(request.getHeader(csrfToken.getHeaderName()))
                ? plain.resolveCsrfTokenValue(request, csrfToken)
                : xor.resolveCsrfTokenValue(request, csrfToken);
    }
}
