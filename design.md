# Zaymax – Interface- und Produktdesign

## Produktidee

Zaymax ist eine ruhige, fokussierte Fitness-Notiz-App für Menschen, die ihre Trainingsfortschritte ohne komplizierte Pläne oder soziale Funktionen selbst dokumentieren möchten. Die App arbeitet lokal auf dem Gerät und stellt die eigenen Einträge, Trends und persönlichen Bestwerte in den Mittelpunkt.

## Screen-Liste

| Screen | Primärer Inhalt und Funktion |
|---|---|
| **Heute** | Begrüßung, Trainingsstatus der aktuellen Woche, kompakte Fortschrittskarten, letzter Trainingseintrag und primäre Aktion „Training notieren“. |
| **Training notieren** | Formular für Datum, Trainingsart, Dauer, Körpergewicht, Notiz und optionale Leistungswerte wie Sätze, Wiederholungen oder Gewicht. Speichern über eine klar sichtbare primäre Aktion. |
| **Verlauf** | Chronologische Liste aller gespeicherten Trainingseinträge mit Datum, Trainingsart, Dauer und Kurznotiz. Einträge können geöffnet und gelöscht werden. |
| **Fortschritt** | Zusammenfassung von Trainingsanzahl, Gesamtzeit, aktivsten Tagen und Körpergewichtstrend. Ein einfacher Balken- beziehungsweise Linienbereich zeigt den Verlauf der letzten Wochen. |
| **Eintrag-Detail** | Vollständige Ansicht eines einzelnen Eintrags mit Bearbeiten- und Löschen-Aktionen. |
| **Einstellungen** | Lokale Optionen wie Einheitenwahl, Daten zurücksetzen und kurze Produktinformation. Keine Anmeldung, kein Cloud-Zwang. |

## Primäre Navigation

Die App verwendet eine native iOS-Tabbar mit den drei Hauptbereichen **Heute**, **Verlauf** und **Fortschritt**. Das Erstellen eines Eintrags erfolgt als prominente, kontextbezogene Aktion auf dem Heute-Screen und als zusätzliche Aktion aus dem Verlauf. Einstellungen werden über ein diskretes Zahnrad im Header des Heute-Screens geöffnet.

## Key User Flows

### Training dokumentieren

1. Die Person öffnet den Tab „Heute“.
2. Sie tippt auf „Training notieren“.
3. Das Formular ist mit dem heutigen Datum vorausgefüllt.
4. Sie wählt eine Trainingsart, ergänzt Dauer und optionale Werte sowie eine Notiz.
5. Sie tippt auf „Eintrag speichern“.
6. Zaymax bestätigt die Speicherung mit einer kurzen haptischen Rückmeldung und zeigt den aktualisierten Heute-Screen.

### Fortschritt ansehen

1. Die Person öffnet den Tab „Fortschritt“.
2. Oben erscheinen die wichtigsten Kennzahlen zur bisherigen Aktivität.
3. Darunter kann zwischen „Training“ und „Gewicht“ gewechselt werden, sofern Gewichtsdaten vorhanden sind.
4. Ein Tipp auf eine Kennzahl führt bei Bedarf in den Verlauf beziehungsweise zum passenden Detailbereich.

### Eintrag bearbeiten oder löschen

1. Die Person öffnet „Verlauf“.
2. Sie tippt auf einen Eintrag.
3. In der Detailansicht wählt sie „Bearbeiten“ oder „Löschen“.
4. Das Löschen erfordert eine native Bestätigung, damit keine Daten versehentlich verloren gehen.

## Mobile Layout

Alle Screens sind für **Portraitformat 9:16** und einhändige Bedienung ausgelegt. Inhalte liegen in einem vertikalen Scrollbereich mit großzügigen Touch-Zielen von mindestens etwa 44 Punkten. Primäre Aktionen sitzen im unteren, gut erreichbaren Bereich oder als breite Sticky-Aktion am Ende eines Formulars. Safe Areas, Tabbar-Abstand und Tastaturverhalten werden über die vorhandenen Container berücksichtigt.

## Farb- und Markenentscheidung

Zaymax erhält eine dunkle, sportliche Grundstimmung mit einem leuchtenden Limettengrün als Energie- und Aktionsfarbe. Die Kombination soll Fortschritt sichtbar machen, ohne aggressiv oder überladen zu wirken.

| Rolle | Farbe | Verwendung |
|---|---|---|
| Hintergrund | `#0B0F0D` | Hauptfläche im Dark Mode |
| Oberfläche | `#151C18` | Karten, Formulare und Tabbar |
| Primärfarbe | `#B7F34A` | Hauptaktionen, aktive Navigation, Fortschrittsmarker |
| Primärtext | `#F4F7F2` | Überschriften und wichtige Werte |
| Sekundärtext | `#9BA79E` | Hinweise, Labels und Metadaten |
| Rahmen | `#27332B` | Dezente Trennlinien und Kartenränder |
| Erfolg | `#6EEB83` | Speicherbestätigung und positive Statuswerte |
| Warnung | `#F4C95D` | Hinweise bei unvollständigen Angaben |
| Fehler | `#FF7A7A` | Validierungs- und Löschhinweise |

## Datenmodell

Ein Trainingseintrag wird lokal als `WorkoutEntry` gespeichert: `id`, `date`, `type`, `durationMinutes`, `bodyWeightKg`, `performanceNote`, `sets`, `reps`, `weightKg` und `createdAt`. Die Eintragsliste wird mit AsyncStorage persistiert. Kennzahlen und Diagrammwerte werden aus diesen Einträgen abgeleitet, sodass die UI keine vorgetäuschten Fortschrittszahlen anzeigt.

## Designprinzipien

Zaymax soll sich wie eine fokussierte First-Party-iOS-App anfühlen: klare Typografie, wenige Ebenen, sichtbare Hierarchie, keine unnötigen Dialoge und direkte Rückmeldung nach jeder Aktion. Der Empty State erklärt konkret, was als Nächstes zu tun ist, statt nur eine leere Liste zu zeigen.
