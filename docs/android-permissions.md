# Android Call-Log Permissions & Google Play Policy Architecture

## 1. Executive Summary & Regulatory Context

Android treats call logs (`android.permission.READ_CALL_LOG` and `android.permission.WRITE_CALL_LOG`) as **Restricted / High-Risk Permissions**. Google Play policy strictly controls access to these permissions to prevent privacy violations, unauthorized monitoring, and covert spyware.

This document outlines the legal, technical, and architectural framework governing how the **Callyzer Platform** collects and handles call records while maintaining strict compliance with Android OS requirements and Google Play Developer Program Policies.

---

## 2. Google Play Policy: Permissions and APIs that Access Sensitive Information

### 2.1 The Default Phone (Dialer) Handler Rule
Under Google Play's **Permissions Policy (SMS and Call Log Permissions)**:
- Apps published to public Google Play that request `READ_CALL_LOG` must be actively registered as the device's **Default Phone Handler (Default Dialer)** or **Default Assistant / SMS Handler**.
- If an application does not provide the primary in-call user experience (receiving phone calls, displaying the native incoming call screen, and initiating outbound phone calls via `TelecomManager`), **Google Play will reject or ban the application**.

### 2.2 Why Business Need / Employee Consent Is Not an Exception on Public Google Play
A common misconception is that obtaining employee consent, having an enterprise SaaS subscription, or presenting an employee handbook authorizes `READ_CALL_LOG` on Google Play.
- **Google Play explicitly states**: Business purpose, employee consent, internal telemarketing, or employer tracking **do not qualify for a public Play Store policy exception**.
- Apps cannot bypass this rule by requesting runtime permission at startup or showing a custom privacy disclosure on consumer Play Store listings.

---

## 3. Permitted Distribution Models & Compliance Matrix

| Distribution Model | Supported Call-Log Access | Legal / Policy Mechanism | Implementation in Callyzer |
| :--- | :--- | :--- | :--- |
| **Public Google Play (Consumer Store)** | ❌ Automated Call Log Prohibited (Unless Default Dialer) | Policy strictly enforces Default Phone Handler rule. | Uses **ManualCallDataSource** or **CSV Import** fallback. No covert access. |
| **Managed Google Play (Android Enterprise / EMM)** | ✅ Permitted for Company-Owned Devices | Deployed as a **Private Enterprise App** targeting managed devices within an organization under an EMM/MDM console. | Uses **AuthorizedCallLogDataSource** with runtime permission granted via EMM policy. |
| **Direct Enterprise APK / Sideloading (MDM / Work Profile)** | ✅ Technically & Legally Permitted for Corporate Fleets | Governed by enterprise hardware ownership and employment contract rather than Play Store consumer terms. | Uses **AuthorizedCallLogDataSource** with standard Android runtime permission prompts. |
| **Personal Devices (BYOD without MDM)** | ⚠️ Restricted / User Choice | Employee privacy rights protect personal call histories from employer monitoring. | Uses **ManualCallDataSource**; automated background harvesting is disabled. |

---

## 4. Technical Constraints & Anti-Evasion Rules

### 4.1 Strict Rejection of Prohibited Workarounds
Callyzer adheres to ethical Android engineering standards. The following evasive techniques are **strictly forbidden and not implemented**:
1. **Accessibility Services abuse**: Using `AccessibilityService` to scrape dialer screens, inspect call state, or harvest call history is a critical violation of Google Play policy and Android security guidelines.
2. **Hidden / Reflection APIs**: Calling non-SDK interfaces (`TelephonyManager` internal methods) is blocked by Android greylist restrictions and rejected.
3. **Covert Notification Scraping**: Scraping dialer notification text via `NotificationListenerService` to infer phone numbers is banned.
4. **Root or Device Exploits**: No privileged root daemons.
5. **Call Audio Recording / Microphone Capture**: Android 10+ removed call recording APIs, and privacy laws (e.g., GDPR, CCPA, wiretapping acts) strictly regulate audio surveillance. **Callyzer does not record audio or access the microphone.**

---

## 5. Architectural Implementation: The Modular `CallDataSource`

To ensure the platform functions seamlessly across all environments without risking compliance violations or false reporting, Callyzer utilizes a modular abstraction:

```kotlin
interface CallDataSource {
    val sourceType: DataSource
    fun getCapabilities(): DataSourceCapabilities
    fun isAvailable(context: Context): Boolean
    suspend fun fetchCallEvents(context: Context, sinceTimestamp: Long, limit: Int): List<CallRecord>
}
```

### 5.1 `AuthorizedCallLogDataSource`
Used when the app is installed in an eligible enterprise deployment:
- Queries `CallLog.Calls.CONTENT_URI` using supported Android ContentProvider APIs.
- Checks runtime permission using `ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG)`.
- If permission is denied or revoked at runtime, it **never throws an unhandled crash or falsifies data**; it safely returns an empty list and signals a warning state to the server.
- Uses cursor-based incremental reconciliation:
  ```kotlin
  val selection = "${CallLog.Calls.DATE} > ?"
  val selectionArgs = arrayOf(sinceTimestamp.toString())
  ```
- Gracefully handles unknown or private numbers (`UNKNOWN_NUMBER`, `PRIVATE_NUMBER`).
- Extracts `PHONE_ACCOUNT_ID` to distinguish multi-SIM slots without making invalid hardware assumptions.

### 5.2 `ManualCallDataSource`
Fallback adapter for BYOD and consumer distributions:
- Allows telecallers to manually log customer calls, durations, and outcomes.
- Retains full compatibility with backend batching, analytics, and CRM lead tracking.

### 5.3 `CsvImportDataSource`
Fallback adapter for importing batch logs from telecom providers or PBX portals.

---

## 6. Real-Device Validation Checklist

When deploying to real Android handsets (Samsung, Xiaomi, Vivo, Pixel, OnePlus):
1. **Runtime Permission Prompt**: Verify that `READ_CALL_LOG` prompt explicitly opens and requests authorization.
2. **Dynamic Revocation**: Navigate to Android Settings > Apps > Callyzer Agent > Permissions > Revoke Call Log. Verify that the app transitions gracefully to restricted mode without crashing.
3. **Battery Optimization / OEM Background Killers**:
   - Xiaomi (MIUI/HyperOS): Enable "Autostart" and set Battery Saver to "No restrictions".
   - Samsung (One UI): Add Callyzer Agent to "Never sleeping apps".
   - WorkManager uses network-constrained deferred execution, meaning upload will resume automatically once battery and network conditions permit.
4. **Dual SIM Support**: Verify that `PHONE_ACCOUNT_ID` or SIM slot is captured if exposed by the telephony provider.
