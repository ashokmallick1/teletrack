package io.teletrack.android.data.local

import io.teletrack.android.data.model.CallDirection
import io.teletrack.android.data.model.CallOutcome
import io.teletrack.android.data.model.DataSource
import io.teletrack.android.data.model.SyncStatus

data class QueuedCallEventEntity(
    val id: Long = 0,
    val sourceCallId: String,
    val direction: CallDirection,
    val durationSeconds: Long,
    val startedAt: Long,
    val endedAt: Long? = null,
    val outcome: CallOutcome,
    val outcomeConfidence: Float = 1.0f,
    val phoneNumber: String,
    val simSlot: Int? = null,
    val simCarrier: String? = null,
    val phoneAccount: String? = null,
    val dataSource: DataSource = DataSource.NATIVE_CALL_LOG,
    val syncStatus: SyncStatus = SyncStatus.PENDING,
    val retryCount: Int = 0,
    val lastError: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)
