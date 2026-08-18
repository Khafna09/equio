package com.equio.backend.budgets.services;

import com.equio.backend.budgets.dto.responses.BudgetHistoryReportResponse;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

final class BudgetHistoryPdfWriter implements AutoCloseable {

    enum Tone { NEUTRAL, SUCCESS, DANGER }

    record Metric(String label, String value, String detail, Tone tone) {}

    private static final float MARGIN = 42;
    private static final float BOTTOM_MARGIN = 48;
    private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();
    private static final float CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
    private static final int MAX_LINE_LENGTH = 88;
    private static final String PRIMARY = "#7C3AED";
    private static final String TEXT = "#18181B";
    private static final String MUTED = "#71717A";
    private static final String BORDER = "#E4E4E7";
    private static final String SURFACE = "#FAFAFA";
    private static final String SUCCESS = "#059669";
    private static final String SUCCESS_BG = "#ECFDF5";
    private static final String DANGER = "#E11D48";
    private static final String DANGER_BG = "#FFF1F2";

    private final PDDocument document = new PDDocument();
    private final PDType1Font regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    private final PDType1Font bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
    private final String reportTitle;
    private final boolean spanish;
    private PDPageContentStream content;
    private PDPage page;
    private float y;

    BudgetHistoryPdfWriter(String reportTitle, boolean spanish) throws IOException {
        this.reportTitle = reportTitle;
        this.spanish = spanish;
        newPage(false);
    }

    private void newPage(boolean continuation) throws IOException {
        if (content != null) content.close();
        page = new PDPage(PDRectangle.A4);
        document.addPage(page);
        content = new PDPageContentStream(document, page);
        y = page.getMediaBox().getHeight() - MARGIN;
        if (continuation) {
            drawTextAt("EQUIO", MARGIN, y, 8, true, PRIMARY);
            drawTextAt(reportTitle, MARGIN + 42, y, 8, false, MUTED);
            drawLine(MARGIN, y - 9, PAGE_WIDTH - MARGIN, y - 9, BORDER, 0.6f);
            y -= 30;
        }
    }

    void reportHeader(String title, String period, String budgetName, LocalDateTime generatedAt)
            throws IOException {
        float top = page.getMediaBox().getHeight();
        fillRect(0, top - 154, PAGE_WIDTH, 154, "#18181B");
        fillRect(MARGIN, top - 48, 34, 4, PRIMARY);
        drawTextAt("EQUIO", MARGIN, top - 70, 10, true, "#C4B5FD");
        drawTextAt(title, MARGIN, top - 98, 24, true, "#FFFFFF");
        String subtitle = period + (budgetName != null && !budgetName.isBlank() ? "  ·  " + budgetName : "");
        drawTextAt(fitText(subtitle, bold, 10, CONTENT_WIDTH - 145), MARGIN, top - 121, 10, true, "#E4E4E7");
        String generated = (spanish ? "Generado " : "Generated ") + formatGenerated(generatedAt);
        drawRightText(generated, PAGE_WIDTH - MARGIN, top - 121, 8, false, "#A1A1AA");
        y = top - 178;
    }

    private String formatGenerated(LocalDateTime value) {
        if (value == null) return "";
        return value.format(DateTimeFormatter.ofPattern(spanish ? "dd/MM/yyyy HH:mm" : "MM/dd/yyyy h:mm a", Locale.US));
    }

    void resultBanner(boolean successful, String label, String summary) throws IOException {
        ensureSpace(66);
        String background = successful ? SUCCESS_BG : DANGER_BG;
        String color = successful ? SUCCESS : DANGER;
        fillRect(MARGIN, y - 54, CONTENT_WIDTH, 54, background);
        fillCircle(MARGIN + 20, y - 27, 7, color);
        drawTextAt(successful ? "OK" : "!", MARGIN + (successful ? 14.5f : 17.5f), y - 30, successful ? 5.5f : 8, true, "#FFFFFF");
        drawTextAt(label, MARGIN + 38, y - 21, 11, true, color);
        drawTextAt(fitText(summary, regular, 9, CONTENT_WIDTH - 55), MARGIN + 38, y - 39, 9, false, TEXT);
        y -= 70;
    }

