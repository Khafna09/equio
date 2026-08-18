package com.equio.backend.budgets.services;

import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.budgets.dto.requests.BudgetRequest;
import com.equio.backend.budgets.dto.responses.BudgetResponse;
import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class BudgetServiceImpl implements BudgetService {

    private final BudgetRepository budgetRepository;
    private final UserLookupService userLookupService;
    private final CategoryLookupService categoryLookupService;
    private final ApplicationEventPublisher eventPublisher;
    private final MovementQueryService movementQueryService;
    private final RlsContext rlsContext;

    public BudgetServiceImpl(BudgetRepository budgetRepository,
                             UserLookupService userLookupService,
                             CategoryLookupService categoryLookupService,
                             ApplicationEventPublisher eventPublisher,
                             MovementQueryService movementQueryService,
                             RlsContext rlsContext) {
        this.budgetRepository = budgetRepository;
        this.userLookupService = userLookupService;
        this.categoryLookupService = categoryLookupService;
        this.eventPublisher = eventPublisher;
        this.movementQueryService = movementQueryService;
        this.rlsContext = rlsContext;
    }

    @Override
    @Transactional
    public BudgetResponse create(Long userId, BudgetRequest request) {
        rlsContext.setUserId(userId);
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

        // BR-1.1: Solo puede existir un Presupuesto Global activo a la vez
        if (isGlobalRequest) {
            boolean hasActiveGlobal = budgetRepository.findByUserIdAndStatus(userId, BudgetStatus.ACTIVE)
                    .stream().anyMatch(b -> b.getCategory() == null);
            if (hasActiveGlobal) {
                throw new BusinessConflictException(
                        "Ya existe un presupuesto global activo para este usuario.");
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
            budget.setCategory(category);
            
            if (!Boolean.TRUE.equals(request.isIndependent())) {
                Budget parentToLink = budgetRepository.findByUserIdAndStatus(userId, BudgetStatus.ACTIVE).stream()
                        .filter(b -> b.getCategory() == null)
                        .findFirst()
                        .orElse(null);

                if (parentToLink != null) {
                    // BR-2.1: Herencia de Tiempo
                    budget.setFixed(parentToLink.isFixed());
                    budget.setStartDate(parentToLink.getStartDate());
                    budget.setEndDate(parentToLink.getEndDate());
                    budget.setParentBudget(parentToLink);

                    // BR-3.1: Límite Matemático en Creación
                    BigDecimal assignableLimit = calculateAssignableLimit(parentToLink);
                    BigDecimal sumSiblings = parentToLink.getSubBudgets().stream()
                            .filter(b -> b.getStatus() == BudgetStatus.ACTIVE)
                            .map(Budget::getTotalAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    if (sumSiblings.add(budget.getTotalAmount()).compareTo(assignableLimit) > 0) {
                        throw new IllegalArgumentException("La suma de los sub-presupuestos (" + sumSiblings.add(budget.getTotalAmount()) + ") excede el límite asignable del padre global (" + assignableLimit + ") considerando la meta de ahorro.");
                    }
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
                independentBudgets = allIndependentBudgets.stream()
                        .filter(b -> request.subBudgetsToAdopt().contains(b.getId()))
                        .toList();
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
                throw new IllegalArgumentException("La suma de los presupuestos independientes a vincular (" + sumIndep + ") excede el límite asignable del nuevo presupuesto global (" + assignableLimit + ") considerando la meta de ahorro.");
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

        return toResponse(budgetRepository.save(budget));
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
        rlsContext.setUserId(userId);
        BudgetPolicy.validateSavings(request.totalAmount(), request.savingsType(), request.savingsValue());
        Budget budget = findBudgetAndValidateOwner(userId, budgetId);

        // BR-5.4: Inmutabilidad del Historial
        if (budget.getStatus() == BudgetStatus.CLOSED) {
            throw new BusinessConflictException(
                    "No se permite modificar un presupuesto cerrado (historial).");
        }

        if (!request.isFixed() && (request.startDate() == null || request.endDate() == null)) {
            throw new IllegalArgumentException("Un presupuesto con fechas requiere startDate y endDate");
        }

        // BR-4.3: Bloqueo de Modalidad
        if (budget.isFixed() != request.isFixed()) {
            throw new BusinessConflictException(
                    "No se permite cambiar la modalidad de un presupuesto activo. Debe cerrar el actual y crear uno nuevo.");
        }

        boolean isGlobal = budget.getCategory() == null;

        // BR-3.1 & BR-4.2: Límite Matemático y Reducción de Montos
        if (isGlobal) {
            BigDecimal assignableLimit = calculateAssignableLimit(request.totalAmount(), request.savingsType(), request.savingsValue());
            BigDecimal sumSubBudgets = budget.getSubBudgets().stream()
                    .filter(b -> b.getStatus() == BudgetStatus.ACTIVE)
                    .map(Budget::getTotalAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (assignableLimit.compareTo(sumSubBudgets) < 0) {
                throw new IllegalArgumentException("El nuevo límite asignable del presupuesto global (" + assignableLimit + ") tras considerar la meta de ahorro no puede ser menor a la suma de sus sub-presupuestos (" + sumSubBudgets + ")");
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
                    throw new IllegalArgumentException("La suma de los sub-presupuestos (" + sumSiblings.add(request.totalAmount()) + ") excedería el límite asignable del padre global (" + assignableLimit + ") considerando la meta de ahorro.");
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
            budget.setStartDate(request.startDate());
            budget.setEndDate(request.endDate());
            if (isGlobal && budget.getSubBudgets() != null) {
                for (Budget child : budget.getSubBudgets()) {
                    if (child.getStatus() == BudgetStatus.ACTIVE) {
                        child.setStartDate(request.startDate());
                        child.setEndDate(request.endDate());
                    }
                }
            }
        }

        if (request.categoryId() != null) {
            Category category = categoryLookupService.requireOwnedCategory(userId, request.categoryId());
            budget.setCategory(category);
        } else {
            budget.setCategory(null);
        }

        return toResponse(budgetRepository.save(budget));
    }

    @Override
    @Transactional
    public void delete(Long userId, Long budgetId, boolean cascade) {
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
    }
    
    @Override
    @Transactional
    public BudgetResponse closeBudget(Long userId, Long budgetId) {
        rlsContext.setUserId(userId);
        Budget budget = findBudgetAndValidateOwner(userId, budgetId);
        if (budget.getStatus() == BudgetStatus.CLOSED) {
            throw new BusinessConflictException("El presupuesto ya está cerrado.");
        }
        
        budget.setStatus(BudgetStatus.CLOSED);
        budget.setEndDate(LocalDate.now()); // BR-5.2 Cierre forzado sella la fecha
        
        // BR-5.3 Cascade closing
        if (budget.getSubBudgets() != null && !budget.getSubBudgets().isEmpty()) {
            for (Budget child : budget.getSubBudgets()) {
                if (child.getStatus() == BudgetStatus.ACTIVE) {
                    child.setStatus(BudgetStatus.CLOSED);
                    child.setEndDate(LocalDate.now());
                    budgetRepository.save(child);
                }
            }
        }
        
        return toResponse(budgetRepository.save(budget));
    }

    @Override
    @Transactional
    public void addExpense(Long userId, Long categoryId, BigDecimal amount) {
        rlsContext.setUserId(userId);
        Optional<Budget> budgetOpt = Optional.empty();

        if (categoryId != null) {
            budgetOpt = budgetRepository.findByUserIdAndCategoryId(userId, categoryId)
                .filter(b -> b.getStatus() == BudgetStatus.ACTIVE);
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


    private Budget findBudgetAndValidateOwner(Long userId, Long budgetId) {
        return budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget"));
    }

    private void publishBudgetLinkRemoval(Budget budget) {
        eventPublisher.publishEvent(new BudgetLinkRemovalRequestedEvent(
                budget.getId(), budget.getStatus() == BudgetStatus.CLOSED));
    }

    private BudgetResponse toResponse(Budget budget) {
        BigDecimal total = budget.getTotalAmount();
        BigDecimal spent = calculateSpentAmount(budget);
        BigDecimal remaining = total.subtract(spent).max(BigDecimal.ZERO);

        double progress = 0.0;
        if (total.compareTo(BigDecimal.ZERO) > 0) {
            progress = spent.divide(total, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .doubleValue();
        }

        boolean overBudget = spent.compareTo(total) >= 0;

        Category cat = budget.getCategory();

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
                budget.getStatus() != null ? budget.getStatus().name() : BudgetStatus.ACTIVE.name(),
                budget.getSavingsType(),
                budget.getSavingsValue(),
                overBudget,
                budget.getCreatedAt() != null
                        ? budget.getCreatedAt().toInstant()
                                .atZone(java.time.ZoneId.systemDefault())
                                .toLocalDateTime()
                        : null,
                budget.getNextStartDate()
        );
    }

    private BigDecimal calculateSpentAmount(Budget budget) {
        if (budget == null) return BigDecimal.ZERO;

        LocalDate start = budget.getStartDate();
        LocalDate end = budget.getEndDate();

        if (start == null && budget.getParentBudget() != null) {
            start = budget.getParentBudget().getStartDate();
            end = budget.getParentBudget().getEndDate();
        }

        if (start != null && budget.getUser() != null) {
            LocalDateTime startDateTime = start.atStartOfDay();
            LocalDateTime endDateTime = end != null ? end.atTime(23, 59, 59) : LocalDateTime.now();

            if (budget.getCategory() == null) {
                return movementQueryService.sumByType(
                        budget.getUser().getId(), MovementType.EXPENSE, startDateTime, endDateTime);
            } else {
                return movementQueryService.sumExpensesByCategory(
                        budget.getUser().getId(), budget.getCategory().getId(), startDateTime, endDateTime);
            }
        }

        return budget.getSpentAmount() != null ? budget.getSpentAmount() : BigDecimal.ZERO;
    }

    private BigDecimal calculateAssignableLimit(Budget parentBudget) {
        return BudgetPolicy.assignableLimit(
                parentBudget.getTotalAmount(), parentBudget.getSavingsType(), parentBudget.getSavingsValue());
    }

    private BigDecimal calculateAssignableLimit(BigDecimal totalAmount, SavingsType savingsType, BigDecimal savingsValue) {
        return BudgetPolicy.assignableLimit(totalAmount, savingsType, savingsValue);
    }
}
