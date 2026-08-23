from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "social" / "instagram-story-patch-notes"
BACKGROUND = OUT / "zaymax-story-background.png"
LOGO = ROOT / "assets" / "images" / "icon.png"

W, H = 1080, 1920
WHITE = "#F0F0F2"
SOFT = "#B5B5B9"
MUTED = "#85858A"
BORDER = "#3B3B40"
PANEL = (16, 16, 18, 225)
BLACK = "#09090A"
GOLD = "#C6A752"

FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_REGULAR = "C:/Windows/Fonts/arial.ttf"
FONT_NARROW = "C:/Windows/Fonts/bahnschrift.ttf"


def font(size: int, bold: bool = False, narrow: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_NARROW if narrow else FONT_BOLD if bold else FONT_REGULAR
    return ImageFont.truetype(path, size)


def tracking_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, text_font: ImageFont.FreeTypeFont, fill: str, spacing: int = 6) -> None:
    x, y = xy
    for char in text:
        draw.text((x, y), char, font=text_font, fill=fill)
        x += int(draw.textlength(char, font=text_font)) + spacing


def wrap_text(draw: ImageDraw.ImageDraw, text: str, text_font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        if not words:
            lines.append("")
            continue
        current = words[0]
        for word in words[1:]:
            candidate = f"{current} {word}"
            if draw.textlength(candidate, font=text_font) <= max_width:
                current = candidate
            else:
                lines.append(current)
                current = word
        lines.append(current)
    return lines


def draw_wrapped(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, text_font: ImageFont.FreeTypeFont, fill: str, max_width: int, spacing: int = 8) -> int:
    x, y = xy
    lines = wrap_text(draw, text, text_font, max_width)
    line_height = text_font.size + spacing
    for line in lines:
        draw.text((x, y), line, font=text_font, fill=fill)
        y += line_height
    return y


def story_background(index: int) -> Image.Image:
    source = Image.open(BACKGROUND).convert("RGB")
    source = ImageOps.fit(source, (W, H), method=Image.Resampling.LANCZOS)
    if index % 2 == 0:
        source = ImageOps.mirror(source)
    source = ImageEnhance.Brightness(source).enhance(0.62)
    source = ImageEnhance.Contrast(source).enhance(1.08)
    source = source.filter(ImageFilter.GaussianBlur(0.25)).convert("RGBA")

    tint = Image.new("RGBA", (W, H), (5, 5, 6, 38))
    source = Image.alpha_composite(source, tint)
    gradient = Image.new("L", (1, H))
    for y in range(H):
        opacity = int(65 + 75 * (y / H))
        gradient.putpixel((0, y), opacity)
    gradient = gradient.resize((W, H))
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow.putalpha(gradient)
    return Image.alpha_composite(source, shadow)


def header(canvas: Image.Image, draw: ImageDraw.ImageDraw, number: str) -> None:
    logo = Image.open(LOGO).convert("RGBA")
    logo = ImageOps.fit(logo, (72, 72), method=Image.Resampling.LANCZOS)
    draw.rectangle((72, 94, 160, 182), fill=(5, 5, 6, 230), outline=BORDER, width=2)
    canvas.alpha_composite(logo, (80, 102))
    tracking_text(draw, (184, 103), "ZAYMAX", font(30, bold=True), WHITE, 7)
    tracking_text(draw, (184, 145), "PATCH NOTES", font(17, bold=True), MUTED, 5)
    draw.text((915, 112), number, font=font(28, bold=True, narrow=True), fill=SOFT, anchor="ra")
    draw.line((72, 218, 1008, 218), fill=BORDER, width=2)


def footer(draw: ImageDraw.ImageDraw, index: int, total: int = 8) -> None:
    draw.line((72, 1752, 1008, 1752), fill=BORDER, width=2)
    tracking_text(draw, (72, 1791), "ZAYMAX UPDATE", font(16, bold=True), MUTED, 4)
    draw.text((1008, 1782), f"{index:02d} / {total:02d}", font=font(22, bold=True, narrow=True), fill=SOFT, anchor="ra")
    for i in range(total):
        x = 72 + i * 26
        color = GOLD if i == index - 1 else "#444449"
        draw.rectangle((x, 1830, x + 16, 1834), fill=color)


def title_block(draw: ImageDraw.ImageDraw, eyebrow: str, title: str, subtitle: str, title_size: int = 76) -> int:
    tracking_text(draw, (72, 272), eyebrow, font(18, bold=True), GOLD, 5)
    y = draw_wrapped(draw, (72, 316), title, font(title_size, bold=True, narrow=True), WHITE, 936, 5)
    y += 18
    y = draw_wrapped(draw, (72, y), subtitle, font(28), SOFT, 900, 10)
    return y


def panel(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], accent: bool = False) -> None:
    draw.rectangle(box, fill=PANEL, outline=BORDER, width=2)
    if accent:
        draw.rectangle((box[0], box[1], box[0] + 8, box[3]), fill=GOLD)


