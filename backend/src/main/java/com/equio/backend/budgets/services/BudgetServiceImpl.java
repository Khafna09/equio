package com.equio.backend.budgets.services;

import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.shared.security.FinancialConcurrencyGuard;
import com.equio.backend.budgets.dto.requests.BudgetRequest;
import com.equio.backend.budgets.dto.responses.BudgetResponse;
import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.entities.enums.BudgetScope;
import com.equio.backend.budgets.entities.enums.SavingsType;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.events.BudgetLinkRemovalRequestedEvent;
import com.equio.backend.transactions.entities.Category;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.services.CategoryLookupService;
import com.equio.backend.transactions.services.MovementQueryService;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.services.UserLookupService;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.HashSet;
import java.util.Map;

@Service
public class BudgetServiceImpl implements BudgetService {
    private static final Logger LOGGER = LoggerFactory.getLogger(BudgetServiceImpl.class);

    private final BudgetRepository budgetRepository;
    private final UserLookupService userLookupService;
    private final CategoryLookupService categoryLookupService;
    private final ApplicationEventPublisher eventPublisher;
    private final MovementQueryService movementQueryService;
    private final RlsContext rlsContext;
    private final BudgetSettlementService budgetSettlementService;
    private final AdvancedBudgetAccessService advancedBudgetAccessService;
    private final BudgetCalculationService budgetCalculationService;
    private final FinancialConcurrencyGuard concurrencyGuard;

    public BudgetServiceImpl(BudgetRepository budgetRepository,
                             UserLookupService userLookupService,
                             CategoryLookupService categoryLookupService,
                             ApplicationEventPublisher eventPublisher,
                             MovementQueryService movementQueryService,
                             RlsContext rlsContext,
                             BudgetSettlementService budgetSettlementService,
                             AdvancedBudgetAccessService advancedBudgetAccessService,
                             BudgetCalculationService budgetCalculationService,
                             FinancialConcurrencyGuard concurrencyGuard) {
        this.budgetRepository = budgetRepository;
        this.userLookupService = userLookupService;
        this.categoryLookupService = categoryLookupService;
        this.eventPublisher = eventPublisher;
        this.movementQueryService = movementQueryService;
        this.rlsContext = rlsContext;
        this.budgetSettlementService = budgetSettlementService;
        this.advancedBudgetAccessService = advancedBudgetAccessService;
        this.budgetCalculationService = budgetCalculationService;
        this.concurrencyGuard = concurrencyGuard;
    }

