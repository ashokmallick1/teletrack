package io.callyzer.android.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import io.callyzer.android.data.model.CallDirection
import io.callyzer.android.data.model.CallOutcome
import io.callyzer.android.data.model.DataSource
import io.callyzer.android.data.model.SyncStatus

@Entity(
    tableName = "queued_call_events",
    indices = [
        Index(value = ["sourceCallId"], unique = true),
        Index(value = ["syncStatus", "startedAt"])
    ]
)
data class QueuedCallEventEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val sourceCallId: String,
    val direction: CallDirection,
    val durationSeconds: Long,
    val startedAt: Long,
    val endedAt: Long?,
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
