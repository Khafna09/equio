package com.equio.backend.emailintake.infrastructure;

import com.equio.backend.emailintake.domain.EmailIntakeDecision.ModelAnswer;
import com.equio.backend.emailintake.domain.EmailIntakeDecision.ModelLabel;
import com.equio.backend.emailintake.domain.EmailIntakeDecision.ModelUnavailable;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class JevEmailClassifierTest {
    private static final String ENDPOINT = "https://api.typesafe.ai/v1/systemone";
    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final JevEmailClassifier classifier = new JevEmailClassifier("test-only", builder.build());

    @Test
    void sendsOneTypedQuestionAndAcceptsStrongDecision() {
        server.expect(requestTo(ENDPOINT)).andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-only"))
                .andExpect(jsonPath("$.state.transaction_evidence").value("Synthetic payment evidence"))
                .andExpect(jsonPath("$.questions.transaction_kind.type").value("choice"))
                .andRespond(withSuccess(answer("confirmed_expense", "0.97", "0.88"), MediaType.APPLICATION_JSON));

        assertEquals(new ModelAnswer(ModelLabel.CONFIRMED_EXPENSE, true),
                classifier.classify("Synthetic payment evidence"));
        server.verify();
    }

    @Test
    void lowProbabilityDoesNotQualifyEvenWithHighConfidence() {
        server.expect(requestTo(ENDPOINT))
                .andRespond(withSuccess(answer("non_expense", "0.86", "0.90"), MediaType.APPLICATION_JSON));
        assertEquals(new ModelAnswer(ModelLabel.NON_EXPENSE, false), classifier.classify("Synthetic evidence"));
        server.verify();
    }

    @Test
    void outOfCreditsDoesNotRetryOrDiscard() {
        server.expect(requestTo(ENDPOINT)).andRespond(withStatus(HttpStatus.PAYMENT_REQUIRED));
        assertEquals(new ModelUnavailable(), classifier.classify("Synthetic evidence"));
        server.verify();
    }

    @Test
    void rejectsUnrecognizedChoices() {
        server.expect(requestTo(ENDPOINT))
                .andRespond(withSuccess(answer("other", "1.0", "1.0"), MediaType.APPLICATION_JSON));
        assertEquals(new ModelUnavailable(), classifier.classify("Synthetic evidence"));
        server.verify();
    }

    @Test
    void refusesLongInputOrMissingCredentialsWithoutCallingProvider() {
        assertEquals(new ModelUnavailable(), classifier.classify("x".repeat(1201)));
        assertEquals(new ModelUnavailable(), new JevEmailClassifier("", builder.build()).classify("Synthetic evidence"));
        server.verify();
    }

    private static String answer(String choice, String probability, String confidence) {
        return """
                {"answers":{"transaction_kind":{"type":"choice","choice":"%s",
                 "probabilities":{"%s":%s},"confidence":%s}}}
                """.formatted(choice, choice, probability, confidence);
    }
}