    private void title(String value) throws IOException {
        writeWrapped(value, 18, true, 24);
        y -= 4;
    }

    void section(String value) throws IOException {
        section(value, null);
    }

    void section(String value, String subtitle) throws IOException {
        ensureSpace(50);
        y -= 8;
        fillRect(MARGIN, y - 15, 3, 17, PRIMARY);
        drawTextAt(value, MARGIN + 11, y - 10, 15, true, TEXT);
        y -= 27;
        if (subtitle != null && !subtitle.isBlank()) {
            drawTextAt(fitText(subtitle, regular, 8.5f, CONTENT_WIDTH), MARGIN, y, 8.5f, false, MUTED);
            y -= 18;
        }
    }

    private void metric(String label, String value) throws IOException {
        text(label + ": " + value);
    }

    void metricGrid(List<Metric> metrics) throws IOException {
        if (metrics.isEmpty()) return;
        float gap = 9;
        float cardWidth = (CONTENT_WIDTH - gap * 2) / 3;
        float cardHeight = 67;
        for (int index = 0; index < metrics.size(); index++) {
            int column = index % 3;
            if (column == 0) ensureSpace(cardHeight + 10);
            Metric metric = metrics.get(index);
            float x = MARGIN + column * (cardWidth + gap);
            float cardY = y - cardHeight;
            fillRect(x, cardY, cardWidth, cardHeight, toneBackground(metric.tone()));
            strokeRect(x, cardY, cardWidth, cardHeight, toneBorder(metric.tone()), 0.7f);
            drawTextAt(fitText(metric.label(), regular, 7.5f, cardWidth - 20), x + 10, y - 16, 7.5f, false, MUTED);
            drawTextAt(fitText(metric.value(), bold, 14, cardWidth - 20), x + 10, y - 37, 14, true, toneColor(metric.tone()));
            drawTextAt(fitText(metric.detail(), regular, 7, cardWidth - 20), x + 10, y - 54, 7, false, MUTED);
            if (column == 2 || index == metrics.size() - 1) y -= cardHeight + 10;
        }
    }

    void callout(String value) throws IOException {
        ensureSpace(42);
        fillRect(MARGIN, y - 34, CONTENT_WIDTH, 34, "#F5F3FF");
        fillRect(MARGIN, y - 34, 3, 34, PRIMARY);
        drawTextAt(fitText(value, regular, 8, CONTENT_WIDTH - 24), MARGIN + 12, y - 21, 8, false, "#5B21B6");
        y -= 46;
    }

    void categoryRow(String label, String value, Double percentage, String color, boolean exceeded)
            throws IOException {
        float rowHeight = percentage != null ? 45 : 31;
        ensureSpace(rowHeight);
        fillCircle(MARGIN + 5, y - 10, 3.5f, safeColor(color));
        drawTextAt(fitText(label, regular, 9, CONTENT_WIDTH * 0.55f), MARGIN + 15, y - 13, 9, false, TEXT);
        drawRightText(value, PAGE_WIDTH - MARGIN, y - 13, 9, true, exceeded ? DANGER : TEXT);
        if (percentage != null) {
            float barY = y - 31;
            fillRect(MARGIN, barY, CONTENT_WIDTH, 5, "#F4F4F5");
            float progress = (float) Math.min(100, Math.max(0, percentage));
            fillRect(MARGIN, barY, Math.max(2, CONTENT_WIDTH * progress / 100f), 5, exceeded ? DANGER : SUCCESS);
            drawRightText(percentValue(percentage), PAGE_WIDTH - MARGIN, barY - 8, 6.5f, false, MUTED);
        }
        y -= rowHeight;
        drawLine(MARGIN, y + 3, PAGE_WIDTH - MARGIN, y + 3, "#F4F4F5", 0.5f);
    }

