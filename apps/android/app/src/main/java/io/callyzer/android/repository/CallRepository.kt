package io.callyzer.android.repository

import android.content.Context
import androidx.work.*
import io.callyzer.android.data.local.AppDatabase
import io.callyzer.android.data.local.QueuedCallEventEntity
import io.callyzer.android.data.model.CallRecord
import io.callyzer.android.data.model.DataSource
import io.callyzer.android.data.model.SyncStatus
import io.callyzer.android.data.remote.ApiClient
import io.callyzer.android.data.remote.AssignedLeadDto
import io.callyzer.android.data.remote.IngestBatchRequest
import io.callyzer.android.data.remote.IngestCallEventDto
import io.callyzer.android.data.remote.ServerHealthResponse
import io.callyzer.android.data.source.AuthorizedCallLogDataSource
import io.callyzer.android.data.source.CallDataSource
import io.callyzer.android.security.TokenStorage
import io.callyzer.android.worker.CallSyncWorker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class CallRepository(
    private val context: Context,
    private val database: AppDatabase = AppDatabase.getInstance(context),
    val callLogDataSource: CallDataSource = AuthorizedCallLogDataSource()
) {

    private val dao = database.queuedCallEventDao()
    private val tokenStorage = TokenStorage(context)

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

    suspend fun pingServer(targetUrl: String? = null): Result<ServerHealthResponse> = withContext(Dispatchers.IO) {
        try {
            val api = ApiClient.getService(targetUrl ?: tokenStorage.baseUrl)
            val response = api.checkHealth()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("HTTP ${response.code()}: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun fetchAssignedLeads(): List<AssignedLeadDto> = withContext(Dispatchers.IO) {
        val apiKey = tokenStorage.deviceApiKey ?: return@withContext emptyList()
        try {
            val api = ApiClient.getService(tokenStorage.baseUrl)
            val response = api.getAssignedLeads(apiKey)
            if (response.isSuccessful && response.body() != null) {
                response.body()!!
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun syncNowDirect(): String = withContext(Dispatchers.IO) {
        val apiKey = tokenStorage.deviceApiKey
        if (apiKey.isNullOrBlank()) {
            return@withContext "Error: Device not enrolled"
        }

        // 1. Poll native call log first
        pollCallLogAndQueue()

        // 2. Fetch pending events
        val pending = dao.getPendingEvents(limit = 100)
        if (pending.isEmpty()) {
            tokenStorage.lastSyncTimestamp = System.currentTimeMillis()
            tokenStorage.lastSyncStatus = "Up to date (Queue empty)"
            return@withContext "All SIM calls are synced"
        }

        val ids = pending.map { it.id }
        dao.updateSyncStatus(ids, SyncStatus.SYNCING)

        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }

        val dtos = pending.map { evt ->
            IngestCallEventDto(
                sourceCallId = evt.sourceCallId,
                direction = evt.direction.name,
                durationSeconds = evt.durationSeconds,
                startedAt = isoFormat.format(Date(evt.startedAt)),
                endedAt = evt.endedAt?.let { isoFormat.format(Date(it)) },
                outcome = evt.outcome.name,
                outcomeConfidence = evt.outcomeConfidence,
                phoneNumber = evt.phoneNumber,
                simSlot = evt.simSlot,
                simCarrier = evt.simCarrier,
                phoneAccount = evt.phoneAccount,
                dataSource = evt.dataSource.name
            )
        }

        val request = IngestBatchRequest(
            clientTimestamp = isoFormat.format(Date()),
            events = dtos
        )

        try {
            val apiService = ApiClient.getService(tokenStorage.baseUrl)
            val response = apiService.uploadCallBatch(apiKey, request)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                dao.updateSyncStatus(ids, SyncStatus.SYNCED)
                tokenStorage.lastSyncTimestamp = System.currentTimeMillis()
                val statusText = "Uploaded ${body.inserted} new call(s) (${body.duplicates} dups)"
                tokenStorage.lastSyncStatus = statusText
                statusText
            } else {
                val err = "Upload failed: HTTP ${response.code()} ${response.message()}"
                dao.markFailedWithRetry(ids, err)
                tokenStorage.lastSyncStatus = err
                err
            }
        } catch (e: Exception) {
            val err = "Upload error: ${e.localizedMessage ?: "Connection error"}"
            dao.markFailedWithRetry(ids, err)
            tokenStorage.lastSyncStatus = err
            err
        }
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
