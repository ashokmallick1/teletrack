package io.callyzer.android.repository

import android.content.Context
import androidx.work.*
import io.callyzer.android.data.local.AppDatabase
import io.callyzer.android.data.local.QueuedCallEventEntity
import io.callyzer.android.data.model.CallRecord
import io.callyzer.android.data.model.DataSource
import io.callyzer.android.data.model.SyncStatus
import io.callyzer.android.data.source.AuthorizedCallLogDataSource
import io.callyzer.android.data.source.CallDataSource
import io.callyzer.android.worker.CallSyncWorker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class CallRepository(
    private val context: Context,
    private val database: AppDatabase = AppDatabase.getInstance(context),
    val callLogDataSource: CallDataSource = AuthorizedCallLogDataSource()
) {

    private val dao = database.queuedCallEventDao()

    fun observePendingCount(): Flow<Int> = dao.observePendingCount()

    fun observeRecentEvents(limit: Int = 20): Flow<List<QueuedCallEventEntity>> =
        dao.observeRecentEvents(limit)

    suspend fun pollCallLogAndQueue(): Int = withContext(Dispatchers.IO) {
        if (!callLogDataSource.isAvailable(context)) {
            return@withContext 0
        }

        // Fetch latest timestamp already queued, or default to 7 days ago if fresh install
        val latestTimestamp = dao.getLatestEventTimestamp()
            ?: (System.currentTimeMillis() - TimeUnit.DAYS.toMillis(7))

        val records = callLogDataSource.fetchCallEvents(
            context = context,
            sinceTimestamp = latestTimestamp,
            limit = 100
        )

        if (records.isEmpty()) return@withContext 0

        val entities = records.map { r ->
            QueuedCallEventEntity(
                sourceCallId = r.sourceCallId,
                direction = r.direction,
                durationSeconds = r.durationSeconds,
                startedAt = r.startedAt,
                endedAt = r.endedAt,
                outcome = r.outcome,
                outcomeConfidence = r.outcomeConfidence,
                phoneNumber = r.phoneNumber,
                simSlot = r.simSlot,
                simCarrier = r.simCarrier,
                phoneAccount = r.phoneAccount,
                dataSource = r.dataSource,
                syncStatus = SyncStatus.PENDING
            )
        }

        val inserted = dao.insertAll(entities)
        val newCount = inserted.count { it > 0 }

        if (newCount > 0) {
            triggerBackgroundSync()
        }

        return@withContext newCount
    }

    suspend fun recordManualCall(record: CallRecord): Long = withContext(Dispatchers.IO) {
        val entity = QueuedCallEventEntity(
            sourceCallId = record.sourceCallId,
            direction = record.direction,
            durationSeconds = record.durationSeconds,
            startedAt = record.startedAt,
            endedAt = record.endedAt,
            outcome = record.outcome,
            outcomeConfidence = 1.0f,
            phoneNumber = record.phoneNumber,
            dataSource = DataSource.MANUAL_ENTRY,
            syncStatus = SyncStatus.PENDING
        )
        val id = dao.insert(entity)
        if (id > 0) {
            triggerBackgroundSync()
        }
        return@withContext id
    }

    fun triggerBackgroundSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncWork = OneTimeWorkRequestBuilder<CallSyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            "CallyzerCallSyncWork",
            ExistingWorkPolicy.REPLACE,
            syncWork
        )
    }

    fun schedulePeriodicSync(intervalMinutes: Long = 15) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val periodicWork = PeriodicWorkRequestBuilder<CallSyncWorker>(
            intervalMinutes,
            TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "CallyzerPeriodicCallSync",
            ExistingPeriodicWorkPolicy.KEEP,
            periodicWork
        )
    }
}