    private String percentValue(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).toPlainString() + "%";
    }

    void rankingRow(int rank, String label, String value, String share, String color) throws IOException {
        ensureSpace(34);
        fillRect(MARGIN, y - 25, 24, 24, "#F4F4F5");
        drawCenteredText(String.valueOf(rank), MARGIN, y - 18, 24, 8, true, TEXT);
        fillCircle(MARGIN + 36, y - 13, 3, safeColor(color));
        drawTextAt(fitText(label, bold, 9, CONTENT_WIDTH * 0.5f), MARGIN + 46, y - 17, 9, true, TEXT);
        drawRightText(value, PAGE_WIDTH - MARGIN - 46, y - 17, 9, true, TEXT);
        drawRightText(share, PAGE_WIDTH - MARGIN, y - 17, 8, false, MUTED);
        y -= 34;
    }

    private void text(String value) throws IOException {
        writeWrapped(value, 10, false, 14);
    }

    void tableHeader(String first, String second, String third) throws IOException {
        ensureSpace(30);
        fillRect(MARGIN, y - 24, CONTENT_WIDTH, 24, "#F4F4F5");
        drawTextAt(first, MARGIN + 8, y - 16, 7, true, MUTED);
        drawTextAt(second, MARGIN + 240, y - 16, 7, true, MUTED);
        drawRightText(third, PAGE_WIDTH - MARGIN - 8, y - 16, 7, true, MUTED);
        y -= 29;
    }

    void tableRow(String first, String second, String third, boolean shaded, Tone tone) throws IOException {
        ensureSpace(36);
        if (shaded) fillRect(MARGIN, y - 31, CONTENT_WIDTH, 31, SURFACE);
        drawTextAt(fitText(first, bold, 8.5f, 220), MARGIN + 8, y - 13, 8.5f, true, TEXT);
        drawTextAt(fitText(second, regular, 7.5f, 190), MARGIN + 240, y - 13, 7.5f, false, MUTED);
        drawRightText(third, PAGE_WIDTH - MARGIN - 8, y - 13, 8.5f, true, toneColor(tone));
        y -= 31;
        drawLine(MARGIN, y, PAGE_WIDTH - MARGIN, y, BORDER, 0.4f);
        y -= 5;
    }

    void simpleRow(String label, String value, Tone tone) throws IOException {
        ensureSpace(29);
        drawTextAt(fitText(label, regular, 9, CONTENT_WIDTH * 0.7f), MARGIN + 8, y - 13, 9, false, TEXT);
        drawRightText(value, PAGE_WIDTH - MARGIN - 8, y - 13, 9, true, toneColor(tone));
        y -= 29;
        drawLine(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2, BORDER, 0.4f);
    }

    void dateDivider(String date) throws IOException {
        ensureSpace(34);
        y -= 5;
        fillRect(MARGIN, y - 21, CONTENT_WIDTH, 21, "#F4F4F5");
        drawTextAt(date.toUpperCase(Locale.ROOT), MARGIN + 8, y - 14, 7, true, MUTED);
        y -= 27;
    }

    void movementRow(String title, String detail, String amount, boolean shaded, Tone tone, String color)
            throws IOException {
        ensureSpace(39);
        if (shaded) fillRect(MARGIN, y - 34, CONTENT_WIDTH, 34, SURFACE);
        fillCircle(MARGIN + 10, y - 17, 4, safeColor(color));
        drawTextAt(fitText(title, bold, 8.5f, 285), MARGIN + 22, y - 14, 8.5f, true, TEXT);
        drawTextAt(fitText(detail, regular, 7, 285), MARGIN + 22, y - 27, 7, false, MUTED);
        drawRightText(amount, PAGE_WIDTH - MARGIN - 8, y - 20, 9, true, toneColor(tone));
        y -= 34;
        drawLine(MARGIN, y, PAGE_WIDTH - MARGIN, y, BORDER, 0.35f);
        y -= 5;
    }

    void emptyState(String message) throws IOException {
        ensureSpace(43);
        fillRect(MARGIN, y - 35, CONTENT_WIDTH, 35, SURFACE);
        drawTextAt(fitText(message, regular, 8.5f, CONTENT_WIDTH - 24), MARGIN + 12, y - 21, 8.5f, false, MUTED);
        y -= 47;
    }

    private void writeWrapped(String value, float size, boolean useBold, float lineHeight) throws IOException {
        String safe = sanitize(value);
        for (String paragraph : safe.split("\\R", -1)) {
            String remaining = paragraph;
            while (remaining.length() > MAX_LINE_LENGTH) {
                int splitAt = remaining.lastIndexOf(' ', MAX_LINE_LENGTH);
                if (splitAt <= 0) splitAt = MAX_LINE_LENGTH;
                writeLine(remaining.substring(0, splitAt).trim(), size, useBold, lineHeight);
                remaining = remaining.substring(splitAt).trim();
            }
            writeLine(remaining, size, useBold, lineHeight);
        }
    }

    private void writeLine(String value, float size, boolean useBold, float lineHeight) throws IOException {
        ensureSpace(lineHeight);
        content.beginText();
        PDType1Font font = useBold ? bold : regular;
        content.setNonStrokingColor(hex(TEXT));
        content.setFont(font, size);
        content.newLineAtOffset(MARGIN, y);
        content.showText(sanitizeForFont(value, font));
        content.endText();
        y -= lineHeight;
    }

    private void ensureSpace(float required) throws IOException {
        if (y - required < BOTTOM_MARGIN) newPage(true);
    }

    private String sanitize(String value) {
        if (value == null) return "";
        return value.replace('\u00a0', ' ')
                .replaceAll("[^\\x20-\\x7E\\xA0-\\xFF]", "?");
    }

    private String sanitizeForFont(String value, PDType1Font font) {
        StringBuilder safe = new StringBuilder(value.length());
        value.codePoints().forEach(codePoint -> {
            String character = new String(Character.toChars(codePoint));
            try {
                font.encode(character);
                safe.append(character);
            } catch (IOException | IllegalArgumentException exception) {
                safe.append('?');
            }
        });
        return safe.toString();
    }

    private void drawTextAt(String value, float x, float baseline, float size, boolean useBold, String color)
            throws IOException {
        PDType1Font font = useBold ? bold : regular;
        content.beginText();
        content.setNonStrokingColor(hex(color));
        content.setFont(font, size);
        content.newLineAtOffset(x, baseline);
        content.showText(sanitizeForFont(sanitize(value), font));
        content.endText();
    }

    private void drawRightText(String value, float right, float baseline, float size, boolean useBold, String color)
            throws IOException {
        PDType1Font font = useBold ? bold : regular;
        String safe = sanitizeForFont(sanitize(value), font);
        drawTextAt(safe, right - textWidth(safe, font, size), baseline, size, useBold, color);
    }

    private void drawCenteredText(String value, float left, float baseline, float width, float size,
                                  boolean useBold, String color) throws IOException {
        PDType1Font font = useBold ? bold : regular;
        float x = left + (width - textWidth(value, font, size)) / 2f;
        drawTextAt(value, x, baseline, size, useBold, color);
    }

    private String fitText(String value, PDType1Font font, float size, float maxWidth) {
        String safe = sanitizeForFont(sanitize(value), font);
        if (textWidth(safe, font, size) <= maxWidth) return safe;
        String ellipsis = "...";
        while (!safe.isEmpty() && textWidth(safe + ellipsis, font, size) > maxWidth) {
            safe = safe.substring(0, safe.length() - 1);
        }
        return safe.stripTrailing() + ellipsis;
    }

    private float textWidth(String value, PDType1Font font, float size) {
        try {
            return font.getStringWidth(sanitizeForFont(sanitize(value), font)) / 1000f * size;
        } catch (IOException exception) {
            return 0;
        }
    }

    private String toneColor(Tone tone) {
        return switch (tone) {
            case SUCCESS -> SUCCESS;
            case DANGER -> DANGER;
            case NEUTRAL -> TEXT;
        };
    }

    private String toneBackground(Tone tone) {
        return switch (tone) {
            case SUCCESS -> SUCCESS_BG;
            case DANGER -> DANGER_BG;
            case NEUTRAL -> SURFACE;
        };
    }

    private String toneBorder(Tone tone) {
        return switch (tone) {
            case SUCCESS -> "#A7F3D0";
            case DANGER -> "#FECDD3";
            case NEUTRAL -> BORDER;
        };
    }

    private String safeColor(String value) {
        return value != null && value.matches("^#[0-9a-fA-F]{6}$") ? value : "#A1A1AA";
    }

    private void fillRect(float x, float bottom, float width, float height, String color) throws IOException {
        content.setNonStrokingColor(hex(color));
        content.addRect(x, bottom, width, height);
        content.fill();
    }

    private void strokeRect(float x, float bottom, float width, float height, String color, float lineWidth)
            throws IOException {
        content.setStrokingColor(hex(color));
        content.setLineWidth(lineWidth);
        content.addRect(x, bottom, width, height);
        content.stroke();
    }

    private void fillCircle(float centerX, float centerY, float radius, String color) throws IOException {
        float control = radius * 0.5522848f;
        content.setNonStrokingColor(hex(color));
        content.moveTo(centerX + radius, centerY);
        content.curveTo(centerX + radius, centerY + control, centerX + control, centerY + radius, centerX, centerY + radius);
        content.curveTo(centerX - control, centerY + radius, centerX - radius, centerY + control, centerX - radius, centerY);
        content.curveTo(centerX - radius, centerY - control, centerX - control, centerY - radius, centerX, centerY - radius);
        content.curveTo(centerX + control, centerY - radius, centerX + radius, centerY - control, centerX + radius, centerY);
        content.fill();
    }

    private void drawLine(float startX, float startY, float endX, float endY, String color, float width)
            throws IOException {
        content.setStrokingColor(hex(color));
        content.setLineWidth(width);
        content.moveTo(startX, startY);
        content.lineTo(endX, endY);
        content.stroke();
    }

    private Color hex(String value) {
        String color = value != null && value.matches("^#[0-9a-fA-F]{6}$") ? value.substring(1) : "71717A";
        return new Color(
                Integer.parseInt(color.substring(0, 2), 16),
                Integer.parseInt(color.substring(2, 4), 16),
                Integer.parseInt(color.substring(4, 6), 16));
    }

    void timelineChart(List<BudgetHistoryReportResponse.TimelinePoint> points,
                               String actualLabel,
                               String idealLabel,
                               String currency,
                               boolean useSpanish) throws IOException {
        if (points.size() < 2) {
            emptyState(useSpanish ? "No hay suficientes datos para crear la curva."
                    : "There is not enough data to create the timeline.");
            return;
        }
        float chartHeight = 145;
        float chartWidth = CONTENT_WIDTH - 52;
        ensureSpace(chartHeight + 58);
        float chartLeft = MARGIN + 48;
        float chartTop = y - 20;
        float bottom = chartTop - chartHeight;
        BigDecimal maximum = points.stream()
                .flatMap(point -> java.util.stream.Stream.of(point.actual(), point.ideal()))
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ONE);
        if (maximum.signum() == 0) maximum = BigDecimal.ONE;

        fillRect(MARGIN, bottom - 27, CONTENT_WIDTH, chartHeight + 47, SURFACE);
        for (int line = 0; line <= 4; line++) {
            float lineY = bottom + chartHeight * line / 4f;
            drawLine(chartLeft, lineY, chartLeft + chartWidth, lineY, BORDER, 0.45f);
            BigDecimal labelValue = maximum.multiply(BigDecimal.valueOf(line))
                    .divide(BigDecimal.valueOf(4), 0, RoundingMode.HALF_UP);
            drawRightText(shortMoney(labelValue, currency), chartLeft - 7, lineY - 2, 6.5f, false, MUTED);
        }

        drawSeries(points, maximum, chartLeft, chartWidth, chartHeight, bottom, true);
        drawSeries(points, maximum, chartLeft, chartWidth, chartHeight, bottom, false);

        drawTextAt(formatChartDate(points.getFirst().date(), useSpanish), chartLeft, bottom - 14, 6.5f, false, MUTED);
        drawRightText(formatChartDate(points.getLast().date(), useSpanish), chartLeft + chartWidth,
                bottom - 14, 6.5f, false, MUTED);
        fillRect(MARGIN, bottom - 23, 12, 2.5f, PRIMARY);
        drawTextAt(actualLabel, MARGIN + 18, bottom - 25, 7, false, TEXT);
        fillRect(MARGIN + 118, bottom - 23, 12, 1.5f, MUTED);
        drawTextAt(idealLabel, MARGIN + 136, bottom - 25, 7, false, TEXT);
        y = bottom - 40;
    }

    private String shortMoney(BigDecimal amount, String currency) {
        String prefix = "PEN".equalsIgnoreCase(currency) ? "S/" : currency;
        if (amount.abs().compareTo(BigDecimal.valueOf(1000)) >= 0) {
            return prefix + " " + amount.divide(BigDecimal.valueOf(1000), 1, RoundingMode.HALF_UP) + "k";
        }
        return prefix + " " + amount.setScale(0, RoundingMode.HALF_UP);
    }

    private String formatChartDate(LocalDate date, boolean useSpanish) {
        Locale locale = useSpanish ? Locale.forLanguageTag("es-PE") : Locale.US;
        return date.format(DateTimeFormatter.ofPattern(useSpanish ? "dd MMM" : "MMM dd", locale));
    }

    private void drawSeries(List<BudgetHistoryReportResponse.TimelinePoint> points,
                            BigDecimal maximum,
                            float left,
                            float chartWidth,
                            float chartHeight,
                            float bottom,
                            boolean actual) throws IOException {
        if (actual) {
            content.setStrokingColor(hex(PRIMARY));
            content.setLineWidth(2.2f);
        } else {
            content.setStrokingColor(hex(MUTED));
            content.setLineWidth(1.2f);
        }
        for (int index = 0; index < points.size(); index++) {
            BigDecimal value = actual ? points.get(index).actual() : points.get(index).ideal();
            float x = left + (chartWidth * index / (points.size() - 1));
            float height = value.divide(maximum, 6, RoundingMode.HALF_UP).floatValue() * chartHeight;
            float pointY = bottom + height;
            if (index == 0) content.moveTo(x, pointY); else content.lineTo(x, pointY);
        }
        content.stroke();
    }
    byte[] toByteArray() throws IOException {
        if (content != null) {
            content.close();
            content = null;
        }
        addFooters();
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        document.save(output);
        return output.toByteArray();
    }

    private void addFooters() throws IOException {
        int totalPages = document.getNumberOfPages();
        for (int index = 0; index < totalPages; index++) {
            PDPage footerPage = document.getPage(index);
            try (PDPageContentStream footer = new PDPageContentStream(
                    document, footerPage, PDPageContentStream.AppendMode.APPEND, true, true)) {
                footer.setStrokingColor(hex(BORDER));
                footer.setLineWidth(0.5f);
                footer.moveTo(MARGIN, 34);
                footer.lineTo(PAGE_WIDTH - MARGIN, 34);
                footer.stroke();

                String pageLabel = (spanish ? "Página " : "Page ") + (index + 1) + " / " + totalPages;
                footer.beginText();
                footer.setNonStrokingColor(hex(MUTED));
                footer.setFont(regular, 7);
                footer.newLineAtOffset(PAGE_WIDTH - MARGIN - textWidth(pageLabel, regular, 7), 20);
                footer.showText(sanitizeForFont(pageLabel, regular));
                footer.endText();

                footer.beginText();
                footer.setNonStrokingColor(hex(MUTED));
                footer.setFont(bold, 7);
                footer.newLineAtOffset(MARGIN, 20);
                footer.showText("EQUIO");
                footer.endText();
            }
        }
    }

    @Override
    public void close() throws IOException {
        if (content != null) content.close();
        document.close();
    }
}