    @Override
    @Transactional
    public BudgetResponse create(Long userId, BudgetRequest request) {
        concurrencyGuard.lock(userId);
        rlsContext.setUserId(userId);
        if (Boolean.TRUE.equals(request.isIndependent())
                || (request.subBudgetsToAdopt() != null && !request.subBudgetsToAdopt().isEmpty())) {
            advancedBudgetAccessService.requireEnabledForUser(userId);
        }
        BudgetPolicy.validateSavings(request.totalAmount(), request.savingsType(), request.savingsValue());
        User user = userLookupService.requireUser(userId);

        BudgetPolicy.Period period = BudgetPolicy.resolvePeriod(
                request.isFixed(),
                Boolean.TRUE.equals(request.retroactiveCatchUp()),
                request.startDate(),
                request.endDate());
        LocalDate finalStartDate = period.startDate();
        LocalDate finalEndDate = period.endDate();

        boolean isGlobalRequest = request.categoryId() == null;
        if (isGlobalRequest && (request.name() == null || request.name().isBlank())) {
            throw new IllegalArgumentException("A global budget requires a name");
        }
        if (isGlobalRequest && (Boolean.TRUE.equals(request.isIndependent()) || request.parentBudgetId() != null)) {
            throw new IllegalArgumentException("A global budget cannot be independent or have a parent");
        }
        if (!isGlobalRequest && Boolean.TRUE.equals(request.isIndependent()) && request.parentBudgetId() != null) {
            throw new IllegalArgumentException("An independent category budget cannot have a parent");
        }

        // BR-1.1: Solo puede existir un Presupuesto Global activo a la vez
        if (isGlobalRequest) {
            boolean hasActiveGlobal = budgetRepository.findByUserIdAndStatus(userId, BudgetStatus.ACTIVE)
                    .stream().anyMatch(b -> b.getCategory() == null);
            if (hasActiveGlobal) {
                throw new BusinessConflictException(
                        "BUDGET_GLOBAL_ALREADY_ACTIVE",
                        "An active global budget already exists.");
            }
        }

        Budget budget = new Budget();
        budget.setName(request.name());
        budget.setTotalAmount(request.totalAmount());
        budget.setFixed(request.isFixed());
        budget.setStartDate(finalStartDate);
        budget.setEndDate(finalEndDate);
        budget.setSavingsType(request.savingsType());
        budget.setSavingsValue(request.savingsValue());
        budget.setUser(user);
        budget.setStatus(BudgetStatus.ACTIVE);
        budget.setAccountingStartAt(isGlobalRequest
                ? accountingStart(userId, finalStartDate, finalEndDate) : finalStartDate.atStartOfDay());

        // BR-3.2 Inicialización Desfasada / Catch-up
        BigDecimal initialSpent = BigDecimal.ZERO;
        if (Boolean.TRUE.equals(request.retroactiveCatchUp())) {
            LocalDateTime startDateTime = finalStartDate.atStartOfDay();
            LocalDateTime endDateTime = finalEndDate != null ? finalEndDate.atTime(23, 59, 59) : LocalDateTime.now();
            
            if (isGlobalRequest) {
                initialSpent = movementQueryService.sumByType(
                        userId, MovementType.EXPENSE, startDateTime, endDateTime);
            } else {
                initialSpent = movementQueryService.sumExpensesByCategory(
                        userId, request.categoryId(), startDateTime, endDateTime);
            }
        }
        budget.setSpentAmount(initialSpent);

        if (!isGlobalRequest) {
            Category category = categoryLookupService.requireOwnedCategory(userId, request.categoryId());
            validateCategoryAvailable(userId, request.categoryId(), null);
            budget.setCategory(category);
            budget.setName(category.getName());
            
            if (!Boolean.TRUE.equals(request.isIndependent())) {
                Budget parentToLink = budgetRepository.findByUserIdAndStatus(userId, BudgetStatus.ACTIVE).stream()
                        .filter(b -> b.getCategory() == null)
                        .findFirst()
                        .orElse(null);

                if (request.parentBudgetId() != null
                        && (parentToLink == null || !request.parentBudgetId().equals(parentToLink.getId()))) {
                    throw new BusinessConflictException(
                            "BUDGET_PARENT_STALE",
                            "The global budget changed before the category budget was created.");
                }

                if (parentToLink != null) {
                    // BR-2.1: Herencia de Tiempo
                    budget.setFixed(parentToLink.isFixed());
                    budget.setStartDate(parentToLink.getStartDate());
                    budget.setEndDate(parentToLink.getEndDate());
                    budget.setParentBudget(parentToLink);
                    budget.setAccountingStartAt(parentToLink.movementStart());

                    // BR-3.1: Límite Matemático en Creación
                    BigDecimal assignableLimit = calculateAssignableLimit(parentToLink);
                    BigDecimal sumSiblings = parentToLink.getSubBudgets().stream()
                            .filter(b -> b.getStatus() == BudgetStatus.ACTIVE)
                            .map(Budget::getTotalAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    if (sumSiblings.add(budget.getTotalAmount()).compareTo(assignableLimit) > 0) {
                        throw new BusinessConflictException(
                                "BUDGET_INSUFFICIENT_CAPACITY",
                                "The category budget exceeds the global budget capacity.");
                    }
                } else {
                    throw new BusinessConflictException(
                            "BUDGET_GLOBAL_NOT_ACTIVE",
                            "A linked category budget requires an active global budget.");
                }
            }

            // BR-3.2: Asimilar gastos de la categoría desde el startDate del ciclo activo del presupuesto, solo si es retroactivo
            LocalDate effectiveStart = budget.getStartDate() != null ? budget.getStartDate() : finalStartDate;
            LocalDate effectiveEnd = budget.getEndDate() != null ? budget.getEndDate() : finalEndDate;

            if (effectiveStart != null && Boolean.TRUE.equals(request.retroactiveCatchUp())) {
                LocalDateTime startDateTime = effectiveStart.atStartOfDay();
                LocalDateTime endDateTime = effectiveEnd != null ? effectiveEnd.atTime(23, 59, 59) : LocalDateTime.now();
                BigDecimal categorySpent = movementQueryService.sumExpensesByCategory(
                        userId, request.categoryId(), startDateTime, endDateTime);
                budget.setSpentAmount(categorySpent);
            }
        } else {
            // BR-2.3: Conflicto de Adopción (Merging selectivo)
            List<Budget> allIndependentBudgets = budgetRepository.findByUserIdAndStatus(userId, BudgetStatus.ACTIVE)
                    .stream()
                    .filter(b -> b.getCategory() != null && b.getParentBudget() == null)
                    .toList();
            
            List<Budget> independentBudgets;
            if (request.subBudgetsToAdopt() != null && !request.subBudgetsToAdopt().isEmpty()) {
                if (new HashSet<>(request.subBudgetsToAdopt()).size() != request.subBudgetsToAdopt().size()) {
                    throw new BusinessConflictException(
                            "BUDGET_ADOPTION_DUPLICATE_IDS",
                            "The adoption list contains duplicate budget identifiers.");
                }
                independentBudgets = allIndependentBudgets.stream()
                        .filter(b -> request.subBudgetsToAdopt().contains(b.getId()))
                        .toList();
                if (independentBudgets.size() != request.subBudgetsToAdopt().size()) {
                    throw new BusinessConflictException(
                            "BUDGET_ADOPTION_STALE",
                            "One or more budgets selected for adoption are no longer available.");
                }
            } else {
                // Si la request no pasa adopción explícita, no adoptar ninguno.
                // En modo normal, el front podría pasar todos o ninguno si no hay independientes.
                independentBudgets = new java.util.ArrayList<>();
            }

            BigDecimal assignableLimit = calculateAssignableLimit(budget);
            BigDecimal sumIndep = independentBudgets.stream()
                    .map(Budget::getTotalAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (sumIndep.compareTo(assignableLimit) > 0) {
                throw new BusinessConflictException(
                        "BUDGET_INSUFFICIENT_CAPACITY",
                        "The selected independent budgets exceed the new global budget capacity.");
            }

            // Save the parent budget FIRST to get a DB ID before children reference it
            budget = budgetRepository.save(budget);

            LocalDateTime startDateTime = budget.getStartDate() != null ? budget.getStartDate().atStartOfDay() : LocalDateTime.now();
            LocalDateTime endDateTime   = budget.getEndDate()   != null ? budget.getEndDate().atTime(23, 59, 59) : LocalDateTime.now();

            // BR-3.2 + BR-2.3: Adopt each independent sub-budget
            for (Budget indep : independentBudgets) {
                indep.setParentBudget(budget);
                indep.setFixed(budget.isFixed());
                indep.setStartDate(budget.getStartDate());
                indep.setEndDate(budget.getEndDate());
                indep.setAccountingStartAt(budget.movementStart());

                if (Boolean.TRUE.equals(request.retroactiveCatchUp())) {
                    BigDecimal indepSpent = movementQueryService.sumExpensesByCategory(
                        userId, indep.getCategory().getId(), startDateTime, endDateTime);
                    indep.setSpentAmount(indepSpent != null ? indepSpent : BigDecimal.ZERO);
                }
                // If "FROM_TODAY": keep the child's current spentAmount as-is (starts from now)
            }
            budgetRepository.saveAll(independentBudgets);

            // The Global's initialSpent was already computed at the top of this method:
            //   - retroactiveCatchUp=true  → sumAmountByUserIdAndTypeAndDateBetween (all user expenses in range)
            //   - retroactiveCatchUp=false → BigDecimal.ZERO
            // That value is correct for the Global; no further adjustment needed.
            budget.setSubBudgets(new java.util.ArrayList<>(independentBudgets));
        }

        Budget saved = budgetRepository.save(budget);
        LOGGER.info("budget_created userId={} budgetId={} scope={}",
                userId, saved.getId(), budgetCalculationService.scopeOf(saved));
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BudgetResponse> getAllByUser(Long userId) {
        rlsContext.setUserId(userId);
        return budgetRepository.findByUserIdAndStatus(userId, BudgetStatus.ACTIVE)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<BudgetResponse> getHistoryByUser(Long userId) {
        rlsContext.setUserId(userId);
        return budgetRepository.findByUserIdAndStatus(userId, BudgetStatus.CLOSED)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BudgetResponse getById(Long userId, Long budgetId) {
        rlsContext.setUserId(userId);
        Budget budget = findBudgetAndValidateOwner(userId, budgetId);
        return toResponse(budget);
    }

    @Override
    @Transactional
    public BudgetResponse update(Long userId, Long budgetId, BudgetRequest request) {
        concurrencyGuard.lock(userId);
        rlsContext.setUserId(userId);
        BudgetPolicy.validateSavings(request.totalAmount(), request.savingsType(), request.savingsValue());
        Budget budget = findBudgetAndValidateOwner(userId, budgetId);

        // BR-5.4: Inmutabilidad del Historial
        if (budget.getStatus() == BudgetStatus.CLOSED) {
            throw new BusinessConflictException(
                    "BUDGET_CLOSED",
                    "Closed budgets cannot be modified.");
        }

        if (!request.isFixed() && (request.startDate() == null || request.endDate() == null)) {
            throw new IllegalArgumentException("Un presupuesto con fechas requiere startDate y endDate");
        }

        // BR-4.3: Bloqueo de Modalidad
        if (budget.isFixed() != request.isFixed()) {
            throw new BusinessConflictException(
                    "BUDGET_MODE_CHANGE_NOT_ALLOWED",
                    "An active budget cannot change its recurrence mode.");
        }

        boolean isGlobal = budget.getCategory() == null;
        if (isGlobal && (request.name() == null || request.name().isBlank())) {
            throw new IllegalArgumentException("A global budget requires a name");
        }
        if (isGlobal != (request.categoryId() == null)) {
            throw new BusinessConflictException(
                    "BUDGET_SCOPE_CHANGE_NOT_ALLOWED",
                    "An active budget cannot change its scope.");
        }
        if (!isGlobal) {
            validateCategoryAvailable(userId, request.categoryId(), budgetId);
        }
        if (request.startDate() == null || request.endDate() == null
                || request.endDate().isBefore(request.startDate())) {
            throw new IllegalArgumentException("El periodo del presupuesto no es valido.");
        }
        if (budget.getParentBudget() != null
                && (!request.startDate().equals(budget.getParentBudget().getStartDate())
                    || !request.endDate().equals(budget.getParentBudget().getEndDate()))) {
            throw new BusinessConflictException(
                    "BUDGET_LINKED_PERIOD_MISMATCH",
                    "A linked budget must keep the global budget period.");
        }

        // BR-3.1 & BR-4.2: Límite Matemático y Reducción de Montos
        if (isGlobal) {
            BigDecimal assignableLimit = BudgetPolicy.assignableLimit(request.totalAmount(),
                    request.savingsType(), request.savingsValue(), budget.getSavingsPoolContribution());
            BigDecimal sumSubBudgets = budget.getSubBudgets().stream()
                    .filter(b -> b.getStatus() == BudgetStatus.ACTIVE)
                    .map(Budget::getTotalAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (assignableLimit.compareTo(sumSubBudgets) < 0) {
                throw new BusinessConflictException(
                        "BUDGET_INSUFFICIENT_CAPACITY",
                        "The new global limit is below its linked allocation.");
            }
        } else {
            if (budget.getParentBudget() != null) {
                Budget parent = budget.getParentBudget();
                BigDecimal assignableLimit = calculateAssignableLimit(parent);
                BigDecimal sumSiblings = parent.getSubBudgets().stream()
                        .filter(b -> b.getStatus() == BudgetStatus.ACTIVE && !b.getId().equals(budgetId))
                        .map(Budget::getTotalAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                if (sumSiblings.add(request.totalAmount()).compareTo(assignableLimit) > 0) {
                    throw new BusinessConflictException(
                            "BUDGET_INSUFFICIENT_CAPACITY",
                            "The new category limit exceeds the global budget capacity.");
                }
            }
        }

        budget.setName(request.name());
        budget.setTotalAmount(request.totalAmount());
        budget.setSavingsType(request.savingsType());
        budget.setSavingsValue(request.savingsValue());

        // BR-4.4: Edición de Fechas Recurrentes
        if (budget.isFixed()) {
            if (request.startDate() != null && !request.startDate().equals(budget.getStartDate())) {
                budget.setNextStartDate(request.startDate());
            }
        } else {
            LocalDateTime newStart = isGlobal
                    ? accountingStart(userId, request.startDate(), request.endDate())
                    : budget.getParentBudget() != null ? budget.getParentBudget().movementStart()
                    : request.startDate().atStartOfDay();
            budget.setStartDate(request.startDate());
            budget.setEndDate(request.endDate());
            budget.setAccountingStartAt(newStart);
            if (isGlobal && budget.getSubBudgets() != null) {
                for (Budget child : budget.getSubBudgets()) {
                    if (child.getStatus() == BudgetStatus.ACTIVE) {
                        child.setStartDate(request.startDate());
                        child.setEndDate(request.endDate());
                        child.setAccountingStartAt(newStart);
                    }
                }
            }
        }

        if (request.categoryId() != null) {
            Category category = categoryLookupService.requireOwnedCategory(userId, request.categoryId());
            budget.setCategory(category);
            budget.setName(category.getName());
        } else {
            budget.setCategory(null);
        }

        return toResponse(budgetRepository.save(budget));
    }

    @Override
    @Transactional
    public void delete(Long userId, Long budgetId, boolean cascade) {
        concurrencyGuard.lock(userId);
        rlsContext.setUserId(userId);
        Budget budget = findBudgetAndValidateOwner(userId, budgetId);
        
        // BR-7.2: Orfandad por Eliminación Global
        if (budget.getCategory() == null) {
            List<Budget> children = budgetRepository.findByParentBudgetId(budget.getId());
            if (!children.isEmpty()) {
                if (cascade) {
                    for (Budget child : children) {
                        publishBudgetLinkRemoval(child);
                        budgetRepository.delete(child);
                    }
                } else {
                    if (children.stream().anyMatch(child -> child.getStatus() == BudgetStatus.ACTIVE)) {
                        advancedBudgetAccessService.requireEnabledForUser(userId);
                    }
                    for (Budget child : children) {
                        child.setParentBudget(null);
                        child.setFixed(budget.isFixed());
                        child.setStartDate(budget.getStartDate());
                        child.setEndDate(budget.getEndDate());
                    }
                    budgetRepository.saveAllAndFlush(children);
                }
            }
        }

        publishBudgetLinkRemoval(budget);
        budgetRepository.delete(budget);
        LOGGER.info("budget_deleted userId={} budgetId={} cascade={}", userId, budgetId, cascade);
    }
    
    @Override
    @Transactional
    public BudgetResponse closeBudget(Long userId, Long budgetId) {
        concurrencyGuard.lock(userId);
        rlsContext.setUserId(userId);
        Budget budget = findBudgetAndValidateOwner(userId, budgetId);
        if (budget.getStatus() == BudgetStatus.CLOSED) {
            throw new BusinessConflictException("BUDGET_CLOSED", "The budget is already closed.");
        }
        
        LocalDate today = LocalDate.now();
        if (budget.getStartDate() != null && budget.getStartDate().isAfter(today)) {
            throw new BusinessConflictException(
                    "BUDGET_NOT_STARTED",
                    "A budget cannot be closed before its start date.");
        }
        LocalDate closingDate = budget.getEndDate() != null && budget.getEndDate().isBefore(today)
                ? budget.getEndDate() : today;
        budget.setStatus(BudgetStatus.CLOSED);
        budget.setEndDate(closingDate);
        LocalDateTime closingTime = closingDate.isBefore(today)
                ? closingDate.atTime(java.time.LocalTime.of(23, 59, 59, 999_999_000))
                : LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        budget.setClosedAt(closingTime);
        
        // BR-5.3 Cascade closing
        if (budget.getSubBudgets() != null && !budget.getSubBudgets().isEmpty()) {
            for (Budget child : budget.getSubBudgets()) {
                if (child.getStatus() == BudgetStatus.ACTIVE) {
                    child.setStatus(BudgetStatus.CLOSED);
                    child.setEndDate(closingDate);
                    child.setClosedAt(closingTime);
                    budgetRepository.save(child);
                }
            }
        }
        
        Budget closedBudget = budgetRepository.save(budget);
        budgetSettlementService.publishSettlement(closedBudget, closingDate);
        LOGGER.info("budget_closed userId={} budgetId={} closingDate={}",
                userId, budgetId, closingDate);
        return toResponse(closedBudget);
    }

    @Override
    @Transactional
    public void addExpense(Long userId, Long categoryId, BigDecimal amount) {
        concurrencyGuard.lock(userId);
        rlsContext.setUserId(userId);
        Optional<Budget> budgetOpt = Optional.empty();

        if (categoryId != null) {
            budgetOpt = budgetRepository.findByUserIdAndCategoryIdAndStatus(userId, categoryId, BudgetStatus.ACTIVE);
        }

        if (budgetOpt.isEmpty()) {
            budgetOpt = budgetRepository.findByUserIdAndStatus(userId, BudgetStatus.ACTIVE)
                    .stream()
                    .filter(b -> b.getCategory() == null)
                    .findFirst();
        }

        budgetOpt.ifPresent(budget -> {
            budget.setSpentAmount(budget.getSpentAmount().add(amount));
            budgetRepository.save(budget);
            
            if (budget.getParentBudget() != null && budget.getParentBudget().getStatus() == BudgetStatus.ACTIVE) {
                Budget parent = budget.getParentBudget();
                parent.setSpentAmount(parent.getSpentAmount().add(amount));
                budgetRepository.save(parent);
            }
        });
    }


    private void validateCategoryAvailable(Long userId, Long categoryId, Long currentBudgetId) {
        boolean alreadyAssigned = budgetRepository.findByUserIdAndStatus(userId, BudgetStatus.ACTIVE).stream()
                .anyMatch(other -> other.getCategory() != null
                        && categoryId.equals(other.getCategory().getId())
                        && !other.getId().equals(currentBudgetId));
        if (alreadyAssigned) {
            throw new BusinessConflictException(
                    "BUDGET_CATEGORY_ALREADY_ACTIVE",
                    "An active budget already exists for this category.",
                    Map.of("categoryId", categoryId));
        }
    }

    private Budget findBudgetAndValidateOwner(Long userId, Long budgetId) {
        return budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget"));
    }

    private void publishBudgetLinkRemoval(Budget budget) {
        eventPublisher.publishEvent(new BudgetLinkRemovalRequestedEvent(
                budget.getId(), budget.getStatus() == BudgetStatus.CLOSED, budget.getUser().getId()));
    }

    private LocalDateTime accountingStart(Long userId, LocalDate start, LocalDate end) {
        LocalDateTime boundary = start.atStartOfDay();
        for (Budget closed : budgetRepository.findByUserIdAndStatus(userId, BudgetStatus.CLOSED)) {
            if (closed.getCategory() != null || closed.getStartDate() == null || closed.getEndDate() == null
                    || closed.getEndDate().isBefore(start) || closed.getStartDate().isAfter(end)) continue;
            if (!closed.getEndDate().equals(start) || !closed.movementEnd().toLocalTime()
                    .isBefore(java.time.LocalTime.of(23, 59, 59, 999_999_000))) {
                throw new BusinessConflictException("BUDGET_CLOSED_PERIOD_OVERLAP",
                        "The new period overlaps a closed global budget.");
            }
            LocalDateTime next = closed.movementEnd().plusNanos(1_000);
            if (next.isAfter(boundary)) boundary = next;
        }
        return boundary;
    }

    private BudgetResponse toResponse(Budget budget) {
        BigDecimal total = budget.getTotalAmount();
        BigDecimal spent = budgetCalculationService.spentAmount(budget);
        BigDecimal spendingLimit = budget.getCategory() == null
                ? budgetCalculationService.assignableAmount(budget)
                : total;
        BigDecimal remaining = spendingLimit.subtract(spent).max(BigDecimal.ZERO);

        double progress = 0.0;
        if (spendingLimit.compareTo(BigDecimal.ZERO) > 0) {
            progress = spent.divide(spendingLimit, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .doubleValue();
        } else if (spent.signum() > 0) {
            progress = 100.0;
        }

        boolean overBudget = spent.compareTo(spendingLimit) > 0;

        Category cat = budget.getCategory();
        BudgetScope scope = budgetCalculationService.scopeOf(budget);
        BigDecimal assignableAmount = null;
        BigDecimal allocatedAmount = null;
        BigDecimal unallocatedAmount = null;
        if (scope == BudgetScope.GLOBAL) {
            assignableAmount = spendingLimit;
            allocatedAmount = budgetCalculationService.allocatedAmount(budget);
            unallocatedAmount = assignableAmount.subtract(allocatedAmount).max(BigDecimal.ZERO);
        }
        boolean active = budget.getStatus() == BudgetStatus.ACTIVE;
        boolean hasActiveGlobal = scope == BudgetScope.INDEPENDENT_CATEGORY
                && budgetRepository.findByUserIdAndStatusAndCategoryIsNull(
                        budget.getUser().getId(), BudgetStatus.ACTIVE).isPresent();

        return new BudgetResponse(
                budget.getId(),
                budget.getName(),
                total,
                spent,
                remaining,
                progress,
                budget.isFixed(),
                budget.getStartDate(),
                budget.getEndDate(),
                cat != null ? cat.getId() : null,
                cat != null ? cat.getName() : null,
                cat != null ? cat.getColor() : null,
                cat != null ? cat.getIcon() : null,
                budget.getParentBudget() != null ? budget.getParentBudget().getId() : null,
                scope,
                budget.getStatus() != null ? budget.getStatus().name() : BudgetStatus.ACTIVE.name(),
                budget.getSavingsType(),
                budget.getSavingsValue(),
                budget.getSavingsPoolContribution(),
                assignableAmount,
                allocatedAmount,
                unallocatedAmount,
                active && advancedBudgetAccessService.isEnabled() && hasActiveGlobal,
                active && advancedBudgetAccessService.isEnabled() && scope == BudgetScope.LINKED_CATEGORY,
                active && scope != BudgetScope.LINKED_CATEGORY,
                overBudget,
                budget.getCreatedAt() != null
                        ? budget.getCreatedAt().toInstant()
                                .atZone(java.time.ZoneId.systemDefault())
                                .toLocalDateTime()
                        : null,
                budget.getNextStartDate()
        );
    }

    private BigDecimal calculateAssignableLimit(Budget parentBudget) {
        return budgetCalculationService.assignableAmount(parentBudget);
    }

    private BigDecimal calculateAssignableLimit(BigDecimal totalAmount, SavingsType savingsType, BigDecimal savingsValue) {
        return BudgetPolicy.assignableLimit(totalAmount, savingsType, savingsValue);
    }
}
