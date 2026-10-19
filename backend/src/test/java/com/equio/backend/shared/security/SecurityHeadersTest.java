package com.equio.backend.shared.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import tools.jackson.databind.ObjectMapper;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityHeadersTest {
    @Autowired
    private MockMvc mockMvc;
    @Autowired private ObjectMapper mapper;

    @Test
    void rejectsAnonymousRequestsAndAddsSecurityHeaders() throws Exception {
        mockMvc.perform(get("/api/v1/categories"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Referrer-Policy", "no-referrer"))
                .andExpect(header().string(
                        "Permissions-Policy",
                        "camera=(), microphone=(), geolocation=(), payment=()"
                ))
                .andExpect(header().string(
                        "Content-Security-Policy",
                        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
                ));
    }

    @Test
    void requiresCsrfForRefreshAndLogout() throws Exception {
        mockMvc.perform(post("/api/v1/auth/sign-in"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isForbidden());
    }

    @Test
    void issuesCsrfCookieForSpa() throws Exception {
        mockMvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("XSRF-TOKEN"))
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void exposesSanitizedLivenessAndDatabaseReadinessOnly() throws Exception {
        mockMvc.perform(get("/actuator/health/liveness"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
        mockMvc.perform(get("/actuator/health/readiness"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components").doesNotExist());

        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isUnauthorized());
    }

    @Test void boundsJsonComplexityAndRejectsAmbiguousFields() throws Exception {
        var constraints = mapper.tokenStreamFactory().streamReadConstraints();
        org.junit.jupiter.api.Assertions.assertEquals(16, constraints.getMaxNestingDepth());
        org.junit.jupiter.api.Assertions.assertEquals(4096, constraints.getMaxStringLength());
        for (String json : new String[]{"{\"email\":\"a\",\"email\":\"b\"}",
                "[".repeat(17) + "0" + "]".repeat(17), "{\"email\":\"" + "x".repeat(4097) + "\"}"}) {
            mockMvc.perform(signup(json))
                    .andExpect(status().isBadRequest());
        }
        mockMvc.perform(signup("x".repeat(32769)))
                .andExpect(status().is(413));
    }

    @Test void registrationResponseDoesNotRevealExistingEmail() throws Exception {
        String data = "{\"email\":\"uniform@test.example\",\"password\":\"Uniform-2026-Password!\",\"firstName\":\"Ana\",\"lastName\":\"User\"}";
        String first = mockMvc.perform(signup(data))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.id").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        String duplicate = mockMvc.perform(signup(data))
                .andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertEquals(first, duplicate);
    }

    private MockHttpServletRequestBuilder signup(String json) throws Exception {
        var bootstrap = mockMvc.perform(get("/api/v1/auth/csrf")).andReturn().getResponse();
        var cookie = bootstrap.getCookie("XSRF-TOKEN");
        org.junit.jupiter.api.Assertions.assertNotNull(cookie);
        org.junit.jupiter.api.Assertions.assertEquals(cookie.getValue(), mapper.readTree(bootstrap.getContentAsString()).get("token").asString());
        return post("/api/v1/auth/sign-up").cookie(cookie).header("X-XSRF-TOKEN", cookie.getValue())
                .contentType(MediaType.APPLICATION_JSON).content(json);
    }
}
