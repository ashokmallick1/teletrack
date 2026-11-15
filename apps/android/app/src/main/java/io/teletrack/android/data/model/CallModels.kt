package io.teletrack.android.data.model

enum class CallDirection {
    INCOMING,
    OUTGOING,
    MISSED,
    REJECTED,
    UNKNOWN
}

enum class CallOutcome {
    ANSWERED,
    MISSED,
    REJECTED,
    BUSY,
    FAILED,
    UNKNOWN
}

enum class DataSource {
    NATIVE_CALL_LOG,
    MANUAL_ENTRY,
    CSV_IMPORT,
    TELEPHONY_API
}

enum class SyncStatus {
    PENDING,
    SYNCING,
    SYNCED,
    FAILED
}

data class CallRecord(
    val sourceCallId: String,
    val direction: CallDirection,
    val durationSeconds: Long,
    val startedAt: Long, // Epoch millis
    val endedAt: Long?,
    val outcome: CallOutcome,
    val outcomeConfidence: Float = 1.0f,
    val phoneNumber: String,
    val simSlot: Int? = null,
    val simCarrier: String? = null,
    val phoneAccount: String? = null,
    val dataSource: DataSource = DataSource.NATIVE_CALL_LOG,
    val rawMetadata: Map<String, String> = emptyMap()
)

data class DeviceInfo(
    val deviceIdentifier: String,
    val deviceName: String,
    val model: String,
    val manufacturer: String,
    val osVersion: String,
    val appVersion: String,
    val permissionGranted: Boolean,
    val carrierName: String? = null,
    val simCount: Int = 1
)
