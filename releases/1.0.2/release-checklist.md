# ZAYMAX 1.0.2 – Release Checklist

## Identifiers

- App Store Connect App ID: **6802030763**
- Version: **1.0.2**
- Intended build: **25**
- App commit: **cf01b0a5317000ca2b5b69a11db27e7c70335039**
- EAS build ID: **513ddaac-52d9-454e-8242-c2395273d908**
- EAS submission ID: **5f907d77-fcbf-4ab7-b85f-0f0cd78b3f36**
- Build: https://expo.dev/accounts/lolczak/projects/zaymax/builds/513ddaac-52d9-454e-8242-c2395273d908
- Submission: https://expo.dev/accounts/lolczak/projects/zaymax/submissions/5f907d77-fcbf-4ab7-b85f-0f0cd78b3f36
- TestFlight: https://appstoreconnect.apple.com/apps/6802030763/testflight/ios

## Bereits vorbereitet

- [x] Build 25 wurde erfolgreich an App Store Connect übermittelt.
- [x] App-Quellstand ist auf GitHub unter Commit cf01b0a vorhanden.
- [x] Öffentliche Datenschutzseite aktualisiert: https://zaymax99.github.io/zaymax/privacy.html
- [x] Öffentliche Supportseite aktualisiert: https://zaymax99.github.io/zaymax/support.html
- [x] Deutsche, englische und polnische Store-Texte vorbereitet.
- [x] App-Review-Hinweise vorbereitet.
- [x] GitHub-Changelog, Sicherheitskontakt und Issue-Vorlagen vorbereitet.

## TestFlight vor App Review

- [ ] Build **25** in TestFlight installieren und sicherstellen, dass nicht versehentlich Build 24 geöffnet ist.
- [ ] Cold Start und Rückkehr aus dem Hintergrund testen.
- [ ] Workout erstellen, Reihenfolge ändern und speichern.
- [ ] Satzwerte mit Gewichten wie 20,25 kg und 31,17 kg testen.
- [ ] Training starten, iPhone sperren, mindestens zwei Minuten warten und Timer prüfen.
- [ ] Wiederholungen und Gewicht während des Trainings ändern.
- [ ] Einen Satz abschließen, eine Übung überspringen und Training abschließen.
- [ ] Zusammenfassung, Historie, Trainingsgefühl und Teilen-Bild prüfen.
- [ ] Apple-Health-Verbindung auf einem echten iPhone erlauben und Schritte prüfen.
- [ ] Health-Berechtigung ablehnen und bestätigen, dass die Kern-App weiter funktioniert.
- [ ] Tagebuchnotiz im Sperrbildschirm-Widget anzeigen.
- [ ] Backup exportieren und auf einem Testgerät beziehungsweise nach einer Teständerung wieder importieren.
- [ ] Deutsch, Englisch und Polnisch stichprobenartig prüfen.

## App Store Connect

- [ ] Unter **ZAYMAX → App Store → iOS App → 1.0.2** Build **25** auswählen.
- [ ] Falls „Missing Compliance“ erscheint: bestätigen, dass keine nicht ausgenommene eigene Verschlüsselung verwendet wird.
- [ ] Beschreibung, Keywords, Untertitel und „Neu in dieser Version“ aus dem passenden Sprachdokument einfügen.
- [ ] Support- und Datenschutz-URL je Sprache eintragen.
- [ ] Review Notes aus `review-notes.md` einfügen.
- [ ] Erreichbare Telefonnummer beim Review-Kontakt ergänzen.
- [ ] App Privacy prüfen und veröffentlichen. Wenn weiterhin keine Telemetrie oder extern konfigurierte SDK-Datenerhebung existiert: **„No, we do not collect data from this app“** und kein Tracking.
- [ ] Aktualisierte Altersfreigabe-Fragen vollständig beantworten.
- [ ] Status als reguliertes Medizinprodukt prüfen. Für die aktuelle reine Fitness-/Orientierungsfunktion voraussichtlich **Nein**, rechtliche Einordnung selbst bestätigen.
- [ ] EU-DSA-Händlerstatus prüfen beziehungsweise bestätigen.
- [ ] Preis, Verfügbarkeit, Copyright und Content Rights kontrollieren.
- [ ] Release-Methode auswählen. Empfehlung: **manuell nach Freigabe**, damit der Startzeitpunkt kontrollierbar bleibt.

## Screenshots

Die vier vorhandenen Repository-Screenshots haben gültige Maße von **1242 × 2688 px**, stammen aber vom 23. August 2026 und zeigen nicht alle aktuellen Funktionen. Vor der Einreichung visuell prüfen:

- [ ] Aktuelles Design und aktuelle Navigation stimmen mit Build 25 überein.
- [ ] Mindestens ein Screenshot zeigt das aktive Training.
- [ ] Mindestens ein Screenshot zeigt Tagebuch/BMI.
- [ ] Ein aktueller Screenshot zeigt den neuen Schritte-Tab.
- [ ] Keine privaten Notizen, echten Gesundheitsdaten oder roten Markierungen sichtbar.

Wenn die alten Bilder das aktuelle Produkt nicht mehr korrekt darstellen, vor dem Review frische Screenshots direkt aus Build 25 aufnehmen und in einer von Apple akzeptierten Größe hochladen.

## Einreichung

- [ ] Auf der Versionsseite **Add for Review** wählen.
- [ ] In **Draft Submissions / App Review** die Version erneut kontrollieren.
- [ ] Erst danach **Submit for Review** wählen.
- [ ] Status **Waiting for Review** abwarten.
- [ ] Bei Rückfragen im Resolution Center zeitnah und konkret antworten.

## Nach Freigabe

- [ ] Bei manueller Freigabe die Version im gewünschten Moment veröffentlichen.
- [ ] GitHub Release **v1.0.2** aus `github-release-notes.md` veröffentlichen.
- [ ] App-Store-Produktseite und öffentliche URLs kontrollieren.
- [ ] TestFlight- und Support-Rückmeldungen beobachten.

## Offizielle Apple-Hilfen

- Submit an app: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app
- App privacy: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- Store metadata fields: https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/
- HealthKit privacy: https://developer.apple.com/documentation/healthkit/protecting-user-privacy
- Screenshot specifications: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- Age rating: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/
- EU DSA trader status: https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/
