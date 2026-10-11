package io.callyzer.android.data.local

import io.callyzer.android.data.model.SyncStatus
import kotlinx.coroutines.flow.Flow

interface QueuedCallEventDao {
    suspend fun insert(event: QueuedCallEventEntity): Long
    suspend fun insertAll(events: List<QueuedCallEventEntity>): List<Long>
    suspend fun getPendingEvents(limit: Int = 50): List<QueuedCallEventEntity>
    fun observeRecentEvents(limit: Int = 20): Flow<List<QueuedCallEventEntity>>
    fun observePendingCount(): Flow<Int>
    suspend fun getPendingCount(): Int
    suspend fun getLatestEventTimestamp(): Long?
    suspend fun updateSyncStatus(ids: List<Long>, status: SyncStatus)
    suspend fun markFailedWithRetry(ids: List<Long>, error: String)
    suspend fun pruneOldSyncedEvents(olderThanTimestamp: Long)
}
