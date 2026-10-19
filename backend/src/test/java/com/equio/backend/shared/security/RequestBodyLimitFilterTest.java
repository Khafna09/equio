package com.equio.backend.shared.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.json.JsonMapper;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;

class RequestBodyLimitFilterTest {
    private final RequestBodyLimitFilter filter = new RequestBodyLimitFilter(new SecurityErrorWriter(JsonMapper.builder().build()), 1024);

    @Test void rejectsKnownAndUnknownLengthBodiesBeforeController() throws Exception {
        for (boolean chunked : new boolean[]{false, true}) {
            var request = new MockHttpServletRequest("POST", "/api/v1/auth/sign-up") {
                @Override public long getContentLengthLong() { return chunked ? -1 : super.getContentLengthLong(); }
            };
            request.setContent(new byte[1025]);
            var response = new MockHttpServletResponse();
            filter.doFilter(request, response, (req, res) -> fail("Oversize payload reached controller"));
            assertEquals(413, response.getStatus());
        }
    }

    @Test void preservesUtf8AndRejectsCompression() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/v1/movements");
        byte[] json = "{\"description\":\"caf\u00e9\"}".getBytes(StandardCharsets.UTF_8);
        request.setContent(json);
        filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> assertArrayEquals(json, req.getInputStream().readAllBytes()));
        request.addHeader("Content-Encoding", "gzip");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> fail("Compressed request accepted"));
        assertEquals(415, response.getStatus());
    }
}