def icon_box(draw: ImageDraw.ImageDraw, xy: tuple[int, int], icon: str, size: int = 82) -> None:
    x, y = xy
    draw.rectangle((x, y, x + size, y + size), fill=(8, 8, 9, 245), outline="#66666B", width=2)
    cx, cy = x + size // 2, y + size // 2
    stroke = WHITE
    if icon == "plus":
        draw.rectangle((cx - 7, cy - 26, cx + 7, cy + 26), fill=stroke)
        draw.rectangle((cx - 26, cy - 7, cx + 26, cy + 7), fill=stroke)
    elif icon == "sets":
        for offset in (-20, 0, 20):
            draw.rectangle((x + 18, cy + offset - 5, x + 29, cy + offset + 6), outline=stroke, width=2)
            draw.line((x + 39, cy + offset, x + 65, cy + offset), fill=stroke, width=4)
    elif icon == "medal":
        draw.ellipse((cx - 20, cy - 25, cx + 20, cy + 15), outline=GOLD, width=5)
        draw.polygon([(cx - 16, cy + 10), (cx - 5, cy + 31), (cx, cy + 13)], fill=GOLD)
        draw.polygon([(cx + 16, cy + 10), (cx + 5, cy + 31), (cx, cy + 13)], fill=GOLD)
    elif icon == "dumbbell":
        draw.line((cx - 24, cy, cx + 24, cy), fill=GOLD, width=7)
        for dx in (-29, -21, 21, 29):
            draw.line((cx + dx, cy - 15, cx + dx, cy + 15), fill=GOLD, width=6)
    elif icon == "timer":
        draw.ellipse((cx - 23, cy - 18, cx + 23, cy + 28), outline=stroke, width=4)
        draw.line((cx, cy + 5, cx + 14, cy - 5), fill=stroke, width=4)
        draw.line((cx - 8, cy - 27, cx + 8, cy - 27), fill=stroke, width=5)
    elif icon == "book":
        draw.rectangle((cx - 27, cy - 25, cx - 2, cy + 27), outline=stroke, width=3)
        draw.rectangle((cx + 2, cy - 25, cx + 27, cy + 27), outline=stroke, width=3)
        draw.line((cx, cy - 22, cx, cy + 28), fill=stroke, width=2)
    elif icon == "journal":
        draw.rectangle((cx - 27, cy - 29, cx + 18, cy + 29), outline=stroke, width=3)
        draw.line((cx - 15, cy - 12, cx + 7, cy - 12), fill=stroke, width=3)
        draw.line((cx - 15, cy, cx + 7, cy), fill=stroke, width=3)
        draw.line((cx + 3, cy + 23, cx + 28, cy - 2), fill=GOLD, width=6)
    elif icon == "lock":
        draw.rectangle((cx - 24, cy - 2, cx + 24, cy + 29), outline=stroke, width=4)
        draw.arc((cx - 18, cy - 30, cx + 18, cy + 10), 180, 360, fill=stroke, width=4)
        draw.ellipse((cx - 4, cy + 8, cx + 4, cy + 16), fill=stroke)
    elif icon == "globe":
        draw.ellipse((cx - 28, cy - 28, cx + 28, cy + 28), outline=stroke, width=3)
        draw.arc((cx - 14, cy - 28, cx + 14, cy + 28), 90, 270, fill=stroke, width=3)
        draw.arc((cx - 14, cy - 28, cx + 14, cy + 28), 270, 90, fill=stroke, width=3)
        draw.line((cx - 25, cy, cx + 25, cy), fill=stroke, width=3)
    elif icon == "spark":
        points = [(cx, cy - 30), (cx + 8, cy - 8), (cx + 30, cy), (cx + 8, cy + 8), (cx, cy + 30), (cx - 8, cy + 8), (cx - 30, cy), (cx - 8, cy - 8)]
        draw.polygon(points, fill=GOLD)


def feature_card(draw: ImageDraw.ImageDraw, y: int, icon: str, title: str, detail: str, accent: bool = False) -> None:
    panel(draw, (72, y, 1008, y + 146), accent)
    icon_box(draw, (96, y + 31), icon, 84)
    draw.text((208, y + 29), title.upper(), font=font(31, bold=True, narrow=True), fill=WHITE)
    draw_wrapped(draw, (208, y + 75), detail, font(23), SOFT, 744, 6)


