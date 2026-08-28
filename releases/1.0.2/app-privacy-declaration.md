# App Store Connect – App Privacy for ZAYMAX 1.0.2

## Recommended answers based on Build 25

### Privacy Policy URL

- German: https://zaymax99.github.io/zaymax/privacy.html
- English: https://zaymax99.github.io/zaymax/privacy-en.html
- Polish: https://zaymax99.github.io/zaymax/privacy-pl.html

### Data collection

**Do you or your third-party partners collect data from this app?**
Recommended answer: **No, we do not collect data from this app.**

Reasoning:

- Workout, diary, body-profile, settings and widget data remain on the user's device.
- Apple Health step counts are read and displayed locally only.
- ZAYMAX does not write Health data and does not transmit HealthKit values.
- No analytics, advertising, tracking, account, backend or crash-reporting SDK was identified in the release code.
- JSON backups and workout images leave the device only when the user explicitly opens the iOS share sheet and chooses a destination.
- ZAYMAX does not receive a copy of those user-directed exports.

Under Apple's App Privacy definition, data processed only on the device and not transmitted off-device in a way available to the developer is not “collected”.

### Tracking

- Tracking: **No**
- Data used for third-party advertising: **No**
- IDFA / AppTrackingTransparency request: **No**

## Important re-check condition

Change these answers before publication if any service outside the reviewed repository has been added, including analytics, remote crash reporting, advertising, a backend, a web form that collects app data, or automatic cloud synchronization.

Support emails are initiated outside the app by the user and are covered on the public privacy page. Users should not send Health data or full backups unless strictly necessary.

## HealthKit statement

ZAYMAX reads only Apple Health step-count data after explicit permission for daily and weekly step displays. It never writes HealthKit data, uses it for advertising or marketing, includes it in ZAYMAX JSON backups, or uploads it to a developer-operated server.
