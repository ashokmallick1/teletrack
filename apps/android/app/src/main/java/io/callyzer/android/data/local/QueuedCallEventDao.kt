package io.callyzer.android.data.local

import androidx.room.*
import io.callyzer.android.data.model.SyncStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface QueuedCallEventDao {

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(event: QueuedCallEventEntity): Long

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAll(events: List<QueuedCallEventEntity>): List<Long>

    @Query("SELECT * FROM queued_call_events WHERE syncStatus IN ('PENDING', 'FAILED') ORDER BY startedAt ASC LIMIT :limit")
    suspend fun getPendingEvents(limit: Int = 50): List<QueuedCallEventEntity>

    @Query("SELECT * FROM queued_call_events ORDER BY startedAt DESC LIMIT :limit")
    fun observeRecentEvents(limit: Int = 20): Flow<List<QueuedCallEventEntity>>

    @Query("SELECT COUNT(*) FROM queued_call_events WHERE syncStatus IN ('PENDING', 'FAILED')")
    fun observePendingCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM queued_call_events WHERE syncStatus IN ('PENDING', 'FAILED')")
    suspend fun getPendingCount(): Int

    @Query("SELECT MAX(startedAt) FROM queued_call_events")
    suspend fun getLatestEventTimestamp(): Long?

    @Query("UPDATE queued_call_events SET syncStatus = :status WHERE id IN (:ids)")
    suspend fun updateSyncStatus(ids: List<Long>, status: SyncStatus)

    @Query("UPDATE queued_call_events SET syncStatus = 'FAILED', retryCount = retryCount + 1, lastError = :error WHERE id IN (:ids)")
    suspend fun markFailedWithRetry(ids: List<Long>, error: String)

    @Query("DELETE FROM queued_call_events WHERE syncStatus = 'SYNCED' AND createdAt < :olderThanTimestamp")
    suspend fun pruneOldSyncedEvents(olderThanTimestamp: Long)
}
