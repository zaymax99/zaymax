---
title: Support – ZAYMAX
---

# ZAYMAX Support

**Hilfe zur Workout-Fassung ohne Health-/Schritte-Tab**

[Datenschutz](privacy.html) · [Website](https://zaymax.net) · [English](support-en.html) · [Polski](support-pl.html)

ZAYMAX ist eine lokale Workout-App für die Planung, Durchführung und Dokumentation eigener Trainingseinheiten. Die App benötigt kein Konto.

## Kontakt

Hilfe und Kontakt finden Sie über [zaymax.net](https://zaymax.net). Bei Fragen, Problemen oder Feedback können Sie auch direkt schreiben:

**Blazej Doszczeczko**

E-Mail: [blazej.doszczeczko@gmail.com](mailto:blazej.doszczeczko@gmail.com)

Bitte nennen Sie bei technischen Problemen möglichst:

- ZAYMAX-Version und Buildnummer;
- iPhone-Modell und iOS-Version;
- verwendete App-Sprache;
- eine kurze Beschreibung der letzten Schritte vor dem Problem.

Die Workout-Fassung enthält keinen In-App-Meldedialog und versendet keine automatischen Fehlerberichte. Sie entscheiden selbst, welche Angaben Sie mitteilen. Senden Sie bitte keine sensiblen Gesundheitsdaten oder vollständigen Backup-Dateien per E-Mail.

## Workout-Fassung und ältere Health-Versionen

Die überarbeitete Workout-Fassung konzentriert sich auf **Heute** und **Tagebuch**. Sie enthält keinen Schritte- oder Health-Tab, fragt keine Health-Berechtigung an und liest oder schreibt keine Daten in Apple Health. Manuell eingegebene Profilwerte und der lokale BMI bleiben unabhängig davon nutzbar.

Die Umstellung wird mit einem App-Update ausgeliefert. Bereits installierte ältere App-Store- oder TestFlight-Versionen können die früheren Health- oder Schritte-Funktionen weiterhin enthalten. Diese Anleitung bedeutet nicht, dass Ihre installierte Version bereits umgestellt wurde.

Frühere Zugriffsrechte können Sie jederzeit in der Health-App oder in den iOS-Datenschutzeinstellungen für ZAYMAX prüfen und widerrufen. Das Entfernen der Integration löscht keine Daten in Apple Health.

## Pausentimer, Sounds und Haptik

Unter **Einstellungen → Training → Pausentimer** können Sie den Pausentimer ein- oder ausschalten und die Pausenzeit wählen. Unter **Sounds & Haptik** lassen sich **App-Sounds**, die **Klangwelt** und **Haptisches Feedback** anpassen; Haptik ist unabhängig von Sounds schaltbar. Unter **Erweitert** können Sie einzelne Klangereignisse ein- oder ausschalten.

Für Pausenende-Klänge bei gesperrtem iPhone aktivieren Sie **Auch bei gesperrtem Bildschirm** und erlauben Mitteilungen. Prüfen Sie bei fehlendem Klang auch App-Sounds, das Klangereignis **Pausenende**, Lautstärke, Stummmodus, Fokus und **iOS-Einstellungen → Mitteilungen → ZAYMAX**. Die Pausen-Erinnerung wird lokal auf dem iPhone geplant.

## Notiz im Sperrbildschirm-Widget

1. Erstellen oder öffnen Sie im Tab **Tagebuch** eine Notiz.
2. Wählen Sie **Im Sperrbildschirm-Widget zeigen**.
3. Halten Sie den iPhone-Sperrbildschirm gedrückt und wählen Sie **Anpassen**.
4. Öffnen Sie den Widget-Bereich und fügen Sie das ZAYMAX-Notiz-Widget hinzu.

Falls das Widget nicht in der Liste erscheint, öffnen Sie ZAYMAX einmal vollständig und starten Sie das iPhone anschließend neu. Entfernen Sie die Sperrbildschirm-Auswahl in ZAYMAX, wenn die Notiz nicht mehr im Widget erscheinen soll. Widget-Inhalte sind auf dem Sperrbildschirm sichtbar; verwenden Sie dort keine vertraulichen Notizen.

## Backup und Wiederherstellung

ZAYMAX speichert Daten lokal. Vor einer Neuinstallation, einem Gerätewechsel oder dem Löschen lokaler Daten:

1. Öffnen Sie **Einstellungen**.
2. Wählen Sie **Backup speichern**.
3. Speichern Sie die JSON-Datei über das iOS-Teilen-Menü an einem sicheren Ort.

Zur Wiederherstellung wählen Sie **Einstellungen → Backup laden** und anschließend Ihre ZAYMAX-JSON-Datei. Nach Ihrer Bestätigung ersetzen die Daten der Datei die aktuellen lokalen Daten. Das Backup ist nicht verschlüsselt und kann persönliche Trainings-, Tagebuch-, Profil- und Einstellungsdaten enthalten.

**Bereinigung im noch nicht veröffentlichten App-Update:** Die interne Exportdatei wird vorübergehend im App-Cache angelegt, ersatzweise im internen Dokumentenbereich. Genau diese Datei wird nach dem Teilen-Vorgang entfernt, auch bei Abbruch oder Fehler. Falls die Bereinigung fehlschlägt, meldet die App keinen erfolgreichen Export. Ihre selbst extern gespeicherten oder geteilten Kopien bleiben erhalten.

Beim **Backup laden** erzeugt die Dateiauswahl eine temporäre Kopie im appinternen Cache-Unterordner `DocumentPicker`. Im selben noch nicht veröffentlichten Update wird genau diese Kopie unmittelbar nach dem Einlesen und Prüfen des Inhalts entfernt, auch bei einem Fehler. Schlägt diese Dateibereinigung fehl, wird das Laden nicht als erfolgreich behandelt. Die ursprünglich ausgewählte Backup-Datei bleibt unverändert.

**Wichtig:** Deinstallieren Sie ZAYMAX erst, nachdem Sie geprüft haben, dass die Backup-Datei außerhalb der App gespeichert wurde. Ohne Backup kann der Entwickler lokal gelöschte Daten nicht wiederherstellen.

## Häufige Fragen

### Läuft der Trainingstimer bei gesperrtem Bildschirm weiter?

Ja. ZAYMAX berechnet die Dauer anhand der Start- und Endzeit, sodass das Sperren des Bildschirms oder ein kurzer App-Wechsel die Trainingszeit nicht anhält.

### Wie lösche ich meine Daten?

Einzelne Inhalte können direkt in der App gelöscht werden. Unter **Einstellungen → Alle lokalen Daten löschen** entfernen Sie die von ZAYMAX verwalteten Trainings-, Profil-, Tagebuch- und Einstellungsdaten sowie die ausgewählte Widget-Notiz.

Im noch nicht veröffentlichten App-Update entfernt diese Funktion zusätzlich interne Backup-Dateien, deren Namen genau dem ZAYMAX-Backup-Namensschema entsprechen, einschließlich älterer Exporte. Dazu kommen ältere oder nach einem Absturz verbliebene Importkopien direkt im Cache-Unterordner `DocumentPicker`, deren Namen genau dem UUID-Muster der Dateiauswahl entsprechen. Weitere Unterordner werden nicht durchsucht, und der Cache wird nicht insgesamt geleert. Schlägt diese Dateibereinigung fehl, wird keine erfolgreiche Löschung angezeigt; interne Backup-Reste können dann noch vorhanden sein.

**Bei älteren Versionen ohne diese Bereinigung** können interne Export- und Importkopien nach dem Teilen, Laden oder nach **Alle lokalen Daten löschen** erhalten bleiben, auch nach einem Abbruch oder Fehler. Die Bereinigung setzt das entsprechende App-Update voraus. Beim Löschen der App wird ihr lokaler Dateibereich entfernt.

Selbst extern gespeicherte oder geteilte Backup-Kopien und geteilte Trainingsbilder werden durch die interne Bereinigung nicht gelöscht. Diese Dateien sowie Geräte- oder Cloud-Backups müssen Sie am jeweiligen Speicherort beziehungsweise beim jeweiligen Anbieter separat verwalten und löschen.

### Gibt es ein Konto, Werbung oder ein Abonnement?

Nein. ZAYMAX benötigt kein Konto und enthält derzeit weder Werbung noch kostenpflichtige Abonnements.

## Erste Schritte bei Problemen

- ZAYMAX vollständig schließen und erneut öffnen;
- im App Store prüfen, ob die aktuelle Version installiert ist;
- iPhone neu starten;
- prüfen, ob eine aktuelle iOS-Version verfügbar ist;
- bei Pausen-Erinnerungen die Mitteilungsberechtigung sowie Klang- und Geräteeinstellungen kontrollieren;
- bei älteren Installationen frühere Health-Zugriffsrechte in iOS bei Bedarf widerrufen.

## Datenschutz

Trainings-, Tagebuch-, Körper- und App-Daten werden lokal verarbeitet. ZAYMAX verwendet keine Werbung, Analyse- oder Trackingdienste. Weitere Details stehen in der [Datenschutzerklärung](privacy.html).
