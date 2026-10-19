package com.equio.backend.budgets.services;

import com.equio.backend.budgets.dto.responses.BudgetHistoryReportResponse;
import com.equio.backend.budgets.services.BudgetHistoryPdfWriter.Metric;
import com.equio.backend.budgets.services.BudgetHistoryPdfWriter.Tone;
import com.equio.backend.shared.exceptions.ReportGenerationException;
import com.equio.backend.users.services.ProfilePreferencesService;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class BudgetHistoryPdfService {

    private final ProfilePreferencesService profilePreferencesService;

    public BudgetHistoryPdfService(ProfilePreferencesService profilePreferencesService) {
        this.profilePreferencesService = profilePreferencesService;
    }

    public byte[] generate(Long userId, BudgetHistoryReportResponse report) {
        ProfilePreferencesService.Preferences preferences = profilePreferencesService.findPreferences(userId);
        boolean spanish = !"en".equalsIgnoreCase(preferences.language());
        String currency = preferences.currency();
        boolean independent = report.scope() == com.equio.backend.budgets.entities.enums.BudgetScope.INDEPENDENT_CATEGORY;
        String title = independent
                ? (spanish ? "Reporte de presupuesto independiente" : "Independent budget report")
                : (spanish ? "Reporte histórico de presupuesto" : "Budget history report");
        String period = formatDate(report.startDate(), spanish) + " - " + formatDate(report.endDate(), spanish);
        String status = report.successful()
                ? (spanish ? "Cumplido con éxito" : "Completed successfully")
                : (spanish ? "Presupuesto excedido" : "Budget exceeded");
        String statusDetail = report.successful()
                ? (spanish ? "Usaste el " : "You used ") + wholePercent(report.spentPercentage())
                        + (spanish ? " del límite y quedaron " : " of the limit and had ")
                        + money(report.remainingAmount(), currency) + (spanish ? "." : " remaining.")
                : (spanish ? "Superaste el límite por " : "You exceeded the limit by ")
                        + money(report.exceededAmount(), currency) + ".";

        try (BudgetHistoryPdfWriter writer = new BudgetHistoryPdfWriter(title, spanish)) {
            writer.reportHeader(title, period, report.budgetName(), report.generatedAt());
            writer.resultBanner(report.successful(), status, statusDetail);

            writer.section(spanish ? "Resumen del periodo" : "Period overview",
                    spanish ? "Una lectura rápida del resultado general." : "A quick view of overall performance.");
            writer.metricGrid(List.of(
                    new Metric(spanish ? "Gastado" : "Spent", money(report.totalSpent(), currency),
                            money(report.spendingLimit(), currency) + (spanish ? " de límite" : " limit"),
                            report.successful() ? Tone.SUCCESS : Tone.DANGER),
                    new Metric(spanish ? "Disponible" : "Remaining", money(report.remainingAmount(), currency),
                            wholePercent(Math.max(0, 100 - report.spentPercentage())) + (spanish ? " sin consumir" : " unused"), Tone.NEUTRAL),
                    new Metric(spanish ? "Categorías dentro del límite" : "Categories on target",
                            report.categoriesWithinLimit() + " / " + report.categoriesWithLimit(),
                            spanish ? "con límite configurado" : "with configured limits", Tone.NEUTRAL),
                    new Metric(spanish ? "Promedio diario" : "Daily average", money(report.averageDailySpend(), currency),
                            spanish ? "por día del ciclo" : "per day in the cycle", Tone.NEUTRAL),
                    new Metric(spanish ? "Ahorro real" : "Actual savings", money(report.retainedSavings(), currency),
                            percent(report.savingsRate()) + (spanish ? " de ingresos" : " of income"), Tone.SUCCESS),
                    new Metric(spanish ? "Aportes a metas" : "Goal contributions", money(report.goalContributions(), currency),
                            spanish ? "durante el periodo" : "during the period", Tone.NEUTRAL)
            ));

            writer.section(spanish ? "Flujo del periodo" : "Period cash flow",
                    spanish ? "Entradas y salidas registradas durante el ciclo." : "Recorded inflows and outflows during the cycle.");
            writer.metricGrid(List.of(
                    new Metric(spanish ? "Entradas (ingresos)" : "Inflows (income)", money(report.totalIncome(), currency),
                            spanish ? "dinero recibido" : "money received", Tone.SUCCESS),
                    new Metric(spanish ? "Salidas (gastos)" : "Outflows (expenses)", money(report.totalExpenses(), currency),
                            spanish ? "dinero utilizado" : "money spent", Tone.DANGER),
                    new Metric(spanish ? "Balance neto" : "Net balance", signedMoney(report.balance(), currency),
                            spanish ? "ingresos menos gastos" : "income minus expenses",
                            report.balance().signum() >= 0 ? Tone.SUCCESS : Tone.DANGER)
            ));
            writer.callout(spanish
                    ? "Los ingresos forman parte del balance neto, pero no aumentan automáticamente el límite."
                    : "Income contributes to net balance, but does not automatically increase the budget limit.");

            writer.section(spanish ? "Consumo por categoría" : "Category consumption",
                    independent
                            ? (spanish ? "Consumo de la categoría cubierta por este presupuesto." : "Spending in the category covered by this budget.")
                            : (spanish ? "Todas las categorías, incluso las que no tuvieron gastos." : "All categories, including those with no spending."));
            if (report.categories().isEmpty()) {
                writer.emptyState(spanish ? "No hubo consumo por categoría." : "There was no category consumption.");
            } else {
                for (BudgetHistoryReportResponse.CategoryConsumption category : report.categories()) {
                    String limit = category.limitAmount() != null
                            ? " / " + money(category.limitAmount(), currency)
                            : "";
                    writer.categoryRow(localizedCategory(category.categoryName(), spanish),
                            money(category.spentAmount(), currency) + limit,
                            category.percentage(), category.categoryColor(), Boolean.FALSE.equals(category.withinLimit()));
                }
            }

            writer.section(spanish ? "Categorías con mayor gasto" : "Top spending categories",
                    spanish ? "Dónde se concentró la mayor parte del consumo." : "Where most spending was concentrated.");
            if (report.topCategories().isEmpty()) {
                writer.emptyState(spanish ? "No hay categorías para comparar." : "There are no categories to compare.");
            } else {
                int position = 1;
                for (BudgetHistoryReportResponse.CategoryConsumption category : report.topCategories()) {
                    double share = report.totalExpenses().signum() == 0 ? 0
                            : category.spentAmount().divide(report.totalExpenses(), 4, RoundingMode.HALF_UP)
                                    .multiply(BigDecimal.valueOf(100)).doubleValue();
                    writer.rankingRow(position++, localizedCategory(category.categoryName(), spanish),
                            money(category.spentAmount(), currency), percent(share), category.categoryColor());
                }
            }

            writer.section(spanish ? "Ritmo de gasto" : "Spending timeline",
                    spanish ? "Gasto acumulado frente al ritmo ideal del presupuesto." : "Cumulative spending compared with the ideal budget pace.");
            writer.timelineChart(report.timeline(), spanish ? "Gasto real" : "Actual spending",
                    spanish ? "Ritmo ideal" : "Ideal pace", currency, spanish);

            writer.section(spanish ? "Gastos más altos" : "Highest expenses",
                    spanish ? "Los movimientos que más impactaron el periodo." : "The movements with the greatest impact on the period.");
            if (report.highestExpenses().isEmpty()) {
                writer.emptyState(spanish ? "No hubo gastos registrados." : "No expenses were recorded.");
            } else {
                writer.tableHeader(spanish ? "DETALLE" : "DETAIL", spanish ? "CATEGORÍA Y FECHA" : "CATEGORY AND DATE",
                        spanish ? "MONTO" : "AMOUNT");
                int expenseIndex = 0;
                for (BudgetHistoryReportResponse.ExpenseItem expense : report.highestExpenses()) {
                    String category = localizedCategory(expense.categoryName(), spanish);
                    writer.tableRow(descriptionOrFallback(expense.description(), category, spanish),
                            category + " · " + formatDate(expense.date().toLocalDate(), spanish),
                            "-" + money(expense.amount(), currency), expenseIndex++ % 2 == 1, Tone.DANGER);
                }
            }

            writer.section(spanish ? "Hábitos de consumo" : "Spending habits",
                    spanish ? "Señales útiles sobre el comportamiento del periodo." : "Useful signals about behavior during the period.");
            List<Metric> habits = new ArrayList<>();
            habits.add(new Metric(spanish ? "Día con mayor gasto" : "Highest spending day",
                    report.highestSpendingDay() != null ? money(report.highestSpendingDay().amount(), currency) : "-",
                    report.highestSpendingDay() != null ? formatDate(report.highestSpendingDay().date(), spanish)
                            : (spanish ? "Sin gastos" : "No expenses"), Tone.DANGER));
            habits.add(new Metric(spanish ? "Día más costoso" : "Most expensive weekday",
                    report.mostExpensiveWeekday() != null ? localizedWeekday(report.mostExpensiveWeekday().dayOfWeek(), spanish) : "-",
                    report.mostExpensiveWeekday() != null ? money(report.mostExpensiveWeekday().amount(), currency)
                            : (spanish ? "Sin gastos" : "No expenses"), Tone.NEUTRAL));
            habits.add(new Metric(spanish ? "Peso del fin de semana" : "Weekend share",
                    percent(report.weekendExpensePercentage()), spanish ? "del gasto total" : "of total spending", Tone.NEUTRAL));
            writer.metricGrid(habits);

            writer.section(spanish ? "Ahorro y metas" : "Savings and goals",
                    spanish ? "Reserva planificada y aportaciones realizadas." : "Planned reserves and completed contributions.");
            writer.metricGrid(List.of(
                    new Metric(spanish ? "Ahorro configurado" : "Configured savings", money(report.configuredSavings(), currency),
                            spanish ? "reserva prevista" : "planned reserve", Tone.NEUTRAL),
                    new Metric(spanish ? "Aportes a metas" : "Goal contributions", money(report.goalContributions(), currency),
                            report.goalContributionDetails().size() + (spanish ? " metas con aportes" : " goals with contributions"), Tone.SUCCESS)
            ));
            if (report.goalContributionDetails().isEmpty()) {
                writer.emptyState(spanish ? "No hubo aportaciones en este periodo." : "There were no contributions in this period.");
            } else {
                for (BudgetHistoryReportResponse.GoalContribution contribution : report.goalContributionDetails()) {
                    writer.simpleRow(contribution.goalName(), money(contribution.amount(), currency), Tone.SUCCESS);
                }
            }

            writer.section(spanish ? "Comparación con el periodo anterior" : "Previous period comparison",
                    spanish ? "Cómo cambió el comportamiento frente al ciclo previo." : "How behavior changed compared with the prior cycle.");
            if (report.comparison() == null) {
                writer.emptyState(spanish ? "Aún no existe un periodo anterior comparable." : "There is no comparable previous period yet.");
            } else {
                BudgetHistoryReportResponse.PeriodComparison comparison = report.comparison();
                Double change = comparison.expenseChangePercentage();
                writer.metricGrid(List.of(
                        new Metric(spanish ? "Variación de gastos" : "Expense change",
                                change != null ? signedPercent(change) : (spanish ? "Sin base" : "No baseline"),
                                formatDate(comparison.previousStartDate(), spanish) + " - " + formatDate(comparison.previousEndDate(), spanish),
                                change != null && change <= 0 ? Tone.SUCCESS : Tone.DANGER),
                        new Metric(spanish ? "Mayor reducción" : "Greatest reduction",
                                comparison.greatestReduction() != null ? money(comparison.greatestReduction().amount(), currency) : "-",
                                comparison.greatestReduction() != null ? localizedCategory(comparison.greatestReduction().categoryName(), spanish)
                                        : (spanish ? "Sin reducción" : "No reduction"), Tone.SUCCESS),
                        new Metric(spanish ? "Mayor incremento" : "Greatest increase",
                                comparison.greatestIncrease() != null ? money(comparison.greatestIncrease().amount(), currency) : "-",
                                comparison.greatestIncrease() != null ? localizedCategory(comparison.greatestIncrease().categoryName(), spanish)
                                        : (spanish ? "Sin incremento" : "No increase"), Tone.DANGER)
                ));
            }

            writer.section(spanish ? "Todos los movimientos" : "All movements",
                    report.movements().size() + (spanish ? " movimientos agrupados por fecha." : " movements grouped by date."));
            if (report.movements().isEmpty()) {
                writer.emptyState(spanish ? "No hubo movimientos registrados." : "No movements were recorded.");
            } else {
                LocalDate currentDate = null;
                int movementIndex = 0;
                for (BudgetHistoryReportResponse.MovementItem movement : report.movements()) {
                    LocalDate movementDate = movement.date().toLocalDate();
                    if (!movementDate.equals(currentDate)) {
                        currentDate = movementDate;
                        movementIndex = 0;
                        writer.dateDivider(formatDate(currentDate, spanish));
                    }
                    boolean income = "INCOME".equals(movement.type());
                    String category = localizedCategory(movement.categoryName(), spanish);
                    writer.movementRow(descriptionOrFallback(movement.description(), category, spanish),
                            category + " · " + formatTime(movement.date(), spanish),
                            (income ? "+" : "-") + money(movement.amount(), currency),
                            movementIndex++ % 2 == 1, income ? Tone.SUCCESS : Tone.DANGER, movement.categoryColor());
                }
            }

            return writer.toByteArray();
        } catch (IOException | RuntimeException exception) {
            throw new ReportGenerationException(exception);
        }
    }

    private String localizedCategory(String name, boolean spanish) {
        return "Uncategorized".equals(name) && spanish ? "Sin categoría" : name;
    }

    private String localizedWeekday(String weekday, boolean spanish) {
        try {
            Locale locale = spanish ? Locale.forLanguageTag("es-PE") : Locale.US;
            return java.time.DayOfWeek.valueOf(weekday).getDisplayName(java.time.format.TextStyle.FULL, locale);
        } catch (IllegalArgumentException exception) {
            return weekday;
        }
    }

    private String descriptionOrFallback(String description, String category, boolean spanish) {
        if (description != null && !description.isBlank()) return description;
        return spanish ? "Movimiento de " + category : category + " movement";
    }

    private String formatDate(LocalDate date, boolean spanish) {
        if (date == null) return "-";
        Locale locale = spanish ? Locale.forLanguageTag("es-PE") : Locale.US;
        return date.format(DateTimeFormatter.ofPattern(spanish ? "dd MMM yyyy" : "MMM dd, yyyy", locale));
    }

    private String formatTime(LocalDateTime date, boolean spanish) {
        if (date == null) return "-";
        return date.format(DateTimeFormatter.ofPattern(spanish ? "HH:mm" : "h:mm a", Locale.US));
    }

    private String money(BigDecimal amount, String currency) {
        BigDecimal safeAmount = amount != null ? amount : BigDecimal.ZERO;
        String safeCurrency = currency != null ? currency.toUpperCase(Locale.ROOT) : "PEN";
        String symbol = switch (safeCurrency) {
            case "PEN" -> "S/";
            case "USD" -> "$";
            case "EUR" -> "EUR";
            default -> safeCurrency;
        };
        return symbol + " " + String.format(Locale.US, "%,.2f", safeAmount);
    }

    private String signedMoney(BigDecimal amount, String currency) {
        BigDecimal safeAmount = amount != null ? amount : BigDecimal.ZERO;
        return (safeAmount.signum() >= 0 ? "+" : "-") + money(safeAmount.abs(), currency);
    }

    private String percent(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).toPlainString() + "%";
    }

    private String signedPercent(double value) {
        return (value > 0 ? "+" : "") + percent(value);
    }

    private String wholePercent(double value) {
        return BigDecimal.valueOf(value).setScale(0, RoundingMode.HALF_UP).toPlainString() + "%";
    }

}
