package com.equio.backend.budgets.services;

import com.equio.backend.budgets.dto.responses.BudgetHistoryReportResponse;
import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.entities.enums.SavingsType;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.shared.exceptions.ReportTooLargeException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.transactions.entities.Category;
import com.equio.backend.transactions.entities.Movement;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.repositories.CategoryRepository;
import com.equio.backend.transactions.repositories.MovementRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class BudgetHistoryReportService {

    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);
    private static final String GOAL_CONTRIBUTION_PREFIX = "Aporte a meta:";
    private static final long MAX_TIMELINE_POINTS = 366;

    private final BudgetRepository budgetRepository;
    private final MovementRepository movementRepository;
    private final CategoryRepository categoryRepository;
    private final RlsContext rlsContext;
    private final int maxReportMovements;

    public BudgetHistoryReportService(BudgetRepository budgetRepository,
                                      MovementRepository movementRepository,
                                      CategoryRepository categoryRepository,
                                      RlsContext rlsContext,
                                      @Value("${app.reports.max-movements:2000}") int maxReportMovements) {
        if (maxReportMovements < 100 || maxReportMovements > 10_000) {
            throw new IllegalStateException("Report movement limit must be between 100 and 10000");
        }
        this.budgetRepository = budgetRepository;
        this.movementRepository = movementRepository;
        this.categoryRepository = categoryRepository;
        this.rlsContext = rlsContext;
        this.maxReportMovements = maxReportMovements;
    }

    @Transactional(readOnly = true)
    public BudgetHistoryReportResponse getReport(Long userId, Long budgetId) {
        rlsContext.setUserId(userId);
        Budget budget = budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget"));
        if (budget.getStatus() != BudgetStatus.CLOSED || budget.getCategory() != null) {
            throw new IllegalArgumentException("Historical reports are only available for closed global budgets");
        }
        if (budget.getStartDate() == null || budget.getEndDate() == null) {
            throw new IllegalArgumentException("The closed budget does not have a valid reporting period");
        }

        LocalDate startDate = budget.getStartDate();
        LocalDate endDate = budget.getEndDate();
        List<Movement> movements = getMovements(userId, startDate, endDate, true);
        List<Movement> expenses = movements.stream()
                .filter(movement -> movement.getType() == MovementType.EXPENSE)
                .toList();
        List<Movement> incomes = movements.stream()
                .filter(movement -> movement.getType() == MovementType.INCOME)
                .toList();

        BigDecimal totalExpenses = sumAmounts(expenses);
        BigDecimal totalIncome = sumAmounts(incomes);
        BigDecimal configuredSavings = calculateConfiguredSavings(budget);
        BigDecimal spendingLimit = budget.getTotalAmount().subtract(configuredSavings).max(BigDecimal.ZERO);
        BigDecimal remainingAmount = spendingLimit.subtract(totalExpenses).max(BigDecimal.ZERO);
        BigDecimal exceededAmount = totalExpenses.subtract(spendingLimit).max(BigDecimal.ZERO);
        double spentPercentage = percentage(totalExpenses, spendingLimit);

        List<Budget> children = budgetRepository.findByParentBudgetId(budgetId).stream()
                .filter(child -> child.getStatus() == BudgetStatus.CLOSED)
                .toList();
        List<BudgetHistoryReportResponse.CategoryConsumption> categories = buildCategories(
                expenses, children, categoryRepository.findByUserId(userId));
        List<BudgetHistoryReportResponse.CategoryConsumption> topCategories = categories.stream()
                .filter(category -> category.spentAmount().signum() > 0)
                .sorted(Comparator.comparing(BudgetHistoryReportResponse.CategoryConsumption::spentAmount).reversed())
                .limit(5)
                .toList();
        int categoriesWithLimit = (int) categories.stream()
                .filter(category -> category.limitAmount() != null)
                .count();
        int categoriesWithinLimit = (int) categories.stream()
                .filter(category -> Boolean.TRUE.equals(category.withinLimit()))
                .count();

        List<BudgetHistoryReportResponse.GoalContribution> goalContributionDetails = buildGoalContributions(expenses);
        BigDecimal goalContributions = goalContributionDetails.stream()
                .map(BudgetHistoryReportResponse.GoalContribution::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal balance = totalIncome.subtract(totalExpenses);
        BigDecimal retainedSavings = totalIncome.subtract(totalExpenses).add(goalContributions).max(BigDecimal.ZERO);
        double savingsRate = percentage(retainedSavings, totalIncome);

        long periodDays = Math.max(1, ChronoUnit.DAYS.between(startDate, endDate) + 1);
        BigDecimal averageDailySpend = totalExpenses.divide(BigDecimal.valueOf(periodDays), 2, RoundingMode.HALF_UP);
        Map<LocalDate, BigDecimal> dailyExpenses = buildDailyExpenses(expenses);
        BudgetHistoryReportResponse.SpendingPeak peak = dailyExpenses.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(entry -> new BudgetHistoryReportResponse.SpendingPeak(entry.getKey(), entry.getValue()))
                .orElse(null);
        BigDecimal weekendExpenses = expenses.stream()
                .filter(movement -> isWeekend(movement.getDate().toLocalDate()))
                .map(Movement::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        double weekendExpensePercentage = percentage(weekendExpenses, totalExpenses);
        Map<DayOfWeek, BigDecimal> expensesByWeekday = new HashMap<>();
        for (Movement expense : expenses) {
            expensesByWeekday.merge(expense.getDate().getDayOfWeek(), expense.getAmount(), BigDecimal::add);
        }
        BudgetHistoryReportResponse.WeekdayInsight mostExpensiveWeekday = expensesByWeekday.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(entry -> new BudgetHistoryReportResponse.WeekdayInsight(
                        entry.getKey().name(), entry.getValue(), percentage(entry.getValue(), totalExpenses)))
                .orElse(null);

        List<BudgetHistoryReportResponse.ExpenseItem> highestExpenses = expenses.stream()
                .sorted(Comparator.comparing(Movement::getAmount).reversed())
                .limit(5)
                .map(this::toExpenseItem)
                .toList();
        List<BudgetHistoryReportResponse.MovementItem> reportMovements = movements.stream()
                .map(this::toMovementItem)
                .toList();
        List<BudgetHistoryReportResponse.TimelinePoint> timeline = buildTimeline(
                startDate, endDate, spendingLimit, dailyExpenses, periodDays);
        BudgetHistoryReportResponse.PeriodComparison comparison = buildComparison(
                userId, budget, startDate, expenses, totalExpenses);

        return new BudgetHistoryReportResponse(
                budget.getId(),
                budget.getName(),
                startDate,
                endDate,
                budget.getTotalAmount(),
                spendingLimit,
                totalExpenses,
                remainingAmount,
                exceededAmount,
                spentPercentage,
                exceededAmount.signum() == 0,
                categoriesWithinLimit,
                categoriesWithLimit,
                configuredSavings,
                goalContributions,
                goalContributionDetails,
                totalIncome,
                totalExpenses,
                balance,
                retainedSavings,
                savingsRate,
                averageDailySpend,
                peak,
                mostExpensiveWeekday,
                weekendExpensePercentage,
                categories,
                topCategories,
                highestExpenses,
                reportMovements,
                timeline,
                comparison,
                LocalDateTime.now()
        );
    }

    private List<Movement> getMovements(
            Long userId,
            LocalDate startDate,
            LocalDate endDate,
            boolean failWhenTooLarge
    ) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(23, 59, 59);
        long movementCount = movementRepository.countByUserIdAndDateBetween(userId, start, end);
        if (movementCount > maxReportMovements) {
            if (failWhenTooLarge) {
                throw new ReportTooLargeException(maxReportMovements);
            }
            return null;
        }
        return movementRepository.findByUserIdAndDateBetweenOrderByDateDesc(
                userId, start, end);
    }

    private List<BudgetHistoryReportResponse.CategoryConsumption> buildCategories(
            List<Movement> expenses, List<Budget> children, List<Category> allCategories) {
        Map<Long, CategoryAccumulator> byCategory = new LinkedHashMap<>();
        Map<Long, BigDecimal> limits = new HashMap<>();
        for (Budget child : children) {
            Category category = child.getCategory();
            if (category == null) continue;
            limits.put(category.getId(), child.getTotalAmount());
        }
        for (Category category : allCategories) {
            byCategory.put(category.getId(), new CategoryAccumulator(
                    category.getId(), category.getName(), category.getColor(), category.getIcon(), limits.get(category.getId())));
        }
        byCategory.put(-1L, new CategoryAccumulator(null, "Uncategorized", "#a1a1aa", null, null));
        for (Movement expense : expenses) {
            Category category = expense.getCategory();
            Long key = category != null ? category.getId() : -1L;
            CategoryAccumulator accumulator = byCategory.computeIfAbsent(key, ignored -> new CategoryAccumulator(
                    category != null ? category.getId() : null,
                    category != null ? category.getName() : "Uncategorized",
                    category != null ? category.getColor() : "#a1a1aa",
                    category != null ? category.getIcon() : null,
                    null));
            accumulator.spent = accumulator.spent.add(expense.getAmount());
        }
        return byCategory.values().stream()
                .map(CategoryAccumulator::toResponse)
                .sorted(Comparator.comparing(BudgetHistoryReportResponse.CategoryConsumption::spentAmount).reversed())
                .toList();
    }

    private List<BudgetHistoryReportResponse.GoalContribution> buildGoalContributions(List<Movement> expenses) {
        Map<String, BigDecimal> totals = new LinkedHashMap<>();
        for (Movement expense : expenses) {
            String description = expense.getDescription();
            if (description == null || !description.startsWith(GOAL_CONTRIBUTION_PREFIX)) continue;
            String goalName = description.substring(GOAL_CONTRIBUTION_PREFIX.length()).trim();
            if (goalName.isBlank()) goalName = "Savings goal";
            totals.merge(goalName, expense.getAmount(), BigDecimal::add);
        }
        return totals.entrySet().stream()
                .map(entry -> new BudgetHistoryReportResponse.GoalContribution(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(BudgetHistoryReportResponse.GoalContribution::amount).reversed())
                .toList();
    }

    private Map<LocalDate, BigDecimal> buildDailyExpenses(List<Movement> expenses) {
        Map<LocalDate, BigDecimal> daily = new HashMap<>();
        for (Movement expense : expenses) {
            daily.merge(expense.getDate().toLocalDate(), expense.getAmount(), BigDecimal::add);
        }
        return daily;
    }

    private List<BudgetHistoryReportResponse.TimelinePoint> buildTimeline(
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal spendingLimit,
            Map<LocalDate, BigDecimal> dailyExpenses,
            long periodDays) {
        long step = Math.max(1, (long) Math.ceil((double) periodDays / MAX_TIMELINE_POINTS));
        List<BudgetHistoryReportResponse.TimelinePoint> points = new ArrayList<>();
        BigDecimal cumulative = BigDecimal.ZERO;
        LocalDate cursor = startDate;
        while (!cursor.isAfter(endDate)) {
            LocalDate bucketEnd = cursor.plusDays(step - 1).isAfter(endDate) ? endDate : cursor.plusDays(step - 1);
            LocalDate day = cursor;
            while (!day.isAfter(bucketEnd)) {
                cumulative = cumulative.add(dailyExpenses.getOrDefault(day, BigDecimal.ZERO));
                day = day.plusDays(1);
            }
            long elapsedDays = ChronoUnit.DAYS.between(startDate, bucketEnd) + 1;
            BigDecimal ideal = spendingLimit.multiply(BigDecimal.valueOf(elapsedDays))
                    .divide(BigDecimal.valueOf(periodDays), 2, RoundingMode.HALF_UP);
            points.add(new BudgetHistoryReportResponse.TimelinePoint(bucketEnd, cumulative, ideal));
            cursor = bucketEnd.plusDays(1);
        }
        return points;
    }

    private BudgetHistoryReportResponse.PeriodComparison buildComparison(
            Long userId,
            Budget currentBudget,
            LocalDate currentStart,
            List<Movement> currentExpenses,
            BigDecimal currentTotalExpenses) {
        Budget previous = budgetRepository.findByUserIdAndStatus(userId, BudgetStatus.CLOSED).stream()
                .filter(candidate -> candidate.getCategory() == null)
                .filter(candidate -> !candidate.getId().equals(currentBudget.getId()))
                .filter(candidate -> candidate.getStartDate() != null && candidate.getEndDate() != null)
                .filter(candidate -> candidate.getEndDate().isBefore(currentStart))
                .max(Comparator.comparing(Budget::getEndDate))
                .orElse(null);
        if (previous == null) return null;

        List<Movement> previousMovements = getMovements(
                userId, previous.getStartDate(), previous.getEndDate(), false);
        if (previousMovements == null) return null;

        List<Movement> previousExpenses = previousMovements.stream()
                .filter(movement -> movement.getType() == MovementType.EXPENSE)
                .toList();
        BigDecimal previousTotal = sumAmounts(previousExpenses);
        Double changePercentage = previousTotal.signum() == 0
                ? null
                : currentTotalExpenses.subtract(previousTotal)
                        .divide(previousTotal, 4, RoundingMode.HALF_UP)
                        .multiply(ONE_HUNDRED)
                        .doubleValue();

        Map<String, NamedAmount> currentCategories = categoryTotals(currentExpenses);
        Map<String, NamedAmount> previousCategories = categoryTotals(previousExpenses);
        Map<String, NamedAmount> allCategories = new HashMap<>(previousCategories);
        allCategories.putAll(currentCategories);

        BudgetHistoryReportResponse.CategoryChange greatestReduction = null;
        BudgetHistoryReportResponse.CategoryChange greatestIncrease = null;
        for (Map.Entry<String, NamedAmount> entry : allCategories.entrySet()) {
            BigDecimal current = currentCategories.getOrDefault(entry.getKey(), new NamedAmount(entry.getValue().name, BigDecimal.ZERO)).amount;
            BigDecimal prior = previousCategories.getOrDefault(entry.getKey(), new NamedAmount(entry.getValue().name, BigDecimal.ZERO)).amount;
            BigDecimal reduction = prior.subtract(current);
            BigDecimal increase = current.subtract(prior);
            if (reduction.signum() > 0 && (greatestReduction == null || reduction.compareTo(greatestReduction.amount()) > 0)) {
                greatestReduction = new BudgetHistoryReportResponse.CategoryChange(entry.getValue().name, reduction);
            }
            if (increase.signum() > 0 && (greatestIncrease == null || increase.compareTo(greatestIncrease.amount()) > 0)) {
                greatestIncrease = new BudgetHistoryReportResponse.CategoryChange(entry.getValue().name, increase);
            }
        }

        return new BudgetHistoryReportResponse.PeriodComparison(
                previous.getId(),
                previous.getStartDate(),
                previous.getEndDate(),
                previousTotal,
                changePercentage,
                greatestReduction,
                greatestIncrease
        );
    }

    private Map<String, NamedAmount> categoryTotals(List<Movement> expenses) {
        Map<String, NamedAmount> totals = new HashMap<>();
        for (Movement expense : expenses) {
            Category category = expense.getCategory();
            String key = category != null ? String.valueOf(category.getId()) : "uncategorized";
            String name = category != null ? category.getName() : "Uncategorized";
            NamedAmount current = totals.get(key);
            totals.put(key, new NamedAmount(name, (current != null ? current.amount : BigDecimal.ZERO).add(expense.getAmount())));
        }
        return totals;
    }

    private BudgetHistoryReportResponse.ExpenseItem toExpenseItem(Movement movement) {
        Category category = movement.getCategory();
        return new BudgetHistoryReportResponse.ExpenseItem(
                movement.getId(),
                movement.getDate(),
                movement.getDescription(),
                category != null ? category.getName() : "Uncategorized",
                movement.getAmount()
        );
    }

    private BudgetHistoryReportResponse.MovementItem toMovementItem(Movement movement) {
        Category category = movement.getCategory();
        return new BudgetHistoryReportResponse.MovementItem(
                movement.getId(),
                movement.getDate(),
                movement.getType().name(),
                movement.getDescription(),
                category != null ? category.getId() : null,
                category != null ? category.getName() : "Uncategorized",
                category != null ? category.getColor() : "#a1a1aa",
                category != null ? category.getIcon() : null,
                movement.getAmount()
        );
    }

    private BigDecimal calculateConfiguredSavings(Budget budget) {
        if (budget.getSavingsType() == null || budget.getSavingsValue() == null) return BigDecimal.ZERO;
        if (budget.getSavingsType() == SavingsType.FIXED) return budget.getSavingsValue();
        return budget.getTotalAmount().multiply(budget.getSavingsValue())
                .divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal sumAmounts(List<Movement> movements) {
        return movements.stream().map(Movement::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private double percentage(BigDecimal value, BigDecimal total) {
        if (total == null || total.signum() == 0) return 0;
        return value.divide(total, 4, RoundingMode.HALF_UP).multiply(ONE_HUNDRED).doubleValue();
    }

    private boolean isWeekend(LocalDate date) {
        return date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY;
    }

    private static final class CategoryAccumulator {
        private final Long id;
        private final String name;
        private final String color;
        private final String icon;
        private final BigDecimal limit;
        private BigDecimal spent = BigDecimal.ZERO;

        private CategoryAccumulator(Long id, String name, String color, String icon, BigDecimal limit) {
            this.id = id;
            this.name = name;
            this.color = color;
            this.icon = icon;
            this.limit = limit;
        }

        private BudgetHistoryReportResponse.CategoryConsumption toResponse() {
            Double progress = limit != null ? percentageValue(spent, limit) : null;
            Boolean within = limit != null ? spent.compareTo(limit) <= 0 : null;
            return new BudgetHistoryReportResponse.CategoryConsumption(
                    id, name, color, icon, limit, spent, progress, within);
        }

        private static double percentageValue(BigDecimal value, BigDecimal total) {
            if (total.signum() == 0) return 0;
            return value.divide(total, 4, RoundingMode.HALF_UP).multiply(ONE_HUNDRED).doubleValue();
        }
    }

    private record NamedAmount(String name, BigDecimal amount) {}
}
