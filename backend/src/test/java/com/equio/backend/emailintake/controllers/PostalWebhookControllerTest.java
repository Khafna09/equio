package com.equio.backend.emailintake.controllers;

import com.equio.backend.emailintake.services.PostalDeliveryQueue;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class PostalWebhookControllerTest {
    private static final UUID INBOX = UUID.randomUUID();
    private static final UUID EMAIL = UUID.randomUUID();
    private static final byte[] KEY = new byte[32];
    private final PostalDeliveryQueue queue = mock(PostalDeliveryQueue.class);
    private final PostalWebhookController controller = new PostalWebhookController(queue, JsonMapper.builder().build(),
            "whsec_" + Base64.getEncoder().encodeToString(KEY), INBOX, 9L);

    @Test
    void acceptsValidNotificationForConfiguredInbox() throws Exception {
        assertEquals(202, send(INBOX, true));
        verify(queue).enqueue(9L, INBOX, EMAIL);
    }

    @Test
    void rejectsBadSignatureAndIgnoresOtherInboxWithoutWriting() throws Exception {
        assertEquals(401, send(INBOX, false));
        assertEquals(204, send(UUID.randomUUID(), true));
        verifyNoInteractions(queue);
    }

    private int send(UUID inbox, boolean valid) throws Exception {
        byte[] body = """
                {"type":"email.received","data":{"inbox_id":"%s","email_id":"%s"}}
                """.formatted(inbox, EMAIL).getBytes(StandardCharsets.UTF_8);
        String time = Long.toString(Instant.now().getEpochSecond());
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(KEY, "HmacSHA256"));
        mac.update(("fixture." + time + ".").getBytes(StandardCharsets.UTF_8));
        String signature = valid ? Base64.getEncoder().encodeToString(mac.doFinal(body)) : "bad";
        return controller.receive("fixture", time, "v1," + signature, body).getStatusCode().value();
    }
}
