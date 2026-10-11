package io.callyzer.android.data.remote

data class DeviceEnrollmentRequest(
    val enrollmentToken: String,
    val deviceIdentifier: String,
    val deviceName: String,
    val model: String,
    val manufacturer: String,
    val osVersion: String,
    val appVersion: String,
    val permissionGranted: Boolean,
    val simMetadata: Map<String, Any>? = null
)

data class DeviceEnrollLoginRequest(
    val email: String,
    val password: String,
    val deviceIdentifier: String,
    val deviceName: String,
    val model: String,
    val manufacturer: String,
    val osVersion: String,
    val appVersion: String,
    val permissionGranted: Boolean,
    val simMetadata: Map<String, Any>? = null
)

data class DeviceEnrollmentResponse(
    val deviceApiKey: String,
    val deviceId: String,
    val organizationId: String,
    val organizationName: String,
    val employeeId: String,
    val employeeName: String,
    val syncIntervalMinutes: Int
)

data class ServerHealthResponse(
    val status: String,
    val service: String,
    val version: String,
    val timestamp: String
)

data class DeviceStatusResponse(
    val deviceId: String,
    val deviceName: String,
    val organizationId: String,
    val organizationName: String,
    val employeeId: String,
    val employeeName: String,
    val status: String,
    val lastSyncAt: String?,
    val permissionGranted: Boolean
)

data class AssignedLeadDto(
    val id: String,
    val name: String,
    val phoneNumber: String,
    val company: String? = null,
    val status: String,
    val followUpAt: String? = null
)

data class IngestCallEventDto(
    val sourceCallId: String,
    val direction: String,
    val durationSeconds: Long,
    val startedAt: String,
    val endedAt: String? = null,
    val outcome: String,
    val outcomeConfidence: Float = 1.0f,
    val phoneNumber: String,
    val simSlot: Int? = null,
    val simCarrier: String? = null,
    val phoneAccount: String? = null,
    val dataSource: String = "NATIVE_CALL_LOG",
    val metadata: Map<String, String>? = null
)

data class IngestBatchRequest(
    val clientTimestamp: String,
    val events: List<IngestCallEventDto>
)

data class IngestBatchResponse(
    val batchId: String,
    val totalReceived: Int,
    val inserted: Int,
    val duplicates: Int,
    val errors: Int,
    val serverTimestamp: String
)
