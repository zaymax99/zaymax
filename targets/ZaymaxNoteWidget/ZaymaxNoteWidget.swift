import SwiftUI
import WidgetKit

private let appGroupIdentifier = "group.com.app.zaymax"
private let pinnedNoteKey = "zaymax.widget.pinned-note"
private let emptyNoteLabelKey = "zaymax.widget.empty-label"

struct ZaymaxNoteEntry: TimelineEntry {
    let date: Date
    let text: String
    let emptyLabel: String
}

struct ZaymaxNoteProvider: TimelineProvider {
    func placeholder(in context: Context) -> ZaymaxNoteEntry {
        ZaymaxNoteEntry(
            date: .now,
            text: "Nächstes Training: ruhig und sauber ausführen.",
            emptyLabel: "Notiz in Zaymax auswählen"
        )
    }

    func getSnapshot(
        in context: Context,
        completion: @escaping (ZaymaxNoteEntry) -> Void
    ) {
        completion(context.isPreview ? placeholder(in: context) : currentEntry())
    }

    func getTimeline(
        in context: Context,
        completion: @escaping (Timeline<ZaymaxNoteEntry>) -> Void
    ) {
        completion(Timeline(entries: [currentEntry()], policy: .never))
    }

    private func currentEntry() -> ZaymaxNoteEntry {
        let defaults = UserDefaults(suiteName: appGroupIdentifier)
        return ZaymaxNoteEntry(
            date: .now,
            text: defaults?.string(forKey: pinnedNoteKey) ?? "",
            emptyLabel: defaults?.string(forKey: emptyNoteLabelKey)
                ?? "Notiz in Zaymax auswählen"
        )
    }
}

struct ZaymaxNoteView: View {
    let entry: ZaymaxNoteEntry

    private var shownText: String {
        entry.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? entry.emptyLabel
            : entry.text
    }

    private var content: some View {
        HStack(alignment: .firstTextBaseline, spacing: 7) {
            Image(systemName: entry.text.isEmpty ? "note.text" : "pin.fill")
                .font(.system(size: 12, weight: .bold))
                .widgetAccentable()
            Text(shownText)
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .lineLimit(2)
                .minimumScaleFactor(0.78)
                .multilineTextAlignment(.leading)
            Spacer(minLength: 0)
        }
        .widgetURL(URL(string: "zaymax://reminders"))
        .accessibilityLabel(shownText)
    }

    @ViewBuilder
    var body: some View {
        if #available(iOS 17.0, *) {
            content.containerBackground(.clear, for: .widget)
        } else {
            content
        }
    }
}

struct ZaymaxPinnedNoteWidget: Widget {
    let kind = "ZaymaxPinnedNote"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ZaymaxNoteProvider()) { entry in
            ZaymaxNoteView(entry: entry)
        }
        .configurationDisplayName("Zaymax Notiz")
        .description("Zeigt deine ausgewählte Tagebuchnotiz auf dem Sperrbildschirm.")
        .supportedFamilies([.accessoryRectangular])
    }
}

@main
struct ZaymaxNoteWidgetBundle: WidgetBundle {
    var body: some Widget {
        ZaymaxPinnedNoteWidget()
    }
}
