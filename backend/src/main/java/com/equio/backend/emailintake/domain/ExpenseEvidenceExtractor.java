package com.equio.backend.emailintake.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.HashSet;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

public final class ExpenseEvidenceExtractor {
    private static final String CURRENCY = "S/|PEN|USD|EUR|MXN|COP";
    private static final String AMOUNT = "[0-9]{1,10}(?:[.,][0-9]{1,2})?";
    private static final Pattern MONEY = Pattern.compile("(?i)(?<![\\w.,+/-])(?:"
            + "(" + CURRENCY + ")[ \\t]*(" + AMOUNT + ")"
            + "|(" + AMOUNT + ")[ \\t]*(" + CURRENCY + "))(?![\\w/]|[.,][0-9])");
    private static final Pattern DATE = Pattern.compile("(?<![\\w+-])(?:([0-9]{2}/[0-9]{2}/[0-9]{4})[, \\t]+"
            + "|([0-9]{4}-[0-9]{2}-[0-9]{2})[T \\t])([0-9]{2}:[0-9]{2})(?![\\w:+-])");
    private static final DateTimeFormatter DMY = DateTimeFormatter.ofPattern("dd/MM/uuuu HH:mm", Locale.ROOT)
            .withResolverStyle(ResolverStyle.STRICT);
    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm", Locale.ROOT)
            .withResolverStyle(ResolverStyle.STRICT);

    public record Evidence(BigDecimal amount, String currency, LocalDateTime occurredAt) {}
    private record Money(BigDecimal amount, String currency) {}

    public Optional<Evidence> extract(String plainText) {
        if (plainText == null || plainText.length() > EmailTextTriage.MAX_TEXT_LENGTH) {
            return Optional.empty();
        }
        var amounts = new HashSet<Money>();
        var money = MONEY.matcher(plainText.replace('\u00a0', ' '));
        while (money.find()) {
            String currency = (money.group(1) != null ? money.group(1) : money.group(4)).toUpperCase(Locale.ROOT);
            String digits = money.group(2) != null ? money.group(2) : money.group(3);
            var amount = new BigDecimal(digits.replace(',', '.')).setScale(2);
            if (amount.signum() <= 0) {
                return Optional.empty();
            }
            amounts.add(new Money(amount, "S/".equals(currency) ? "PEN" : currency));
        }

        var dates = new HashSet<LocalDateTime>();
        var date = DATE.matcher(plainText);
        while (date.find()) {
            boolean localFormat = date.group(1) != null;
            try {
                dates.add(LocalDateTime.parse((localFormat ? date.group(1) : date.group(2)) + " " + date.group(3),
                        localFormat ? DMY : ISO));
            } catch (DateTimeParseException ex) {
                return Optional.empty();
            }
        }
        if (amounts.size() != 1 || dates.size() != 1) {
            return Optional.empty();
        }
        var value = amounts.iterator().next();
        return Optional.of(new Evidence(value.amount(), value.currency(), dates.iterator().next()));
    }
}