def metric(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], value: str, label: str, gold: bool = False) -> None:
    panel(draw, box)
    draw.text((box[0] + 24, box[1] + 24), value, font=font(48, bold=True, narrow=True), fill=GOLD if gold else WHITE)
    tracking_text(draw, (box[0] + 24, box[1] + 88), label.upper(), font(14, bold=True), MUTED, 3)


def cover(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    header(canvas, draw, "23.08.26")
    tracking_text(draw, (72, 300), "HEUTE GEMACHT", font(18, bold=True), GOLD, 6)
    icon_box(draw, (449, 396), "plus", 182)
    draw.text((540, 636), "DAS GROSSE", font=font(76, bold=True, narrow=True), fill=SOFT, anchor="ma")
    draw.text((540, 724), "ZAYMAX UPDATE", font=font(92, bold=True, narrow=True), fill=WHITE, anchor="ma")
    draw_wrapped(draw, (138, 842), "Mehr Kontrolle. Mehr Fortschritt. Ein komplett neuer Look.", font(34), SOFT, 804, 12)
    panel(draw, (122, 1088, 958, 1356), True)
    tracking_text(draw, (166, 1135), "PATCH NOTES", font(19, bold=True), MUTED, 5)
    draw.text((166, 1188), "08", font=font(92, bold=True, narrow=True), fill=WHITE)
    draw.text((316, 1215), "UPDATES", font=font(37, bold=True, narrow=True), fill=WHITE)
    draw.text((166, 1300), "Alle Änderungen von heute – kompakt zusammengefasst.", font=font(24), fill=SOFT)
    footer(draw, 1)


def sets_slide(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    header(canvas, draw, "01 / SATZWERTE")
    title_block(draw, "MEHR KONTROLLE", "JEDER SATZ. DEINE WERTE.", "Dein Workout passt sich jetzt Satz für Satz an.")
    feature_card(draw, 730, "sets", "Wiederholungen pro Satz", "Für jeden Satz eine eigene Wiederholungszahl.", True)
    feature_card(draw, 900, "dumbbell", "Gewicht pro Satz", "Jeder Satz kann jetzt sein eigenes Gewicht haben.")
    feature_card(draw, 1070, "plus", "Direkt im Training ändern", "Satzanzahl, Wiederholungen und Gewicht ohne Umweg bearbeiten.")
    feature_card(draw, 1240, "sets", "Schneller steuern", "+ / − für Wiederholungen und klare Eingabefelder.")
    footer(draw, 2)


def progress_slide(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    header(canvas, draw, "02 / STEIGERUNG")
    title_block(draw, "PROGRESS FEEDBACK", "FORTSCHRITT, DEN DU SIEHST.", "Jede Steigerung bekommt sofort das richtige Feedback.")
    metric(draw, (72, 728, 520, 882), "+1", "Wiederholung", True)
    metric(draw, (560, 728, 1008, 882), "+2 KG", "Gewicht", True)
    feature_card(draw, 924, "medal", "Medaille für Wiederholungen", "Goldenes Feedback, sobald du dich bei den Reps steigerst.")
    feature_card(draw, 1094, "dumbbell", "Kurzhantel für Gewicht", "Gewichtssteigerungen erscheinen separat – oder gemeinsam.")
    feature_card(draw, 1264, "spark", "Konfetti am richtigen Ort", "Der Effekt läuft direkt an der geänderten Satzkarte ab und landet in der Historie.", True)
    footer(draw, 3)


def flow_slide(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    header(canvas, draw, "03 / TRAININGSFLOW")
    title_block(draw, "SCHNELLER TRAINIEREN", "WENIGER TIPPEN. MEHR TRAINIEREN.", "Der aktive Trainingsmodus arbeitet jetzt viel direkter.")
    feature_card(draw, 730, "timer", "Automatischer Pausentimer", "Nach einem abgeschlossenen Satz startet die Pause direkt.", True)
    feature_card(draw, 900, "sets", "Unfertige Sätze im Blick", "Vor dem Beenden siehst du sofort, was noch offen ist.")
    feature_card(draw, 1070, "spark", "Wie war’s?", "Leicht, Gut oder Hart – dein Gefühl wird gespeichert.")
    feature_card(draw, 1240, "plus", "Abschluss-Zusammenfassung", "Dauer, Sätze, Volumen, Steigerungen und Bestleistungen auf einen Blick.")
    footer(draw, 4)


def history_slide(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    header(canvas, draw, "04 / HISTORIE")
    title_block(draw, "DEINE LEISTUNG", "ALLES KLAR DOKUMENTIERT.", "Der neue Buch-Button bringt dich direkt zu deinem Fortschritt.")
    metric(draw, (72, 712, 365, 866), "4", "Sätze")
    metric(draw, (393, 712, 686, 866), "1.887", "Volumen")
    metric(draw, (714, 712, 1008, 866), "1 PR", "Bestwert", True)
    feature_card(draw, 908, "book", "Letztes Training", "Sätze, Wiederholungen, Gewicht und Trainingsgefühl.", True)
    feature_card(draw, 1078, "medal", "Steigerungen gespeichert", "Medaille, Kurzhantel, +Werte und persönliche Bestleistungen.")
    feature_card(draw, 1248, "sets", "Übungsverlauf", "Bestgewicht, beste Reps, Gesamtvolumen und Entwicklungskurve.")
    footer(draw, 5)


def journal_slide(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    header(canvas, draw, "05 / TAGEBUCH")
    title_block(draw, "MEHR ALS TRAINING", "TRAININGSTAGE & GEDANKEN.", "Aus Erinnerungen wurde ein echtes persönliches Tagebuch.")
    feature_card(draw, 730, "journal", "Montag bis Sonntag", "Wähle und ändere deine persönlichen Trainingstage.", True)
    feature_card(draw, 900, "plus", "Notizen festhalten", "Gedanken fürs Leben oder Hinweise fürs nächste Training.")
    feature_card(draw, 1070, "sets", "Bearbeiten & löschen", "Jeder Eintrag bleibt flexibel und vollständig lokal.")
    feature_card(draw, 1240, "spark", "Weiße Bestätigung", "Großes weißes Konfetti bestätigt deine Tagesauswahl.")
    footer(draw, 6)


def system_slide(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    header(canvas, draw, "06 / SYSTEM")
    title_block(draw, "AUFGERÄUMTER FLOW", "SCHNELL. KLAR. DEINS.", "Weniger Umwege und eine Navigation ohne störende Unterbrechungen.")
    feature_card(draw, 730, "lock", "Archiv entfernt", "Workouts werden geschützt und behalten – oder bewusst gelöscht.", True)
    feature_card(draw, 900, "sets", "Flüssige Tab-Wechsel", "Kein weißer Flash mehr zwischen Heute und Tagebuch.")
    feature_card(draw, 1070, "plus", "Sauberes Zaymax-Branding", "Keine fremden Watermarks mehr in der Oberfläche.")
    feature_card(draw, 1240, "timer", "Weniger Animationen", "Kurze Übergänge halten Zaymax schnell und fokussiert.")
    footer(draw, 7)


def design_slide(canvas: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    header(canvas, draw, "07 / DESIGN & SPRACHE")
    title_block(draw, "ZAYMAX 2.0 LOOK", "DUNKLER. ECKIGER. GLOBAL.", "Das neue System verbindet klare Fitness-Ästhetik mit zwei Sprachen.")
    panel(draw, (72, 710, 1008, 1018), True)
    icon_box(draw, (112, 774), "globe", 104)
    draw.text((252, 748), "APP-SPRACHE", font=font(25, bold=True, narrow=True), fill=MUTED)
    draw.text((252, 800), "DEUTSCH", font=font(43, bold=True, narrow=True), fill=WHITE)
    draw.rectangle((252, 872, 482, 946), fill=WHITE)
    draw.text((367, 895), "STANDARD", font=font(22, bold=True), fill=BLACK, anchor="ma")
    draw.rectangle((510, 872, 824, 946), outline=BORDER, width=2, fill=(8, 8, 9, 220))
    draw.text((667, 895), "ENGLISH", font=font(22, bold=True), fill=WHITE, anchor="ma")
    feature_card(draw, 1060, "spark", "Neue Zaymax-Optik", "Schwarz, Anthrazit, Glasflächen, Konturlinien und starke Typografie.", True)
    feature_card(draw, 1230, "sets", "Komplett übersetzt", "Tabs, Training, Tagebuch, Historie, Editor, Dialoge und Einstellungen.")
    draw.text((540, 1515), "UPDATE COMPLETE.", font=font(52, bold=True, narrow=True), fill=WHITE, anchor="ma")
    tracking_text(draw, (342, 1582), "STAY STRONG", font(20, bold=True), GOLD, 6)
    footer(draw, 8)


SLIDES: list[tuple[str, Callable[[Image.Image, ImageDraw.ImageDraw], None]]] = [
    ("01-cover", cover),
    ("02-satzwerte", sets_slide),
    ("03-steigerung", progress_slide),
    ("04-trainingsflow", flow_slide),
    ("05-historie", history_slide),
    ("06-tagebuch", journal_slide),
    ("07-system", system_slide),
    ("08-design-sprache", design_slide),
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for index, (name, renderer) in enumerate(SLIDES, start=1):
        canvas = story_background(index)
        draw = ImageDraw.Draw(canvas, "RGBA")
        renderer(canvas, draw)
        canvas.convert("RGB").save(OUT / f"zaymax-patch-notes-{name}.png", quality=96)


if __name__ == "__main__":
    main()
