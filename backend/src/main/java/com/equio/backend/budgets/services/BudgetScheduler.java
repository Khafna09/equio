package com.equio.backend.budgets.services;

import com.equio.backend.users.services.UserLookupService;
import org.slf4j.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@ConditionalOnProperty(name = "app.jobs.budgets.enabled", havingValue = "true", matchIfMissing = true)
public class BudgetScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(BudgetScheduler.class);
    private final UserLookupService userLookupService;
    private final BudgetCycleProcessor processor;

    public BudgetScheduler(
            UserLookupService userLookupService,
            BudgetCycleProcessor processor
    ) {
        this.userLookupService = userLookupService;
        this.processor = processor;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Scheduled(cron = "${app.jobs.budgets.cron:0 0 */6 * * *}")
    public void processExpiredBudgets() {
        LocalDate today = LocalDate.now();
        long cursor = 0;
        while (true) {
            var userIds = userLookupService.findIdsAfter(cursor, 100);
            if (userIds.isEmpty()) return;
            for (Long userId : userIds) {
                try {
                    processor.processUser(userId, today);
                } catch (RuntimeException exception) {
                    LOGGER.error("budget_cycle_failed userId={} type={}", userId,
                            exception.getClass().getSimpleName());
                }
            }
            cursor = userIds.getLast();
        }
    }
}
