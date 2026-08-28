# App Review Notes – ZAYMAX 1.0.2 (Build 25)

Use the following text in App Store Connect:

ZAYMAX requires no account or sign-in. No demo account is needed.

Workout data, diary entries, body-profile information, BMI results, app settings and widget content are stored locally on the user's device. The app has no developer-operated user-data server, no advertising, no analytics and no tracking.

To test Apple Health integration:
1. Open the “Schritte / Steps” tab on a real iPhone.
2. Start the Apple Health connection.
3. Grant read access to Step Count.

ZAYMAX reads step-count data only after explicit user permission and displays daily and weekly totals. The app does not write HealthKit data, upload it to external servers, use it for advertising or provide medical diagnoses. If Health access is denied, all core workout, history and diary functions remain available.

To test the Lock Screen widget:
1. Open “Tagebuch / Diary”.
2. Create or select a note and choose “Im Sperrbildschirm-Widget zeigen / Show in Lock Screen widget”.
3. Customize the iPhone Lock Screen and add the ZAYMAX note widget.

JSON backups and workout-summary images are exported only when the user explicitly starts the action and selects a destination in the iOS share sheet. HealthKit step values are not included in the JSON backup.

Suggested review path:
Create a workout → start training → edit repetitions/weight → complete or skip sets → finish the workout → choose perceived effort → view history or share the summary image.

No special hardware other than a real iPhone is required. Core functionality is available without granting Health or notification permissions.

## Contact fields to complete manually

- First name: Blazej
- Last name: Doszczeczko
- Email: blazej.doszczeczko@gmail.com
- Phone: enter a reachable telephone number
