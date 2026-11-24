package com.equio.backend.emailintake.services;

import com.equio.backend.emailintake.domain.EmailIntakeDecision.ModelResult;
import com.equio.backend.emailintake.domain.EmailIntakeDecision.ModelUnavailable;
import com.equio.backend.emailintake.domain.EmailIntakeDecision.Outcome;
import com.equio.backend.emailintake.domain.EmailTextTriage;
import com.equio.backend.emailintake.domain.ExpenseEvidenceExtractor;
import com.equio.backend.emailintake.infrastructure.JevEmailClassifier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.function.Function;

@Service
public class EmailCandidateService {
    public enum Result { DRAFT_CREATED, DUPLICATE, IGNORED, NEEDS_REVIEW }

    private final EmailTextTriage triage = new EmailTextTriage();
    private final ExpenseEvidenceExtractor extractor = new ExpenseEvidenceExtractor();
    private final ExpenseDraftService drafts;
    private final Function<String, ModelResult> classifier;

    @Autowired
    public EmailCandidateService(ExpenseDraftService drafts, @Value("${EQUIO_EMAIL_JEV_API_KEY:}") String apiKey) {
        this(drafts, apiKey.isBlank() ? evidence -> new ModelUnavailable() : new JevEmailClassifier(apiKey)::classify);
    }

    EmailCandidateService(ExpenseDraftService drafts, Function<String, ModelResult> classifier) {
        this.drafts = drafts;
        this.classifier = classifier;
    }

    // The caller must authenticate the delivery and resolve its recipient before invoking this service.
    public Result process(long userId, String fingerprint, String subject, String plainText) {
        if (userId <= 0 || fingerprint == null || !fingerprint.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException("Invalid delivery identity");
        }
        var decision = triage.decide(subject, plainText, classifier);
        if (decision.outcome() == Outcome.IGNORE) {
            return Result.IGNORED;
        }
        if (decision.outcome() != Outcome.EXPENSE_CANDIDATE) {
            return Result.NEEDS_REVIEW;
        }
        var evidence = extractor.extract(plainText);
        if (evidence.isEmpty()) {
            return Result.NEEDS_REVIEW;
        }
        var fields = evidence.get();
        return drafts.recordCandidate(userId, fingerprint, fields.amount(), fields.currency(), null, fields.occurredAt())
                ? Result.DRAFT_CREATED : Result.DUPLICATE;
    }
}
